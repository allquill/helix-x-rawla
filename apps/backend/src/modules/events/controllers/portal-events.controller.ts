import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  CurrentUser,
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
  type AuthenticatedUser,
} from '@helix-x/backend';
import { EVENT_CATEGORIES, EVENT_PERMISSIONS } from '../constants';
import { IdPipe } from '../models/id';
import {
  EventDetailDto,
  ListEventsResponseDto,
  NextUpcomingEventDto,
  SlotDto,
} from '../models/event.dto';
import {
  CreateRegistrationDto,
  EventCheckoutDto,
  EventRegistrationDto,
  ListEventParticipantsResponseDto,
  MyEventRegistrationDto,
  RegistrationOptionsDto,
  UpdatePreferencesDto,
} from '../models/registration.dto';
import { EventPaymentService } from '../providers/event-payment.service';
import { EventRegistrationService } from '../providers/event-registration.service';
import { EventService } from '../providers/event.service';

/**
 * Events as a member sees them (EVT-17, EVT-21) and their own household's
 * registration (EVT-01).
 *
 * None of these is `@GateExempt()`: a member who is not yet active gets the
 * gate's 403, because events are for active members. A draft event answers
 * 404 on every route here.
 */
@ApiTags('Portal Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('events')
export class PortalEventsController {
  constructor(
    private readonly events: EventService,
    private readonly registrations: EventRegistrationService,
    private readonly payments: EventPaymentService,
  ) {}

  @ApiOperation({ summary: 'Published events, upcoming or past' })
  @ApiOkResponse({ type: ListEventsResponseDto })
  @ApiQuery({ name: 'scope', required: false, enum: ['upcoming', 'past'] })
  @ApiQuery({ name: 'category', required: false, enum: EVENT_CATEGORIES })
  @ApiQuery({ name: 'chapterId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @Permissions(EVENT_PERMISSIONS.READ)
  @Get()
  listPortalEvents(
    @Query('scope') scope?: string,
    @Query('category') category?: string,
    @Query('chapterId') chapterId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ListEventsResponseDto> {
    return this.events.listVisible({ scope, category, chapterId, limit, offset });
  }

  // Declared before `:id` — Nest matches in declaration order.
  @ApiOperation({
    summary: 'The next event still open for registration',
    description: 'For the home page highlight (HOM-02). `event` is null when nothing is coming up.',
  })
  @ApiOkResponse({ type: NextUpcomingEventDto })
  @Permissions(EVENT_PERMISSIONS.READ)
  @Get('next-upcoming')
  async getNextUpcomingEvent(): Promise<NextUpcomingEventDto> {
    return { event: await this.events.nextUpcoming() };
  }

  @ApiOperation({ summary: 'One event: dates, place, fee, flyer and description' })
  @ApiOkResponse({ type: EventDetailDto })
  @Permissions(EVENT_PERMISSIONS.READ)
  @Get(':id')
  getPortalEvent(@Param('id', IdPipe) id: string): Promise<EventDetailDto> {
    return this.events.detail(id);
  }

  @ApiOperation({
    summary: 'Who is taking part',
    description: 'Names only (EVT-21). A member outside the directory is counted, not named.',
  })
  @ApiOkResponse({ type: ListEventParticipantsResponseDto })
  @Permissions(EVENT_PERMISSIONS.READ)
  @Get(':id/participants')
  listEventParticipants(
    @Param('id', IdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListEventParticipantsResponseDto> {
    return this.registrations.participants(id, user);
  }

  @ApiOperation({ summary: 'The event flyer' })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @Permissions(EVENT_PERMISSIONS.READ)
  @Get(':id/flyer')
  downloadEventFlyer(
    @Param('id', IdPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    return this.events.sendFlyer(id, response);
  }

  @ApiOperation({ summary: 'Bookable time slots, with the places left in each' })
  @ApiOkResponse({ type: [SlotDto] })
  @Permissions(EVENT_PERMISSIONS.READ)
  @Get(':id/slots')
  async listEventSlots(@Param('id', IdPipe) id: string): Promise<SlotDto[]> {
    await this.events.mustFindVisible(id);
    return this.events.listSlots(id);
  }

  @ApiOperation({
    summary: 'Everything the registration form needs',
    description:
      'The people in your household with the ticket and price each would get right now, ' +
      'the waiver to sign, the time slots and the places left.',
  })
  @ApiOkResponse({ type: RegistrationOptionsDto })
  @Permissions(EVENT_PERMISSIONS.REGISTER)
  @Get(':id/registration-options')
  getEventRegistrationOptions(
    @Param('id', IdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RegistrationOptionsDto> {
    return this.registrations.options(id, user);
  }

  @ApiOperation({ summary: "Your household's registration for this event" })
  @ApiOkResponse({ type: MyEventRegistrationDto })
  @Permissions(EVENT_PERMISSIONS.REGISTER)
  @Get(':id/my-registration')
  async getMyEventRegistration(
    @Param('id', IdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MyEventRegistrationDto> {
    return { registration: await this.registrations.mine(id, user) };
  }

  @ApiOperation({
    summary: 'Register your household',
    description:
      'Everyone attending, in one registration and one payment (EVT-01). Refused after the ' +
      'closing date and when the event is full; prices are locked at this moment.',
  })
  @ApiCreatedResponse({ type: EventRegistrationDto })
  @Permissions(EVENT_PERMISSIONS.REGISTER)
  @Post(':id/registrations')
  createEventRegistration(
    @Param('id', IdPipe) id: string,
    @Body() dto: CreateRegistrationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<EventRegistrationDto> {
    return this.registrations.create(id, dto, user, {
      ip: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });
  }

  @ApiOperation({ summary: 'Change dietary, T-shirt and hotel details on your registration' })
  @ApiOkResponse({ type: EventRegistrationDto })
  @Permissions(EVENT_PERMISSIONS.REGISTER)
  @Patch(':id/my-registration/preferences')
  updateMyEventPreferences(
    @Param('id', IdPipe) id: string,
    @Body() dto: UpdatePreferencesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EventRegistrationDto> {
    return this.registrations.updatePreferences(id, dto, user);
  }

  @ApiOperation({
    summary: 'Cancel your registration',
    description: 'Only while nothing has been paid (EVT-23). After that, an administrator removes it.',
  })
  @ApiOkResponse({ type: EventRegistrationDto })
  @Permissions(EVENT_PERMISSIONS.REGISTER)
  @HttpCode(HttpStatus.OK)
  @Post(':id/my-registration/cancel')
  cancelMyEventRegistration(
    @Param('id', IdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EventRegistrationDto> {
    return this.registrations.cancel(id, user);
  }

  @ApiOperation({
    summary: 'Start paying for your registration',
    description:
      'Opens a checkout for the balance. The registration is confirmed when the provider ' +
      'confirms the payment, not when the browser returns.',
  })
  @ApiCreatedResponse({ type: EventCheckoutDto })
  @Permissions(EVENT_PERMISSIONS.REGISTER)
  @Post(':id/my-registration/checkout')
  startEventCheckout(
    @Param('id', IdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EventCheckoutDto> {
    return this.payments.startCheckout(id, user);
  }
}
