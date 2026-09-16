import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpsertChapterDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(80) name: string;
  @ApiProperty({ example: 'TX' }) @IsString() @MinLength(2) @MaxLength(16) code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() leadUserId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpsertStateChapterMappingDto {
  @ApiProperty({ example: 'TX' }) @IsString() @MinLength(2) @MaxLength(2) stateCode: string;
  @ApiProperty() @IsString() chapterId: string;
}

export class UpsertReferenceValueDto {
  @ApiProperty() @IsString() @MinLength(1) value: string;
  @ApiProperty() @IsString() @MinLength(1) label: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ description: 'For membership_tier: { duesCents, currency }.' })
  @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * A batch of settings, submitted as key → value.
 *
 * Values are strings because `portal_settings` stores them that way; the reader
 * coerces per key. That is what lets a new lever be a seed row rather than a
 * migration plus a DTO change.
 */
export class UpdatePortalSettingsDto {
  @ApiProperty({ type: Object, example: { 'registration.minimum_age': '18' } })
  @IsObject()
  values: Record<string, string>;
}

export class PortalSettingDto {
  @ApiProperty() key: string;
  @ApiProperty() value: string;
  @ApiProperty() valueType: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiPropertyOptional() updatedByUserId?: number | null;
  @ApiProperty() updatedAt: Date;
}

export class AuditLogEntryDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() actorUserId?: number | null;
  @ApiProperty() action: string;
  @ApiProperty() entityType: string;
  @ApiPropertyOptional() entityId?: string | null;
  @ApiPropertyOptional({ type: Object }) before?: Record<string, unknown> | null;
  @ApiPropertyOptional({ type: Object }) after?: Record<string, unknown> | null;
  @ApiPropertyOptional() reason?: string | null;
  @ApiProperty() createdAt: Date;
}

export class ListAuditLogResponseDto {
  @ApiProperty({ type: [AuditLogEntryDto] }) items: AuditLogEntryDto[];
  @ApiProperty() total: number;
}

export class ChapterDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() code: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiPropertyOptional() leadUserId?: number | null;
  @ApiPropertyOptional() contactEmail?: string | null;
  @ApiProperty() isActive: boolean;
}

export class StateChapterMappingDto {
  @ApiProperty() stateCode: string;
  @ApiProperty() chapterId: string;
}

export class ReferenceListValueDto {
  @ApiProperty() id: string;
  @ApiProperty() value: string;
  @ApiProperty() label: string;
  @ApiProperty() sortOrder: number;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional({ type: Object }) metadata?: Record<string, unknown> | null;
}

export class ReferenceListDto {
  @ApiProperty() key: string;
  @ApiProperty() label: string;
  @ApiProperty({ type: [ReferenceListValueDto] }) values: ReferenceListValueDto[];
}
