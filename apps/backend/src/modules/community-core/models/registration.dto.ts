import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { GENDERS, type Gender } from '../constants';

/** E.164, e.g. +14155550123. Broadcast targets have to be dialable. */
const E164 = /^\+[1-9]\d{6,14}$/;

export class RegistrationSpouseDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) firstName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) middleName?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caste?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gotra?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() thikana?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nanihal?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(E164, { message: 'Phone must be in E.164 format, e.g. +14155550123.' }) phone?: string;
  @ApiPropertyOptional({ example: '1990-04-12' }) @IsOptional() @IsISO8601() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() education?: string;
}

export class RegistrationChildDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) firstName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) middleName?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) lastName: string;
  @ApiPropertyOptional({ enum: GENDERS }) @IsOptional() @IsIn(GENDERS as unknown as string[]) gender?: Gender;
  @ApiProperty({ example: '2015-08-03' }) @IsISO8601() dateOfBirth: string;
  @ApiProperty({ example: 1 }) @IsInt() sequence: number;
  @ApiPropertyOptional() @IsOptional() @IsString() educationLevel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() achievements?: string;
}

export class RegistrationReferenceDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) name: string;
  @ApiProperty({ example: '+14155550123' })
  @Matches(E164, { message: 'Reference phone must be in E.164 format.' })
  phone: string;
}

/**
 * The public registration payload (REG-01).
 *
 * Note what is *not* here: a password. IAM-01 requires credentials to be set
 * through a link emailed after submission, never chosen inline on a public
 * form, so that a password is only ever created once control of the address has
 * been proven.
 */
export class SubmitRegistrationDto {
  // ─── Account ──────────────────────────────────────────────────────────────
  @ApiProperty({ example: 'kunwar@example.com' }) @IsEmail() email: string;

  // ─── Biographical ─────────────────────────────────────────────────────────
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) firstName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) middleName?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() honorific?: string;
  @ApiProperty({ enum: GENDERS }) @IsIn(GENDERS as unknown as string[]) gender: Gender;

  @ApiProperty({ example: '1985-02-20', description: 'ISO date. Checked against the configured minimum age.' })
  @IsISO8601()
  dateOfBirth: string;

  // ─── Cultural (§3.4) ──────────────────────────────────────────────────────
  @ApiProperty() @IsString() @MinLength(1) thikana: string;
  @ApiProperty() @IsString() @MinLength(1) gotra: string;
  @ApiProperty({ description: 'Rajput caste / sub-clan — distinct from Gotra.' }) @IsString() @MinLength(1) caste: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sasural?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nanihal?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) languages?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() familyHistory?: string;

  // ─── Contact ──────────────────────────────────────────────────────────────
  @ApiProperty({ example: '+14155550123' })
  @Matches(E164, { message: 'Phone must be in E.164 format, e.g. +14155550123.' })
  phone: string;

  @ApiPropertyOptional({ example: '+14155550123' })
  @IsOptional()
  @Matches(E164, { message: 'WhatsApp number must be in E.164 format.' })
  whatsappPhone?: string;

  @ApiProperty() @IsString() @MinLength(1) addressLine1: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine2?: string;
  @ApiProperty() @IsString() @MinLength(1) city: string;
  @ApiProperty({ example: 'TX', description: 'Two-letter state code; drives chapter auto-assignment.' })
  @IsString() @MinLength(2) @MaxLength(2) stateCode: string;
  @ApiProperty({ example: '78701' }) @IsString() @MinLength(3) postalCode: string;

  // ─── Household ────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: '2010-11-30' }) @IsOptional() @IsISO8601() weddingDate?: string;

  @ApiPropertyOptional({ type: RegistrationSpouseDto })
  @IsOptional() @ValidateNested() @Type(() => RegistrationSpouseDto)
  spouse?: RegistrationSpouseDto;

  @ApiPropertyOptional({ type: [RegistrationChildDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(10)
  @ValidateNested({ each: true }) @Type(() => RegistrationChildDto)
  children?: RegistrationChildDto[];

  // ─── Professional ─────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jobTitle?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() education?: string;

  // ─── Membership ───────────────────────────────────────────────────────────
  @ApiProperty({ example: 'annual' }) @IsString() @MinLength(1) membershipTier: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) volunteerInterests?: string[];

  // ─── Vetting (REG-05 / REG-06) ────────────────────────────────────────────
  @ApiPropertyOptional({ type: [RegistrationReferenceDto], description: 'Two vouching Rawla members, unless supplied offline.' })
  @IsOptional() @IsArray() @ArrayMaxSize(2)
  @ValidateNested({ each: true }) @Type(() => RegistrationReferenceDto)
  references?: RegistrationReferenceDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  offlineVerification?: boolean;

  // ─── Consent (REG-03) ─────────────────────────────────────────────────────
  @ApiProperty({ description: 'Must be true — the accepted version is recorded.' })
  @IsBoolean() acceptCommunityGuidelines: boolean;

  @ApiProperty({ description: 'Must be true — the accepted version is recorded.' })
  @IsBoolean() acceptPrivacyPolicy: boolean;

  /**
   * Proceed despite a phone number already on file (REG-02).
   *
   * Phones are shared within a household, so a duplicate phone is a warning the
   * applicant can acknowledge. A duplicate *email* is always a hard block — it
   * is the login identity.
   */
  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  acknowledgeDuplicatePhone?: boolean;
}

export class CheckRegistrationDuplicateDto {
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
}
