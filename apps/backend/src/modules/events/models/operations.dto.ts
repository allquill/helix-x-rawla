import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  EVENT_COST_CATEGORIES,
  EVENT_DOCUMENT_KINDS,
  type EventCostCategory,
  type EventDocumentKind,
} from '../constants';
import { ID_MESSAGE, ID_PATTERN } from './id';

// ─── Volunteer hours and close (VOL-12 / EVT-26) ─────────────────────────────

export class VolunteerHoursEntryDto {
  @ApiProperty() @Matches(ID_PATTERN, ID_MESSAGE) attendeeId: string;
  @ApiProperty({ description: 'Minutes served. Zero is a valid entry.' })
  @IsInt() @Min(0) @Max(60 * 24 * 14)
  minutes: number;
}

export class SaveVolunteerHoursDto {
  @ApiProperty({ type: [VolunteerHoursEntryDto] })
  @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => VolunteerHoursEntryDto)
  entries: VolunteerHoursEntryDto[];
}

export class CloseEventDto {
  @ApiPropertyOptional({ type: [VolunteerHoursEntryDto], description: 'Hours to save in the same transaction as the close.' })
  @IsOptional() @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => VolunteerHoursEntryDto)
  hours?: VolunteerHoursEntryDto[];
}

export class EventVolunteerDto {
  @ApiProperty() attendeeId: string;
  @ApiProperty() fullName: string;
  @ApiProperty() isYouth: boolean;
  @ApiProperty() registrationId: string;
  @ApiProperty() householdName: string;
  @ApiPropertyOptional({ nullable: true, description: 'Null until entered.' }) volunteerMinutes: number | null;
}

export class ClosePreviewDto {
  @ApiProperty() canClose: boolean;
  @ApiPropertyOptional({ nullable: true }) code: string | null;
  @ApiProperty({ type: [String] }) missingHoursAttendeeIds: string[];
  @ApiProperty() volunteerCount: number;
  @ApiProperty({ description: 'Live registrations with a balance still owing.' }) unpaidRegistrationCount: number;
  @ApiProperty() outstandingCents: number;
  @ApiProperty({ description: 'Documents that become finance-restricted at close.' }) documentCount: number;
}

// ─── Documents (EVT-24) ──────────────────────────────────────────────────────

export class UploadEventDocumentDto {
  @ApiPropertyOptional({ enum: EVENT_DOCUMENT_KINDS })
  @IsOptional() @IsIn(EVENT_DOCUMENT_KINDS)
  kind?: EventDocumentKind;
}

export class EventDocumentDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: EVENT_DOCUMENT_KINDS }) kind: EventDocumentKind;
  @ApiProperty() name: string;
  @ApiProperty() mimeType: string;
  @ApiProperty() sizeBytes: number;
  @ApiProperty() addedByUserId: number;
  @ApiProperty() createdAt: Date;
}

export class ListEventDocumentsResponseDto {
  @ApiProperty({ type: [EventDocumentDto] }) items: EventDocumentDto[];
  @ApiProperty({ description: 'DOC security level in force: 4 while open, 5 once closed.' }) level: number;
}

// ─── Donated goods (EVT-06) ──────────────────────────────────────────────────

export class CreateDonatedGoodDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) item: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @ApiProperty() @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) unit?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @Min(0) estimatedValueCents?: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'The donating member, when they are one.' })
  @IsOptional() @ValidateIf((_o, v) => v !== null) @Matches(ID_PATTERN, ID_MESSAGE)
  donorMemberId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) donorName?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() receivedAt?: Date;
}

export class DonatedGoodDto {
  @ApiProperty() id: string;
  @ApiProperty() item: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() quantity: number;
  @ApiPropertyOptional({ nullable: true }) unit: string | null;
  @ApiPropertyOptional({ nullable: true }) estimatedValueCents: number | null;
  @ApiPropertyOptional({ nullable: true }) donorMemberId: string | null;
  @ApiPropertyOptional({ nullable: true }) donorName: string | null;
  @ApiProperty() receivedAt: Date;
  @ApiProperty() recordedByUserId: number;
}

// ─── Costs and the chapter split (EVT-11 / VOL-07) ───────────────────────────

export class CreateEventCostDto {
  @ApiPropertyOptional({ nullable: true, description: 'The chapter that bears it; null is the national pool.' })
  @IsOptional() @ValidateIf((_o, v) => v !== null) @Matches(ID_PATTERN, ID_MESSAGE)
  chapterId?: string | null;
  @ApiProperty({ enum: EVENT_COST_CATEGORIES }) @IsIn(EVENT_COST_CATEGORIES) category: EventCostCategory;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300) description: string;
  @ApiProperty() @IsInt() @Min(1) amountCents: number;
  @ApiProperty({ example: '2027-03-20' }) @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'incurredOn must be YYYY-MM-DD' }) incurredOn: string;
}

