import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MEMBER_STATUSES, type MemberStatus } from '../constants';

/** Row shape for the member and registration-queue tables. */
export class MemberSummaryDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() publicMemberId?: string | null;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() email: string;
  @ApiProperty() phone: string;
  @ApiProperty({ enum: MEMBER_STATUSES }) status: MemberStatus;
  @ApiProperty() isEmailVerified: boolean;
  @ApiProperty() isApproved: boolean;
  @ApiProperty() isPaymentMade: boolean;
  @ApiProperty() isActive: boolean;
  @ApiProperty() membershipTier: string;
  @ApiPropertyOptional() chapterId?: string | null;
  @ApiProperty() gotra: string;
  @ApiProperty() caste: string;
  @ApiProperty() thikana: string;
  @ApiPropertyOptional() passwordSetAt?: Date | null;
  @ApiProperty() createdAt: Date;
}

export class ListMembersResponseDto {
  @ApiProperty({ type: [MemberSummaryDto] }) items: MemberSummaryDto[];
  @ApiProperty() total: number;
}

export class MemberReferenceDto {
  @ApiProperty() sequence: number;
  @ApiProperty() name: string;
  @ApiProperty() phone: string;
  @ApiProperty() isVerified: boolean;
}

/** The linked spouse record (`Spouse profile` tab, MP-17). */
export class MemberSpouseDto {
  @ApiProperty() firstName: string;
  @ApiPropertyOptional() middleName?: string | null;
  @ApiProperty() lastName: string;
  @ApiPropertyOptional() caste?: string | null;
  @ApiPropertyOptional() gotra?: string | null;
  @ApiPropertyOptional() thikana?: string | null;
  @ApiPropertyOptional() nanihal?: string | null;
  @ApiPropertyOptional() email?: string | null;
  @ApiPropertyOptional() phone?: string | null;
  @ApiPropertyOptional() dateOfBirth?: string | null;
  @ApiPropertyOptional() industry?: string | null;
  @ApiPropertyOptional() education?: string | null;
}

/** One linked child record (`Child profile` tab, MP-18), in sibling order. */
export class MemberChildDto {
  @ApiProperty() id: string;
  @ApiProperty() sequence: number;
  @ApiProperty() firstName: string;
  @ApiPropertyOptional() middleName?: string | null;
  @ApiProperty() lastName: string;
  @ApiPropertyOptional() gender?: string | null;
  @ApiProperty() dateOfBirth: string;
  @ApiPropertyOptional() educationLevel?: string | null;
  @ApiPropertyOptional() achievements?: string | null;
  @ApiProperty() membershipTier: string;
}

export class MemberDetailDto extends MemberSummaryDto {
  @ApiPropertyOptional() middleName?: string | null;
  @ApiPropertyOptional() honorific?: string | null;
  @ApiProperty() gender: string;
  @ApiProperty() dateOfBirth: string;
  @ApiPropertyOptional() sasural?: string | null;
  @ApiPropertyOptional() nanihal?: string | null;
  @ApiPropertyOptional({ type: [String] }) languages?: string[] | null;
  @ApiPropertyOptional() familyHistory?: string | null;
  @ApiPropertyOptional() industry?: string | null;
  @ApiPropertyOptional() jobTitle?: string | null;
  @ApiPropertyOptional({ type: [String] }) skills?: string[] | null;
  @ApiPropertyOptional() education?: string | null;
  @ApiPropertyOptional() linkedinUrl?: string | null;
  @ApiPropertyOptional() facebookUrl?: string | null;
  @ApiProperty() householdId: string;
  @ApiProperty() relationship: string;
  @ApiPropertyOptional() weddingDate?: string | null;
  @ApiPropertyOptional() rejectionReason?: string | null;
  @ApiPropertyOptional() infoRequestMessage?: string | null;
  @ApiPropertyOptional() offlineVerification?: boolean;
  @ApiPropertyOptional({ type: [MemberReferenceDto] }) references?: MemberReferenceDto[];

  /**
   * Household members. Visible to the record owner and to reviewers only —
   * children are minors, so they stay out of the community tier until the
   * youth rules (gap #2) are settled.
   */
  @ApiPropertyOptional({ type: MemberSpouseDto, nullable: true }) spouse?: MemberSpouseDto | null;
  @ApiPropertyOptional({ type: [MemberChildDto] }) children?: MemberChildDto[];
  @ApiPropertyOptional() reviewerNotes?: string | null;
  @ApiPropertyOptional() approvedAt?: Date | null;
  @ApiPropertyOptional() activatedAt?: Date | null;
  @ApiPropertyOptional() paymentOverrideReason?: string | null;

  /**
   * Lifetime giving. Tier 3 — present only for the record owner and viewers
   * holding `members:read.financial` (MP-15). Absent from the payload
   * otherwise, never merely hidden by the client.
   */
  @ApiPropertyOptional() totalDonationsCents?: number;
}
