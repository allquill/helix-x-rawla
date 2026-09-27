import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberController } from './controllers/member.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { PortalAdminController } from './controllers/portal-admin.controller';
import { PublicRegistrationController } from './controllers/public-registration.controller';
import { RegistrationAdminController } from './controllers/registration-admin.controller';
import { AuditLog } from './entities/audit-log.entity';
import { Chapter } from './entities/chapter.entity';
import { ChildProfile } from './entities/child-profile.entity';
import { ConsentRecord } from './entities/consent-record.entity';
import { Household } from './entities/household.entity';
import { LifeEvent } from './entities/life-event.entity';
import { Member } from './entities/member.entity';
import { MemberReferenceContact } from './entities/member-reference-contact.entity';
import { MemberStatusHistory } from './entities/member-status-history.entity';
import { MembershipPayment } from './entities/membership-payment.entity';
import { PortalSetting } from './entities/portal-setting.entity';
import { ReferenceList } from './entities/reference-list.entity';
import { ReferenceListValue } from './entities/reference-list-value.entity';
import { SpouseProfile } from './entities/spouse-profile.entity';
import { StateChapterMap } from './entities/state-chapter-map.entity';
import { ChapterService } from './providers/chapter.service';
import { CredentialPolicyService } from './providers/credential-policy.service';
import { DuesPaymentService } from './providers/dues-payment.service';
import { MemberRegistrationService } from './providers/member-registration.service';
import { MemberService } from './providers/member.service';
import { MemberVettingService } from './providers/member-vetting.service';
import { ProfileVisibilityService } from './providers/profile-visibility.service';
import { ReferenceDataService } from './providers/reference-data.service';
import { PORTAL_NOTIFICATION_TEMPLATES } from './templates/portal-templates';
import { AuthModule, Role, TemplateRegistryService, User } from '@helix-x/backend';

/**
 * The Rawla portal's member domain: registration, vetting, households,
 * chapters, master data and the activation settings.
 *
 * Imports `AuthModule` for `AuthService` and `CredentialFlowService`. That is
 * safe here — only the `AUTH_HOOKS` implementation is barred from touching
 * `AuthService`, and it lives in `CommunityAuthHooksModule`.
 */
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Member,
      MemberStatusHistory,
      MemberReferenceContact,
      MembershipPayment,
      Household,
      SpouseProfile,
      ChildProfile,
      ConsentRecord,
      LifeEvent,
      Chapter,
      StateChapterMap,
      ReferenceList,
      ReferenceListValue,
      PortalSetting,
      AuditLog,
      User,
      Role,
    ]),
  ],
  controllers: [
    PublicRegistrationController,
    RegistrationAdminController,
    MemberController,
    PortalAdminController,
    PaymentWebhookController,
  ],
  providers: [
    MemberRegistrationService,
    MemberVettingService,
    MemberService,
    ProfileVisibilityService,
    ReferenceDataService,
    ChapterService,
    CredentialPolicyService,
    DuesPaymentService,
  ],
  exports: [MemberService, ReferenceDataService, ChapterService],
})
export class CommunityCoreModule implements OnModuleInit {
  constructor(private readonly templates: TemplateRegistryService) {}

  /**
   * Register the portal's own mail templates.
   *
   * `register` overwrites by name, and the auth package only installs its
   * unbranded defaults when the name is still free — so these win whichever
   * module initialises first.
   */
  onModuleInit(): void {
    this.templates.registerAll(PORTAL_NOTIFICATION_TEMPLATES);
  }
}