export class EventCostDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) chapterId: string | null;
  @ApiPropertyOptional({ nullable: true }) chapterName: string | null;
  @ApiProperty({ enum: EVENT_COST_CATEGORIES }) category: EventCostCategory;
  @ApiProperty() description: string;
  @ApiProperty() amountCents: number;
  @ApiProperty() currency: string;
  @ApiProperty() incurredOn: string;
  @ApiProperty() recordedByUserId: number;
}

export class ChapterFinanceLineDto {
  @ApiPropertyOptional({ nullable: true, description: 'Null is the national pool / no chapter.' }) chapterId: string | null;
  @ApiProperty() chapterName: string;
  @ApiProperty() registrationCount: number;
  @ApiProperty() attendeeCount: number;
  @ApiProperty({ description: 'Billed to this chapter’s households.' }) billedCents: number;
  @ApiProperty({ description: 'Received from this chapter’s households.' }) revenueCents: number;
  @ApiProperty() costCents: number;
  @ApiProperty({ description: 'The volunteer-related part of `costCents` (VOL-07).' }) volunteerCostCents: number;
  @ApiProperty() netCents: number;
}

export class EventFinanceSummaryDto {
  @ApiProperty() currency: string;
  @ApiProperty({ type: [ChapterFinanceLineDto] }) chapters: ChapterFinanceLineDto[];
  @ApiProperty() billedCents: number;
  @ApiProperty() revenueCents: number;
  @ApiProperty() costCents: number;
  @ApiProperty() netCents: number;
}

// ─── Notifications (EVT-07 / EVT-22) ─────────────────────────────────────────

export class NotificationPassDto {
  @ApiProperty() kind: string;
  @ApiProperty() scheduleKey: string;
  @ApiProperty() sent: number;
  @ApiProperty() failed: number;
  @ApiProperty() skippedOptOut: number;
  @ApiProperty({ description: 'Claimed but never confirmed sent — worth a look.' }) claimed: number;
}

export class EventNotificationStatusDto {
  @ApiPropertyOptional({ nullable: true }) invitationCompletedAt: Date | null;
  @ApiProperty({ type: [NotificationPassDto] }) passes: NotificationPassDto[];
}

// ─── Waivers (EVT-05) ────────────────────────────────────────────────────────

export class CreateWaiverTemplateDto {
  @ApiProperty({ example: 'general_liability' })
  @Matches(/^[a-z][a-z0-9_]{2,59}$/, { message: 'key must be lower-case letters, digits and underscores' })
  key: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(160) title: string;
  @ApiProperty() @IsString() @MinLength(20) @MaxLength(40000) body: string;
}

export class PublishWaiverVersionDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(160) title: string;
  @ApiProperty() @IsString() @MinLength(20) @MaxLength(40000) body: string;
}

export class WaiverTemplateDto {
  @ApiProperty() id: string;
  @ApiProperty() key: string;
  @ApiProperty() version: number;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiProperty() isCurrent: boolean;
  @ApiProperty() createdAt: Date;
}

// ─── Top Volunteers (VOL-06) ─────────────────────────────────────────────────

export class TopVolunteerDto {
  @ApiProperty() rank: number;
  @ApiProperty() displayName: string;
  @ApiProperty() isPrivate: boolean;
  @ApiProperty() isYouth: boolean;
  @ApiPropertyOptional({ nullable: true }) chapterName: string | null;
  @ApiProperty() minutes: number;
  @ApiProperty() eventCount: number;
}

export class TopVolunteersResponseDto {
  @ApiProperty({ type: [TopVolunteerDto] }) items: TopVolunteerDto[];
}

// ─── Certificates (REC-07 / REC-08) ──────────────────────────────────────────

export class UploadCertificateDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) title: string;
  @ApiPropertyOptional({ description: 'File it under this child of the member.' }) @IsOptional() @Matches(ID_PATTERN, ID_MESSAGE) childProfileId?: string;
  @ApiPropertyOptional({ description: 'The event it recognises.' }) @IsOptional() @Matches(ID_PATTERN, ID_MESSAGE) eventId?: string;
}

export class CertificateDto {
  @ApiProperty() id: string;
  @ApiProperty() memberId: string;
  @ApiPropertyOptional({ nullable: true }) childProfileId: string | null;
  @ApiPropertyOptional({ nullable: true }) childName: string | null;
  @ApiPropertyOptional({ nullable: true }) eventId: string | null;
  @ApiPropertyOptional({ nullable: true }) eventTitle: string | null;
  @ApiProperty() title: string;
  @ApiProperty() fileName: string;
  @ApiProperty() mimeType: string;
  @ApiProperty() sizeBytes: number;
  @ApiProperty() createdAt: Date;
}
