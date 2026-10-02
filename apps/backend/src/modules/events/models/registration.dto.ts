import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ATTENDEE_PERSON_TYPES,
  EVENT_PAYMENT_METHODS,
  EVENT_PAYMENT_STATUSES,
  MANUAL_PAYMENT_METHODS,
  PRICING_TIERS,
  REGISTRATION_STATUSES,
  type AttendeePersonType,
  type EventPaymentMethod,
  type EventPaymentStatus,
  type ManualPaymentMethod,
  type PricingTier,
  type RegistrationStatus,
} from '../constants';
import { EventDetailDto, SlotDto } from './event.dto';
import { ID_MESSAGE, ID_PATTERN } from './id';

// ─── Requests ────────────────────────────────────────────────────────────────

export class AttendeeInputDto {
  @ApiProperty({ example: 'child:2f0c…', description: 'A `personKey` from the registration options.' })
  @IsString() @MaxLength(80)
  personKey: string;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(60) dietaryPref?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) dietaryNotes?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(30) tshirtSize?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(1000) hotelDetails?: string | null;

  @ApiPropertyOptional({ description: 'This person will volunteer at the event (VOL-10).' })
  @IsOptional() @IsBoolean()
  isVolunteer?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Time slots to book for this person (EVT-03).' })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @Matches(ID_PATTERN, { each: true, message: 'each slot id must be an id' })
  slotIds?: string[];
}

export class CreateRegistrationDto {
  @ApiProperty({ type: [AttendeeInputDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => AttendeeInputDto)
  attendees: AttendeeInputDto[];

  @ApiPropertyOptional({ description: 'Required when the event has a waiver (EVT-05).' })
  @IsOptional() @IsBoolean()
  waiverAccepted?: boolean;

  @ApiPropertyOptional({ description: 'The signer types their full name.' })
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160)
  waiverSignedName?: string;
}

export class AttendeePreferencesDto {
  @ApiProperty() @Matches(ID_PATTERN, ID_MESSAGE) attendeeId: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(60) dietaryPref?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) dietaryNotes?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(30) tshirtSize?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(1000) hotelDetails?: string | null;
}

