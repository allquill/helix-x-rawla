import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectRegistrationDto {
  @ApiProperty({ description: 'Shown to the applicant, so write it for them to read.' })
  @IsString() @MinLength(3) @MaxLength(1000)
  reason: string;
}

export class RequestRegistrationInfoDto {
  @ApiProperty({ description: 'What the applicant needs to provide.' })
  @IsString() @MinLength(3) @MaxLength(1000)
  message: string;
}

/**
 * REG-16. The reason is required, not optional: this flag decides whether
 * someone can use the portal, and a change to it with no recorded rationale is
 * indistinguishable from a mistake.
 */
export class SetPaymentStatusDto {
  @ApiProperty() @IsBoolean() isPaymentMade: boolean;

  @ApiProperty({ example: 'Cheque #1042 received 2026-09-02' })
  @IsString() @MinLength(3) @MaxLength(500)
  reason: string;
}

export class OverrideEmailVerificationDto {
  @ApiProperty({ example: 'Onboarded in person at the Austin chapter meet' })
  @IsString() @MinLength(3) @MaxLength(500)
  reason: string;
}

export class ArchiveMemberDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
