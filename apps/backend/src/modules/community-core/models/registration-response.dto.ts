import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GATE_CODES, MEMBER_STATUSES, type GateCode, type MemberStatus } from '../constants';

/** Progress through the three activation gates (§6.1). */
export class GateSnapshotDto {
  @ApiProperty() emailVerified: boolean;
  @ApiProperty() approved: boolean;
  @ApiProperty() paymentMade: boolean;
}

export class RegistrationSubmittedDto {
  @ApiProperty() memberId: string;
  @ApiProperty({ enum: MEMBER_STATUSES }) status: MemberStatus;
  @ApiProperty({ type: GateSnapshotDto }) gates: GateSnapshotDto;
  @ApiProperty() message: string;
}

export class DuplicateProbeDto {
  @ApiProperty({ description: 'True when the email is already registered — a hard block.' })
  emailTaken: boolean;

  @ApiProperty({ description: 'True when the phone is on file. A warning, not a block: households share numbers.' })
  phoneSeen: boolean;

  @ApiProperty({ enum: ['proceed', 'recover', 'acknowledge'] })
  action: 'proceed' | 'recover' | 'acknowledge';
}

export class MembershipTierOptionDto {
  @ApiProperty() value: string;
  @ApiProperty() label: string;
  @ApiProperty({ description: 'Dues in minor units. Zero for tiers that do not pay.' })
  duesCents: number;
  @ApiProperty() currency: string;
}

export class ReferenceOptionDto {
  @ApiProperty() value: string;
  @ApiProperty() label: string;
}

/** Everything the public form needs so the client and server cannot disagree. */
export class PublicRegistrationConfigDto {
  @ApiProperty({ example: 18 }) minimumAge: number;
  @ApiProperty() paymentRequired: boolean;
  @ApiProperty() consentVersion: string;
  @ApiProperty({ type: [MembershipTierOptionDto] }) membershipTiers: MembershipTierOptionDto[];
  @ApiProperty({ description: 'Admin-maintained dropdowns, keyed by list.', type: Object })
  referenceLists: Record<string, ReferenceOptionDto[]>;
}

/** The member's own view of where they stand (REG-13, MP §4.4). */
export class MemberStatusDto {
  @ApiProperty() memberId: string;
  @ApiProperty({ enum: MEMBER_STATUSES }) status: MemberStatus;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ type: GateSnapshotDto }) gates: GateSnapshotDto;
  @ApiPropertyOptional({ enum: GATE_CODES, description: 'The one gate to act on next; null when active.' })
  blockedBy?: GateCode | null;
  @ApiPropertyOptional() message?: string | null;
  @ApiPropertyOptional() infoRequest?: string | null;
  @ApiPropertyOptional() rejectionReason?: string | null;
  @ApiPropertyOptional() publicMemberId?: string | null;
  @ApiPropertyOptional() membershipTier?: string;
  @ApiPropertyOptional() duesCents?: number;
}
