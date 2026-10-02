import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './controllers/app.controller';
import { AppService } from './providers/app.service';
import { connectionOptions } from './database/connection';
import {
  AuthModule,
  ContactModule,
  DocumentsModule,
  NavigationModule,
  NotificationsModule,
  OAuthModule,
  resolveDbLogging,
} from '@helix-x/backend';
import { CommunityAuthHooksModule } from './modules/community-core/community-auth-hooks.module';
import { CommunityCoreModule } from './modules/community-core/community-core.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        // better-sqlite3 or postgres, chosen by DB_TYPE — see database/connection.ts.
        ...connectionOptions((key) => configService.get<string>(key)),
        autoLoadEntities: true,
        // The schema is owned by the numbered SQL migrations in
        // apps/backend/migrations/, applied by hand. Synchronize would change
        // it behind their back, so it is off unless explicitly asked for —
        // and a synchronized database still needs its schema_migrations rows
        // (see database/schema-version.ts). Never enable it in production:
        // SQLite rebuilds a whole table for a column change.
        synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
        // SQL logging. DB_LOGGING=true|false|all, or a comma-separated list
        // of TypeORM levels (query,error,schema,warn,info,log). Unset keeps
        // the old behaviour — on under NODE_ENV=development, off everywhere
        // else. Note TypeORM's `true` means query + error only; use `all` for
        // schema and startup chatter too.
        logging: resolveDbLogging(configService),
      }),
      inject: [ConfigService],
    }),
    // Transactional mail. Global, so any module injects
    // EmailNotificationService without importing this one.
    //
    // MAIL_TRANSPORT=console (the dev default) delivers nothing over the
    // network and instead captures each message at GET /api/dev/outbox, so
    // verification and reset links are clickable locally with no mail account.
    // It refuses to load under NODE_ENV=production.
    NotificationsModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        transport: config.get<'console' | 'smtp' | 'gmail'>(
          'MAIL_TRANSPORT',
          'console',
        ),
        defaultFrom: config.get<string>(
          'MAIL_FROM',
          'Helix X <no-reply@localhost>',
        ),
        defaultReplyTo: config.get<string>('MAIL_REPLY_TO'),
        gmail: {
          user: config.get<string>('GMAIL_USER', ''),
          appPassword: config.get<string>('GMAIL_APP_PASSWORD', ''),
        },
        smtp: {
          host: config.get<string>('SMTP_HOST', ''),
          port: Number(config.get<string>('SMTP_PORT', '587')),
          secure: config.get<string>('SMTP_SECURE') === 'true',
          user: config.get<string>('SMTP_USER'),
          password: config.get<string>('SMTP_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    // Supplies AUTH_HOOKS — the portal's email/approval/payment gates — plus the
    // per-request gate interceptor. @Global(), and imported AFTER AuthModule and
    // BEFORE CommunityCoreModule so the hook is registered by the time
    // AuthService resolves it. It must never import AuthModule itself: that is a
    // real provider cycle (AuthService -> AUTH_HOOKS -> AuthService).
    CommunityAuthHooksModule,
    // The Rawla member domain: registration, vetting, activation gates,
    // households, chapters, master data and audit. It composes @helix-x/backend
    // rather than extending it — see docs/backend/modules.md in helix-x-demo.
    CommunityCoreModule,
    NavigationModule,
    OAuthModule.forRootAsync({
      imports: [ConfigModule, AuthModule],
      useFactory: (config: ConfigService) => ({
        jwtSecret:              config.getOrThrow('OAUTH_JWT_SECRET'),
        accessTokenExpiresIn:   config.get('OAUTH_ACCESS_TOKEN_TTL', '1h'),
        refreshTokenExpiresIn:  config.get('OAUTH_REFRESH_TOKEN_TTL', '30d'),
        authCodeExpiresIn:      600,
        issuer:                 config.get('OAUTH_ISSUER', 'my-app'),
        checkRevocation:        config.get('OAUTH_CHECK_REVOCATION') === 'true',
      }),
      inject: [ConfigService],
    }),
// Public Contact Us endpoint (POST /api/contact-messages), delivered
    // through NotificationsModule above — so under MAIL_TRANSPORT=console the
    // messages land in GET /api/dev/outbox. The recipient is configuration,
    // never request data. Behind a proxy, enable `trust proxy` or the per-IP
    // limit counts every visitor as the proxy.
    ContactModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        recipients: config
          .getOrThrow<string>('CONTACT_TO_EMAIL')
          .split(',')
          .map((address) => address.trim()),
        subjectPrefix: config.get<string>('CONTACT_SUBJECT_PREFIX', '[Contact]'),
        rateLimit: {
          perIpPerHour: Number(config.get<string>('CONTACT_RATE_LIMIT_PER_HOUR', '5')),
        },
      }),
      inject: [ConfigService],
    }),
    // Documents: private files with folders and sharing, behind
    // /api/documents. Bytes go to DOCUMENTS_STORAGE_DRIVER — a local directory
    // by default, or any S3-compatible bucket; rows are the framework's 0002
    // migration. The documents:* permissions it checks are granted by this
    // app's 0003. View and download links are short-lived and signed with
    // DOCUMENTS_SIGNING_SECRET, which the app refuses to boot without.
    DocumentsModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const driver = config.get<string>('DOCUMENTS_STORAGE_DRIVER', 'local');
        const accessKeyId = config.get<string>('DOCUMENTS_S3_ACCESS_KEY_ID');
        const allowed = config.get<string>('DOCUMENTS_ALLOWED_MIME_TYPES', '');
        // Behind nginx the request's own origin is the backend's, so links are
        // built on the public one: API_PUBLIC_URL is an origin, the API is /api.
        const apiPublicUrl = config.get<string>('API_PUBLIC_URL');
        return {
          storage:
            driver === 's3'
              ? {
                  driver: 's3' as const,
                  bucket: config.getOrThrow<string>('DOCUMENTS_S3_BUCKET'),
                  region: config.get<string>('DOCUMENTS_S3_REGION') || undefined,
                  prefix: config.get<string>('DOCUMENTS_S3_PREFIX', ''),
                  endpoint: config.get<string>('DOCUMENTS_S3_ENDPOINT') || undefined,
                  forcePathStyle:
                    config.get<string>('DOCUMENTS_S3_FORCE_PATH_STYLE') === 'true',
                  credentials: accessKeyId
                    ? {
                        accessKeyId,
                        secretAccessKey: config.getOrThrow<string>(
                          'DOCUMENTS_S3_SECRET_ACCESS_KEY',
                        ),
                      }
                    : undefined,
                }
              : {
                  driver: 'local' as const,
                  root: resolve(
                    config.get<string>('DOCUMENTS_LOCAL_ROOT', 'data/documents'),
                  ),
                },
          storageKeyNaming: (config.get<string>('DOCUMENTS_STORAGE_NAMING') ||
            'readable') as 'readable' | 'opaque',
          signingSecret: config.getOrThrow<string>('DOCUMENTS_SIGNING_SECRET'),
          maxFileSizeBytes:
            Number(config.get<string>('DOCUMENTS_MAX_FILE_SIZE_MB', '50')) * 1024 * 1024,
          allowedMimeTypes: allowed
            .split(',')
            .map((type) => type.trim())
            .filter(Boolean),
          downloadLinkTtlSeconds: Number(
            config.get<string>('DOCUMENTS_LINK_TTL_SECONDS', '300'),
          ),
          publicBaseUrl:
            config.get<string>('DOCUMENTS_PUBLIC_BASE_URL') ||
            (apiPublicUrl ? `${apiPublicUrl.replace(/\/+$/, '')}/api` : undefined),
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
