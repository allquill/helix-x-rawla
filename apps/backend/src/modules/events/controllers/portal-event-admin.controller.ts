import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
  type AuthenticatedUser,
} from '@helix-x/backend';
import { MemberService } from '../../community-core/providers/member.service';
import { type UploadedPortalFile } from '../../portal-files/portal-file.service';
import { PortalUploadInterceptor } from '../../portal-files/portal-upload.interceptor';
import {
  EVENT_CATEGORIES,
  EVENT_PERMISSIONS,
  EVENT_STATUSES,
  REGISTRATION_STATUSES,
} from '../constants';
import { IdPipe } from '../models/id';
import {
  AdminEventDto,
  CreateEventDto,
  ListAdminEventsResponseDto,
  SetPhotosLinkDto,
  SlotDto,
  TicketTypeDto,
  UpdateEventDto,
  UpsertSlotDto,
  UpsertTicketTypeDto,
} from '../models/event.dto';
import {
  ClosePreviewDto,
  CloseEventDto,
  CreateDonatedGoodDto,
  CreateEventCostDto,
  DonatedGoodDto,
  EventCostDto,
  EventFinanceSummaryDto,
  EventNotificationStatusDto,
  EventVolunteerDto,
  SaveVolunteerHoursDto,
} from '../models/operations.dto';
import {
  AdminEventRegistrationDto,
  ListEventRegistrationsResponseDto,
  RecordEventPaymentDto,
  RemoveRegistrationDto,
} from '../models/registration.dto';
import { EventCloseService } from '../providers/event-close.service';
import { EventLedgerService } from '../providers/event-ledger.service';
import { EventPaymentService } from '../providers/event-payment.service';
import { EventRegistrationService } from '../providers/event-registration.service';
import { EventService } from '../providers/event.service';

const FILE_UPLOAD_SCHEMA = {
  type: 'object',
  required: ['file'],
  properties: { file: { type: 'string', format: 'binary' } },
};

/**
 * Running an event: creating it, its tickets and time slots, its
 * registrations and money, volunteer hours, and closing it.
 *
 * Who may do what follows RROA-DEV's role rules (§3.1) through the
 * permissions, not role names: only the three Secretaries and `super_admin`
 * hold `events:create`; recording a payment, removing a household and posting
 * photos are Admin actions; closing and hours are for Admins and Secretaries.
 *
 * A Chapter Lead reaches the read routes for their own chapter's events only —
 * another chapter's answer 404.
 *
 * There is deliberately no route that reopens a closed event (EVT-26).
 */
