import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmpty,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const E164 = /^\+[1-9]\d{6,14}$/;

/**
 * Editable member fields.
 *
 * The three gate flags and `isActive` are absent by design — they are derived
 * or admin-decision fields, and with `forbidNonWhitelisted` on the route a
 * request that tries to set one is rejected with 400 rather than silently
 * stripped.
 */
export class UpdateMemberDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) middleName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() honorific?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() thikana?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gotra?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caste?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sasural?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nanihal?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) languages?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() familyHistory?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(E164, { message: 'Phone must be in international format, e.g. +14155550123.' }) phone?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(E164, { message: 'WhatsApp must be in international format, e.g. +14155550123.' }) whatsappPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() weddingDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jobTitle?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() education?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() linkedinUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() facebookUrl?: string;
  @ApiPropertyOptional({ description: 'MP-09: social links appear only with the member\'s consent.' })
  @IsOptional() @IsBoolean() socialLinksApproved?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) volunteerInterests?: string[];

  /** Admin-only; ignored on the self-service route. */
  @ApiPropertyOptional() @IsOptional() @IsString() membershipTier?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chapterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reviewerNotes?: string;

  // ─── Derived and decision fields: declared only to be refused ─────────────
  //
  // Leaving them off the DTO is not enough. The global pipe whitelists rather
  // than forbids, so an undeclared `isActive` is silently stripped and the
  // caller gets a 200 having changed nothing — believing they succeeded.
  // Declaring them with `@IsEmpty()` turns the same request into the 400 the
  // requirement asks for, and documents in Swagger why.

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Read-only. Derived from the three activation gates; rejected if sent.',
  })
  @IsEmpty({
    message:
      'isActive is derived from the activation gates and cannot be set directly.',
  })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Read-only. Set only by an approval decision.' })
  @IsEmpty({ message: 'isApproved is set by the approval endpoint, not by a profile edit.' })
  isApproved?: boolean;

  @ApiPropertyOptional({ description: 'Read-only. Set only by the dues flow or an audited override.' })
  @IsEmpty({
    message:
      'isPaymentMade is set by the payment-status endpoint, which requires a reason.',
  })
  isPaymentMade?: boolean;

  @ApiPropertyOptional({ description: 'Read-only. Set only by the verification flow or an audited override.' })
  @IsEmpty({
    message:
      'isEmailVerified is set by the verification flow, not by a profile edit.',
  })
  isEmailVerified?: boolean;
}

export class UpdateMemberPrivacyDto {
  @ApiPropertyOptional({ description: 'Global directory opt-out (MP-19).' })
  @IsOptional() @IsBoolean()
  directoryOptIn?: boolean;

  @ApiPropertyOptional({ type: Object, example: { phone: 'hidden' } })
  @IsOptional() @IsObject()
  fieldVisibility?: Record<string, 'visible' | 'hidden'>;
}
