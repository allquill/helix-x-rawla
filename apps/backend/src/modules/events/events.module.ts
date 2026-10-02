import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtGuardModule, TemplateRegistryService, User } from '@helix-x/backend';
import { CommunityCoreModule } from '../community-core/community-core.module';
import { Chapter } from '../community-core/entities/chapter.entity';
import { ChildProfile } from '../community-core/entities/child-profile.entity';
import { Member } from '../community-core/entities/member.entity';
import { SpouseProfile } from '../community-core/entities/spouse-profile.entity';
import { PortalFile } from '../portal-files/entities/portal-file.entity';
import { PortalEventAdminController } from './controllers/portal-event-admin.controller';
import { PortalEventDocumentsController } from './controllers/portal-event-documents.controller';
import { PortalEventsController } from './controllers/portal-events.controller';
import {
  PortalCertificatesController,
  PortalVolunteersController,
  PortalWaiversController,
} from './controllers/portal-volunteers.controller';
import {
  EventAttendee,
  EventCostEntry,
  EventDocument,
  EventDonatedGood,
  EventNotificationLog,
  EventPayment,
  EventRegistration,
  EventSlotBooking,
  EventTicketType,
  EventTimeSlot,
  EventWaiverSignature,
  MemberCertificate,
  PortalEvent,
  WaiverTemplate,
} from './entities';
import { EmailBroadcastChannel, SmsBroadcastChannel } from './providers/broadcast-channel';
import { CertificateService } from './providers/certificate.service';
import { EventCloseService } from './providers/event-close.service';
import { EventLedgerService } from './providers/event-ledger.service';
import { EventNotificationRunner } from './providers/event-notification.runner';
import { EventPaymentService } from './providers/event-payment.service';
import { EventRegistrationService } from './providers/event-registration.service';
import { EventService } from './providers/event.service';
import { VolunteerService } from './providers/volunteer.service';
import { WaiverService } from './providers/waiver.service';
import { EVENT_NOTIFICATION_TEMPLATES } from './templates/event-templates';

/**
 * Events & Ticketing (EVT) and Volunteer Management (VOL), with the two
 * pieces that hang off them: certificates (REC-07/08) and the scheduler that
 * sends invitations and reminders.
 *
 * It composes the member domain rather than extending it: `CommunityCoreModule`
 * supplies chapter scoping, reference lists and the privacy rule, and the
 * `@Global()` modules supply audit, settings, the checkout gateway and the
 * file store. It imports `JwtGuardModule`, not `AuthModule` — it needs the
 * guard, not the auth services.
 */
@Module({
  imports: [
    JwtGuardModule,
    CommunityCoreModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      PortalEvent,
      EventTicketType,
      EventTimeSlot,
      EventRegistration,
      EventAttendee,
      EventSlotBooking,
      WaiverTemplate,
      EventWaiverSignature,
      EventPayment,
      EventDocument,
      EventDonatedGood,
      EventCostEntry,
      EventNotificationLog,
      MemberCertificate,
      PortalFile,
      Member,
      SpouseProfile,
      ChildProfile,
      Chapter,
      User,
    ]),
  ],
  controllers: [
    PortalEventsController,
    PortalEventAdminController,
    PortalEventDocumentsController,
    PortalVolunteersController,
    PortalWaiversController,
    PortalCertificatesController,
  ],
  providers: [
    EventService,
    EventRegistrationService,
    EventPaymentService,
    EventCloseService,
    EventLedgerService,
    WaiverService,
    VolunteerService,
    CertificateService,
    EmailBroadcastChannel,
    SmsBroadcastChannel,
    EventNotificationRunner,
  ],
})
export class EventsModule implements OnModuleInit {
  constructor(private readonly templates: TemplateRegistryService) {}

  onModuleInit(): void {
    this.templates.registerAll(EVENT_NOTIFICATION_TEMPLATES);
  }
}