@ApiTags('Portal Event Administration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class PortalEventAdminController {
  constructor(
    private readonly events: EventService,
    private readonly registrations: EventRegistrationService,
    private readonly payments: EventPaymentService,
    private readonly closing: EventCloseService,
    private readonly ledger: EventLedgerService,
    private readonly members: MemberService,
  ) {}

  // ─── Events ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Create an event, as a draft (EVT-16)' })
  @ApiCreatedResponse({ type: AdminEventDto })
  @Permissions(EVENT_PERMISSIONS.CREATE)
  @Post('events')
  createPortalEvent(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminEventDto> {
    return this.events.create(dto, user);
  }

  @ApiOperation({ summary: 'Every event, drafts included, with registration totals' })
  @ApiOkResponse({ type: ListAdminEventsResponseDto })
  @ApiQuery({ name: 'status', required: false, enum: EVENT_STATUSES })
  @ApiQuery({ name: 'category', required: false, enum: EVENT_CATEGORIES })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @Permissions(EVENT_PERMISSIONS.REGISTRATIONS_READ)
  @Get('admin/events')
  async listAdminEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ListAdminEventsResponseDto> {
    return this.events.listAdmin({ status, category, limit, offset }, await this.members.scopeFor(user));
  }

  @ApiOperation({ summary: 'One event, for the people running it' })
  @ApiOkResponse({ type: AdminEventDto })
  @Permissions(EVENT_PERMISSIONS.REGISTRATIONS_READ)
  @Get('admin/events/:id')
  async getAdminEvent(@Param('id', IdPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<AdminEventDto> {
    return this.events.adminDetail(id, await this.members.scopeFor(user));
  }

  @ApiOperation({ summary: 'Edit an event' })
  @ApiOkResponse({ type: AdminEventDto })
  @Permissions(EVENT_PERMISSIONS.WRITE)
  @Patch('admin/events/:id')
  updatePortalEvent(
    @Param('id', IdPipe) id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminEventDto> {
    return this.events.update(id, dto, user);
  }

  @ApiOperation({
    summary: 'Publish a draft',
    description: 'Members can now see it and register, and the invitation is sent (EVT-22).',
  })
  @ApiOkResponse({ type: AdminEventDto })
  @Permissions(EVENT_PERMISSIONS.WRITE)
  @HttpCode(HttpStatus.OK)
  @Post('admin/events/:id/publish')
  publishPortalEvent(@Param('id', IdPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<AdminEventDto> {
    return this.events.publish(id, user);
  }

  @ApiOperation({ summary: 'Upload or replace the flyer' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: FILE_UPLOAD_SCHEMA })
  @ApiOkResponse({ type: AdminEventDto })
  @Permissions(EVENT_PERMISSIONS.WRITE)
  @UseInterceptors(PortalUploadInterceptor)
  @HttpCode(HttpStatus.OK)
  @Post('admin/events/:id/flyer')
  uploadEventFlyer(
    @Param('id', IdPipe) id: string,
    @UploadedFile() file: UploadedPortalFile | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminEventDto> {
    return this.events.uploadFlyer(id, file, user);
  }

  @ApiOperation({ summary: 'Post or remove the link to the event photos (EVT-25)' })
  @ApiOkResponse({ type: AdminEventDto })
  @Permissions(EVENT_PERMISSIONS.PHOTOS_MANAGE)
  @Put('admin/events/:id/photos-link')
  setEventPhotosLink(
    @Param('id', IdPipe) id: string,
    @Body() dto: SetPhotosLinkDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminEventDto> {
    return this.events.setPhotosLink(id, dto.photosUrl, user);
  }

  // ─── Tickets ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Add an age-banded ticket' })
  @ApiCreatedResponse({ type: TicketTypeDto })
  @Permissions(EVENT_PERMISSIONS.WRITE)
  @Post('admin/events/:id/ticket-types')
  createEventTicketType(
    @Param('id', IdPipe) id: string,
    @Body() dto: UpsertTicketTypeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketTypeDto> {
    return this.events.addTicketType(id, dto, user);
  }

  @ApiOperation({ summary: 'Edit a ticket', description: 'Prices already locked on registrations do not change.' })
  @ApiOkResponse({ type: TicketTypeDto })
  @Permissions(EVENT_PERMISSIONS.WRITE)
  @Patch('admin/events/:id/ticket-types/:ticketTypeId')
  updateEventTicketType(
    @Param('id', IdPipe) id: string,
    @Param('ticketTypeId', IdPipe) ticketTypeId: string,
    @Body() dto: UpsertTicketTypeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TicketTypeDto> {
    return this.events.updateTicketType(id, ticketTypeId, dto, user);
  }

  @ApiOperation({ summary: 'Delete a ticket nobody holds' })
  @ApiNoContentResponse()
  @Permissions(EVENT_PERMISSIONS.WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('admin/events/:id/ticket-types/:ticketTypeId')
  deleteEventTicketType(
    @Param('id', IdPipe) id: string,
    @Param('ticketTypeId', IdPipe) ticketTypeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.events.deleteTicketType(id, ticketTypeId, user);
  }

  // ─── Time slots (EVT-03) ──────────────────────────────────────────────────

  @ApiOperation({ summary: "An event's time slots, drafts included" })
  @ApiOkResponse({ type: [SlotDto] })
  @Permissions(EVENT_PERMISSIONS.REGISTRATIONS_READ)
  @Get('admin/events/:id/slots')
  async listAdminEventSlots(@Param('id', IdPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<SlotDto[]> {
    await this.events.mustFindInScope(id, await this.members.scopeFor(user));
    return this.events.listSlots(id);
  }

  @ApiOperation({ summary: 'Add a bookable time slot' })
  @ApiCreatedResponse({ type: SlotDto })
  @Permissions(EVENT_PERMISSIONS.WRITE)
  @Post('admin/events/:id/slots')
  createEventSlot(
    @Param('id', IdPipe) id: string,
    @Body() dto: UpsertSlotDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SlotDto> {
    return this.events.addSlot(id, dto, user);
  }

  @ApiOperation({ summary: 'Edit a time slot' })
  @ApiOkResponse({ type: SlotDto })
  @Permissions(EVENT_PERMISSIONS.WRITE)
  @Patch('admin/events/:id/slots/:slotId')
  updateEventSlot(
    @Param('id', IdPipe) id: string,
    @Param('slotId', IdPipe) slotId: string,
    @Body() dto: UpsertSlotDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SlotDto> {
    return this.events.updateSlot(id, slotId, dto, user);
  }

  @ApiOperation({ summary: 'Delete a time slot nobody has booked' })
  @ApiNoContentResponse()
  @Permissions(EVENT_PERMISSIONS.WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('admin/events/:id/slots/:slotId')
  deleteEventSlot(
    @Param('id', IdPipe) id: string,
    @Param('slotId', IdPipe) slotId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.events.deleteSlot(id, slotId, user);
  }

  // ─── Registrations and money ──────────────────────────────────────────────

  @ApiOperation({ summary: "An event's registrations, with amounts and preferences" })
  @ApiOkResponse({ type: ListEventRegistrationsResponseDto })
  @ApiQuery({ name: 'status', required: false, enum: REGISTRATION_STATUSES })
  @ApiQuery({ name: 'q', required: false, description: 'Purchaser name' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @Permissions(EVENT_PERMISSIONS.REGISTRATIONS_READ)
  @Get('admin/events/:id/registrations')
  async listEventRegistrations(
    @Param('id', IdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ListEventRegistrationsResponseDto> {
    return this.registrations.listForEvent(id, { status, q, limit, offset }, await this.members.scopeFor(user));
  }

  @ApiOperation({ summary: 'One registration' })
  @ApiOkResponse({ type: AdminEventRegistrationDto })
  @Permissions(EVENT_PERMISSIONS.REGISTRATIONS_READ)
  @Get('admin/events/:id/registrations/:registrationId')
  async getEventRegistration(
    @Param('id', IdPipe) id: string,
    @Param('registrationId', IdPipe) registrationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminEventRegistrationDto> {
    return this.registrations.getForEvent(id, registrationId, await this.members.scopeFor(user));
  }

  @ApiOperation({
    summary: 'Record a payment received outside the checkout (EVT-20)',
    description: 'Zelle, cheque, cash. The actor, time and reference are kept and audited.',
  })
  @ApiCreatedResponse({ type: AdminEventRegistrationDto })
  @Permissions(EVENT_PERMISSIONS.PAYMENTS_RECORD)
  @Post('admin/events/:id/registrations/:registrationId/payments')
  async recordEventPayment(
    @Param('id', IdPipe) id: string,
    @Param('registrationId', IdPipe) registrationId: string,
    @Body() dto: RecordEventPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminEventRegistrationDto> {
    await this.payments.recordManual(id, registrationId, dto, user);
    return this.registrations.getForEvent(id, registrationId, { all: true, chapterIds: [] });
  }

  @ApiOperation({
    summary: 'Remove a household from the event (EVT-23)',
    description: 'Whatever it has paid. A reason is required. Refunds are handled outside the portal.',
  })
  @ApiOkResponse({ type: AdminEventRegistrationDto })
  @Permissions(EVENT_PERMISSIONS.REGISTRATIONS_REMOVE)
  @HttpCode(HttpStatus.OK)
  @Post('admin/events/:id/registrations/:registrationId/remove')
  removeEventRegistration(
    @Param('id', IdPipe) id: string,
    @Param('registrationId', IdPipe) registrationId: string,
    @Body() dto: RemoveRegistrationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminEventRegistrationDto> {
    return this.registrations.remove(id, registrationId, dto.reason, user);
  }

  // ─── Volunteer hours and close (VOL-12 / EVT-26) ──────────────────────────

  @ApiOperation({ summary: 'Everyone volunteering at the event, with their hours so far' })
  @ApiOkResponse({ type: [EventVolunteerDto] })
  @Permissions(EVENT_PERMISSIONS.VOLUNTEER_HOURS_WRITE)
  @Get('admin/events/:id/volunteers')
  async listEventVolunteers(
    @Param('id', IdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EventVolunteerDto[]> {
    return this.closing.listVolunteers(id, await this.members.scopeFor(user));
  }

  @ApiOperation({ summary: 'Enter or correct volunteer hours' })
  @ApiOkResponse({ type: [EventVolunteerDto] })
  @Permissions(EVENT_PERMISSIONS.VOLUNTEER_HOURS_WRITE)
  @Put('admin/events/:id/volunteer-hours')
  async saveEventVolunteerHours(
    @Param('id', IdPipe) id: string,
    @Body() dto: SaveVolunteerHoursDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EventVolunteerDto[]> {
    await this.closing.saveHours(id, dto.entries, user);
    return this.closing.listVolunteers(id, { all: true, chapterIds: [] });
  }

  @ApiOperation({ summary: 'Whether the event can be closed, and what closing will do' })
  @ApiOkResponse({ type: ClosePreviewDto })
  @Permissions(EVENT_PERMISSIONS.CLOSE)
  @Get('admin/events/:id/close-preview')
  getEventClosePreview(@Param('id', IdPipe) id: string): Promise<ClosePreviewDto> {
    return this.closing.preview(id);
  }

  @ApiOperation({
    summary: 'Close the event — permanently',
    description:
      'Needs hours for every volunteer (zero is allowed). From then on every write to the event ' +
      'is refused with 409 and its statements and bills are visible only to the Finance and ' +
      'General Secretaries. A closed event cannot be reopened.',
  })
  @ApiOkResponse({ type: AdminEventDto })
  @Permissions(EVENT_PERMISSIONS.CLOSE)
  @HttpCode(HttpStatus.OK)
  @Post('admin/events/:id/close')
  async closePortalEvent(
    @Param('id', IdPipe) id: string,
    @Body() dto: CloseEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminEventDto> {
    await this.closing.close(id, dto.hours, user);
    return this.events.adminDetail(id, { all: true, chapterIds: [] });
  }

  // ─── Donated goods (EVT-06) ───────────────────────────────────────────────

  @ApiOperation({ summary: 'Goods donated for the event' })
  @ApiOkResponse({ type: [DonatedGoodDto] })
  @Permissions(EVENT_PERMISSIONS.INVENTORY_MANAGE)
  @Get('admin/events/:id/donated-goods')
  listEventDonatedGoods(@Param('id', IdPipe) id: string): Promise<DonatedGoodDto[]> {
    return this.ledger.listGoods(id);
  }

  @ApiOperation({ summary: 'Record donated goods, with the donor' })
  @ApiCreatedResponse({ type: DonatedGoodDto })
  @Permissions(EVENT_PERMISSIONS.INVENTORY_MANAGE)
  @Post('admin/events/:id/donated-goods')
  addEventDonatedGood(
    @Param('id', IdPipe) id: string,
    @Body() dto: CreateDonatedGoodDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DonatedGoodDto> {
    return this.ledger.addGood(id, dto, user);
  }

  @ApiOperation({ summary: 'Delete a donated-goods entry' })
  @ApiNoContentResponse()
  @Permissions(EVENT_PERMISSIONS.INVENTORY_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('admin/events/:id/donated-goods/:goodId')
  deleteEventDonatedGood(
    @Param('id', IdPipe) id: string,
    @Param('goodId', IdPipe) goodId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.ledger.deleteGood(id, goodId, user);
  }

  // ─── Costs and the chapter split (EVT-11 / VOL-07) ────────────────────────

  @ApiOperation({ summary: "The event's costs" })
  @ApiOkResponse({ type: [EventCostDto] })
  @Permissions(EVENT_PERMISSIONS.FINANCE_READ)
  @Get('admin/events/:id/costs')
  async listEventCosts(@Param('id', IdPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<EventCostDto[]> {
    return this.ledger.listCosts(id, await this.members.scopeFor(user));
  }

  @ApiOperation({ summary: 'Record a cost against a chapter' })
  @ApiCreatedResponse({ type: [EventCostDto] })
  @Permissions(EVENT_PERMISSIONS.FINANCE_MANAGE)
  @Post('admin/events/:id/costs')
  async addEventCost(
    @Param('id', IdPipe) id: string,
    @Body() dto: CreateEventCostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EventCostDto[]> {
    await this.ledger.addCost(id, dto, user);
    return this.ledger.listCosts(id, { all: true, chapterIds: [] });
  }

  @ApiOperation({ summary: 'Delete a cost' })
  @ApiNoContentResponse()
  @Permissions(EVENT_PERMISSIONS.FINANCE_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('admin/events/:id/costs/:costId')
  deleteEventCost(
    @Param('id', IdPipe) id: string,
    @Param('costId', IdPipe) costId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.ledger.deleteCost(id, costId, user);
  }

  @ApiOperation({ summary: 'Revenue and cost by chapter' })
  @ApiOkResponse({ type: EventFinanceSummaryDto })
  @Permissions(EVENT_PERMISSIONS.FINANCE_READ)
  @Get('admin/events/:id/finance-summary')
  async getEventFinanceSummary(
    @Param('id', IdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EventFinanceSummaryDto> {
    return this.ledger.financeSummary(id, await this.members.scopeFor(user));
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'What has been sent: the invitation and each reminder' })
  @ApiOkResponse({ type: EventNotificationStatusDto })
  @Permissions(EVENT_PERMISSIONS.WRITE)
  @Get('admin/events/:id/notifications')
  getEventNotificationStatus(@Param('id', IdPipe) id: string): Promise<EventNotificationStatusDto> {
    return this.ledger.notificationStatus(id);
  }
}
