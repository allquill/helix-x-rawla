import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AUTH_HOOKS, Role, User } from '@helix-x/backend';
import { AuditLog } from './entities/audit-log.entity';
import { Member } from './entities/member.entity';
import { MemberStatusHistory } from './entities/member-status-history.entity';
import { PortalSetting } from './entities/portal-setting.entity';
import { MemberGateInterceptor } from './guards/member-gate.interceptor';
import { AuditService } from './providers/audit.service';
import { CommunityAuthHooksService } from './providers/community-auth-hooks.service';
import { MemberActivationService } from './providers/member-activation.service';
import { MemberGateService } from './providers/member-gate.service';
import { PortalSettingsService } from './providers/portal-settings.service';

/**
 * Plugs this product's account rules into the framework's auth seam.
 *
 * `@Global()` because `AUTH_HOOKS` must resolve inside `AuthModule` regardless
 * of import order, and `AuthModule` is deliberately not a `forRoot()` module —
 * a dynamic variant would be a different module token from the bare
 * `AuthModule` other packages already import, duplicating every auth route.
 *
 * **This module must not import `AuthModule`**, and nothing it declares may
 * depend on `AuthService`: that is a real provider cycle
 * (`AuthService → AUTH_HOOKS → AuthService`). It imports the auth package only
 * for the `AUTH_HOOKS` token and the `User`/`Role` entity classes, which pull
 * in repositories rather than services.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      MemberStatusHistory,
      AuditLog,
      PortalSetting,
      User,
      Role,
    ]),
  ],
  providers: [
    PortalSettingsService,
    AuditService,
    MemberGateService,
    MemberActivationService,
    CommunityAuthHooksService,
    { provide: AUTH_HOOKS, useExisting: CommunityAuthHooksService },
    // IAM-14. An interceptor, not a guard: global guards run *before*
    // controller-scoped ones, so a global guard would execute ahead of each
    // controller's `JwtAuthGuard` and never see an authenticated principal.
    { provide: APP_INTERCEPTOR, useClass: MemberGateInterceptor },
  ],
  exports: [
    AUTH_HOOKS,
    PortalSettingsService,
    AuditService,
    MemberGateService,
    MemberActivationService,
  ],
})
export class CommunityAuthHooksModule {}
