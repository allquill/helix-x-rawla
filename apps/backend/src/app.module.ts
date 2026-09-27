import { Module } from '@nestjs/common';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './controllers/app.controller';
import { AppService } from './providers/app.service';
import {
  AuthModule,
  ContactModule,
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
        type: 'better-sqlite3',
        database: configService.get<string>('DB_PATH', 'data/helix_x.db'),
        autoLoadEntities: true,
        // Tables are created/updated from the TypeORM entities on boot.
        // On by default outside production; set DB_SYNCHRONIZE=false to turn
        // it off and own the schema with migrations instead
        // (pnpm --filter @helix-x/demo-backend migration:run).
        //
        // Caveat worth knowing: SQLite rebuilds a whole table for a column
        // change, so a destructive entity edit can drop dev data. Never set
        // DB_SYNCHRONIZE=true in production.
        synchronize:
          configService.get<string>('NODE_ENV') === 'production'
            ? configService.get<string>('DB_SYNCHRONIZE') === 'true'
            : configService.get<string>('DB_SYNCHRONIZE', 'true') !== 'false',
        migrations: [join(__dirname, 'database', 'migrations', '*.{ts,js}')],
        migrationsTableName: 'migrations',
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