export class UpdatePreferencesDto {
  @ApiProperty({ type: [AttendeePreferencesDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => AttendeePreferencesDto)
  attendees: AttendeePreferencesDto[];
}

export class RecordEventPaymentDto {
  @ApiProperty({ description: 'Amount received, in minor units.' }) @IsInt() @Min(1) amountCents: number;
  @ApiProperty({ enum: MANUAL_PAYMENT_METHODS }) @IsIn(MANUAL_PAYMENT_METHODS) method: ManualPaymentMethod;
  @ApiPropertyOptional({ description: 'Zelle confirmation, cheque number…' }) @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class RemoveRegistrationDto {
  @ApiProperty({ description: 'Why the household is being removed. Audited (EVT-23).' })
  @IsString() @MinLength(5) @MaxLength(1000)
  reason: string;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export class ReferenceOptionDto {
  @ApiProperty() value: string;
  @ApiProperty() label: string;
}

export class RegistrationPersonDto {
  @ApiProperty() personKey: string;
  @ApiProperty({ enum: ATTENDEE_PERSON_TYPES }) personType: AttendeePersonType;
  @ApiProperty() fullName: string;
  @ApiProperty() isYouth: boolean;
  @ApiPropertyOptional({ nullable: true, description: 'Null when no ticket covers this person.' }) ticketTypeId: string | null;
  @ApiPropertyOptional({ nullable: true }) ticketTypeName: string | null;
  @ApiPropertyOptional({ nullable: true }) unitPriceCents: number | null;
  @ApiPropertyOptional({ enum: PRICING_TIERS, nullable: true }) pricingTier: PricingTier | null;
}

export class WaiverForSigningDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiProperty() version: number;
}

export class RegistrationOptionsDto {
  @ApiProperty({ type: EventDetailDto }) event: EventDetailDto;
  @ApiProperty() registrationOpen: boolean;
  @ApiPropertyOptional({ nullable: true }) registrationClosedCode: string | null;
  @ApiPropertyOptional({ nullable: true }) registrationClosedMessage: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Seats left; null is "No maximum".' }) remainingCapacity: number | null;
  @ApiProperty({ type: [RegistrationPersonDto] }) people: RegistrationPersonDto[];
  @ApiPropertyOptional({ type: WaiverForSigningDto, nullable: true }) waiver: WaiverForSigningDto | null;
  @ApiProperty({ type: [SlotDto] }) slots: SlotDto[];
  @ApiProperty({ type: [ReferenceOptionDto] }) dietaryOptions: ReferenceOptionDto[];
  @ApiProperty({ type: [ReferenceOptionDto] }) tshirtOptions: ReferenceOptionDto[];
  @ApiPropertyOptional({ nullable: true, description: 'Set when the household already holds a live registration.' })
  existingRegistrationId: string | null;
}

export class AttendeeSlotDto {
  @ApiProperty() slotId: string;
  @ApiProperty() activity: string;
  @ApiProperty() startsAt: Date;
  @ApiProperty() endsAt: Date;
}

export class AttendeeDto {
  @ApiProperty() id: string;
  @ApiProperty() personKey: string;
  @ApiProperty({ enum: ATTENDEE_PERSON_TYPES }) personType: AttendeePersonType;
  @ApiProperty() fullName: string;
  @ApiProperty() isYouth: boolean;
  @ApiProperty() ticketTypeName: string;
  @ApiProperty() unitPriceCents: number;
  @ApiProperty({ enum: PRICING_TIERS }) pricingTier: PricingTier;
  @ApiPropertyOptional({ nullable: true }) dietaryPref: string | null;
  @ApiPropertyOptional({ nullable: true }) dietaryNotes: string | null;
  @ApiPropertyOptional({ nullable: true }) tshirtSize: string | null;
  @ApiPropertyOptional({ nullable: true }) hotelDetails: string | null;
  @ApiProperty() isVolunteer: boolean;
  @ApiPropertyOptional({ nullable: true }) volunteerMinutes: number | null;
  @ApiPropertyOptional({ nullable: true }) waiverSignedAt: Date | null;
  @ApiProperty({ type: [AttendeeSlotDto] }) slots: AttendeeSlotDto[];
}

export class EventPaymentDto {
  @ApiProperty() id: string;
  @ApiProperty() amountCents: number;
  @ApiProperty() currency: string;
  @ApiProperty({ enum: EVENT_PAYMENT_METHODS }) method: EventPaymentMethod;
  @ApiProperty({ enum: EVENT_PAYMENT_STATUSES }) status: EventPaymentStatus;
  @ApiPropertyOptional({ nullable: true }) reference: string | null;
  @ApiPropertyOptional({ nullable: true }) note: string | null;
  @ApiPropertyOptional({ nullable: true }) recordedByUserId: number | null;
  @ApiPropertyOptional({ nullable: true }) settledAt: Date | null;
  @ApiProperty() createdAt: Date;
}

export class EventRegistrationDto {
  @ApiProperty() id: string;
  @ApiProperty() eventId: string;
  @ApiProperty({ enum: REGISTRATION_STATUSES }) status: RegistrationStatus;
  @ApiProperty() totalCents: number;
  @ApiProperty() paidCents: number;
  @ApiProperty() balanceCents: number;
  @ApiProperty() currency: string;
  @ApiProperty({ description: 'Whether the member may cancel it themselves (EVT-23).' }) canCancel: boolean;
  @ApiPropertyOptional({ nullable: true }) cancelBlockedCode: string | null;
  @ApiProperty({ type: [AttendeeDto] }) attendees: AttendeeDto[];
  @ApiProperty({ type: [EventPaymentDto] }) payments: EventPaymentDto[];
  @ApiProperty() createdAt: Date;
}

/** `registration: null` when the household has none, rather than a 404. */
export class MyEventRegistrationDto {
  @ApiPropertyOptional({ type: EventRegistrationDto, nullable: true }) registration: EventRegistrationDto | null;
}

export class AdminEventRegistrationDto extends EventRegistrationDto {
  @ApiProperty() householdId: string;
  @ApiProperty() purchaserMemberId: string;
  @ApiProperty() purchaserName: string;
  @ApiPropertyOptional({ nullable: true }) purchaserEmail: string | null;
  @ApiPropertyOptional({ nullable: true }) chapterId: string | null;
  @ApiPropertyOptional({ nullable: true }) removedReason: string | null;
  @ApiPropertyOptional({ nullable: true }) removedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) removedByUserId: number | null;
}

export class ListEventRegistrationsResponseDto {
  @ApiProperty({ type: [AdminEventRegistrationDto] }) items: AdminEventRegistrationDto[];
  @ApiProperty() total: number;
}

export class EventCheckoutDto {
  @ApiProperty() checkoutUrl: string;
}

/**
 * One line of the participant list (EVT-21). Tier 2: a name and a chapter,
 * never an amount, a payment state, a preference or a contact detail.
 */
export class EventParticipantDto {
  @ApiProperty() displayName: string;
  @ApiProperty({ description: 'The person is not in the directory; the name is withheld.' }) isPrivate: boolean;
  @ApiPropertyOptional({ nullable: true }) chapterName: string | null;
  @ApiProperty() isVolunteer: boolean;
  @ApiProperty({ description: 'Groups a household together; opaque.' }) householdKey: string;
}

export class ListEventParticipantsResponseDto {
  @ApiProperty({ type: [EventParticipantDto] }) items: EventParticipantDto[];
  @ApiProperty() total: number;
}
