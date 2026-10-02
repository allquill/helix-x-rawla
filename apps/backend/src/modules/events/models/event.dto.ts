import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  PRICING_TIERS,
  type EventCategory,
  type EventStatus,
  type PricingTier,
} from '../constants';
import { ID_MESSAGE, ID_PATTERN } from './id';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Requests ────────────────────────────────────────────────────────────────

export class CreateEventDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(160) title: string;

  @ApiProperty({ enum: EVENT_CATEGORIES }) @IsIn(EVENT_CATEGORIES) category: EventCategory;

  @ApiPropertyOptional({ nullable: true, description: 'Optional for smaller events (EVT-17).' })
  @IsOptional() @IsString() @MaxLength(10000)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Sponsoring chapter; omit for a national event.' })
  @IsOptional() @Matches(ID_PATTERN, ID_MESSAGE)
  chapterId?: string | null;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(300) venue?: string | null;

  @ApiProperty() @Type(() => Date) @IsDate() startsAt: Date;
  @ApiProperty() @Type(() => Date) @IsDate() endsAt: Date;

  @ApiPropertyOptional({ description: 'IANA time zone; defaults to the portal setting.' })
  @IsOptional() @IsString() @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Maximum participants; null is "No maximum".', nullable: true })
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @Min(1)
  capacity?: number | null;

  @ApiProperty({ example: '2027-03-10', description: 'The last day to register (EVT-18).' })
  @Matches(ISO_DATE, { message: 'registrationClosesOn must be YYYY-MM-DD' })
  registrationClosesOn: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(4000) attireGuide?: string | null;

  @ApiPropertyOptional({ description: 'Waiver every attendee signs; null for none.', nullable: true })
  @IsOptional() @ValidateIf((_o, v) => v !== null) @Matches(ID_PATTERN, ID_MESSAGE)
  waiverTemplateId?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() collectTshirt?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() collectHotel?: boolean;

  @ApiPropertyOptional({ type: [Number], nullable: true, description: 'Days before the start a reminder is sent; null uses the portal setting.' })
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsArray() @ArrayMaxSize(6) @IsInt({ each: true }) @Min(1, { each: true }) @Max(90, { each: true })
  reminderOffsetsDays?: number[] | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @ValidateIf((_o, v) => v !== null && v !== '') @IsUrl({ require_protocol: true, protocols: ['https'] })
  stripePaymentLink?: string | null;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(2000)
  zelleInstructions?: string | null;
}

/** Every field optional: a PATCH. */
export class UpdateEventDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) @MaxLength(160) title?: string;
  @ApiPropertyOptional({ enum: EVENT_CATEGORIES }) @IsOptional() @IsIn(EVENT_CATEGORIES) category?: EventCategory;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(10000) description?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_o, v) => v !== null) @Matches(ID_PATTERN, ID_MESSAGE) chapterId?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(300) venue?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() startsAt?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() endsAt?: Date;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) timezone?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @Min(1) capacity?: number | null;
  @ApiPropertyOptional() @IsOptional() @Matches(ISO_DATE, { message: 'registrationClosesOn must be YYYY-MM-DD' }) registrationClosesOn?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(4000) attireGuide?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_o, v) => v !== null) @Matches(ID_PATTERN, ID_MESSAGE) waiverTemplateId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() collectTshirt?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() collectHotel?: boolean;
  @ApiPropertyOptional({ type: [Number], nullable: true })
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsArray() @ArrayMaxSize(6) @IsInt({ each: true }) @Min(1, { each: true }) @Max(90, { each: true })
  reminderOffsetsDays?: number[] | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @ValidateIf((_o, v) => v !== null && v !== '') @IsUrl({ require_protocol: true, protocols: ['https'] })
  stripePaymentLink?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(2000) zelleInstructions?: string | null;
}

export class UpsertTicketTypeDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) name: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @Min(0) @Max(130) minAge?: number | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @Min(0) @Max(130) maxAge?: number | null;
  @ApiProperty({ description: 'Minor units; 0 is free.' }) @IsInt() @Min(0) priceCents: number;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @Min(0) earlyBirdPriceCents?: number | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_o, v) => v !== null) @Type(() => Date) @IsDate() earlyBirdEndsAt?: Date | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpsertSlotDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) activity: string;
  @ApiProperty() @Type(() => Date) @IsDate() startsAt: Date;
  @ApiProperty() @Type(() => Date) @IsDate() endsAt: Date;
  @ApiProperty() @IsInt() @Min(1) capacity: number;
}

export class SetPhotosLinkDto {
  @ApiProperty({ nullable: true, description: 'Link to the event photos; null removes it.' })
  @ValidateIf((_o, v) => v !== null && v !== '') @IsUrl({ require_protocol: true, protocols: ['https', 'http'] })
  photosUrl: string | null;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export class TicketTypeDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) minAge: number | null;
  @ApiPropertyOptional({ nullable: true }) maxAge: number | null;
  @ApiProperty() priceCents: number;
  @ApiPropertyOptional({ nullable: true }) earlyBirdPriceCents: number | null;
  @ApiPropertyOptional({ nullable: true }) earlyBirdEndsAt: Date | null;
  @ApiProperty() sortOrder: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ description: 'The price in force right now.' }) currentPriceCents: number;
  @ApiProperty({ enum: PRICING_TIERS }) currentTier: PricingTier;
}

export class SlotDto {
  @ApiProperty() id: string;
  @ApiProperty() activity: string;
  @ApiProperty() startsAt: Date;
  @ApiProperty() endsAt: Date;
  @ApiProperty() capacity: number;
  @ApiProperty() bookedCount: number;
  @ApiProperty() remaining: number;
}

export class EventSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ enum: EVENT_CATEGORIES }) category: EventCategory;
  @ApiPropertyOptional({ nullable: true }) chapterId: string | null;
  @ApiPropertyOptional({ nullable: true }) chapterName: string | null;
  @ApiPropertyOptional({ nullable: true }) venue: string | null;
  @ApiProperty() startsAt: Date;
  @ApiProperty() endsAt: Date;
  @ApiProperty() timezone: string;
  @ApiPropertyOptional({ nullable: true, description: 'Null is "No maximum".' }) capacity: number | null;
  @ApiProperty() attendeeCount: number;
  @ApiProperty() registrationClosesOn: string;
  @ApiProperty({ enum: EVENT_STATUSES }) status: EventStatus;
  @ApiProperty() currency: string;
  @ApiProperty() hasFlyer: boolean;
  @ApiPropertyOptional({ nullable: true, description: 'So a list can show an image flyer as a thumbnail without downloading a PDF to find out.' })
  flyerMimeType: string | null;
  @ApiProperty() registrationOpen: boolean;
  @ApiPropertyOptional({ nullable: true, description: 'Why registration is not open.' }) registrationClosedCode: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Lowest current ticket price; null with no tickets.' }) fromPriceCents: number | null;
}

export class EventDetailDto extends EventSummaryDto {
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiPropertyOptional({ nullable: true }) attireGuide: string | null;
  @ApiPropertyOptional({ nullable: true }) stripePaymentLink: string | null;
  @ApiPropertyOptional({ nullable: true }) zelleInstructions: string | null;
  @ApiPropertyOptional({ nullable: true }) photosUrl: string | null;
  @ApiPropertyOptional({ nullable: true }) flyerName: string | null;
  @ApiProperty() hasWaiver: boolean;
  @ApiProperty() hasSlots: boolean;
  @ApiProperty() collectTshirt: boolean;
  @ApiProperty() collectHotel: boolean;
  @ApiProperty({ type: [TicketTypeDto] }) ticketTypes: TicketTypeDto[];
  @ApiPropertyOptional({ nullable: true }) publishedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) closedAt: Date | null;
}

export class AdminEventDto extends EventDetailDto {
  @ApiPropertyOptional({ nullable: true }) waiverTemplateId: string | null;
  @ApiPropertyOptional({ type: [Number], nullable: true }) reminderOffsetsDays: number[] | null;
  @ApiProperty() createdByUserId: number;
  @ApiPropertyOptional({ nullable: true }) closedByUserId: number | null;
  @ApiPropertyOptional({ nullable: true }) invitationCompletedAt: Date | null;
  @ApiProperty() registrationCount: number;
  @ApiProperty() volunteerCount: number;
  @ApiProperty() totalCents: number;
  @ApiProperty() paidCents: number;
}

export class ListEventsResponseDto {
  @ApiProperty({ type: [EventSummaryDto] }) items: EventSummaryDto[];
  @ApiProperty() total: number;
}

export class ListAdminEventsResponseDto {
  @ApiProperty({ type: [AdminEventDto] }) items: AdminEventDto[];
  @ApiProperty() total: number;
}

/** Answers 200 with `event: null` when nothing is coming up, so the home card needs no 404 path. */
export class NextUpcomingEventDto {
  @ApiPropertyOptional({ type: EventSummaryDto, nullable: true }) event: EventSummaryDto | null;
}
