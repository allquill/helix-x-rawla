import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '@helix-x/backend';
import { Member } from '../entities/member.entity';
import { PORTAL_PERMISSIONS } from '../constants';
import type { MemberDetailDto, MemberSummaryDto } from '../models/member-response.dto';

/** The three privacy tiers of §3.2. */
export type FieldTier = 'self' | 'community' | 'financial';

/**
 * Which tier each member field sits in.
 *
 * Static rather than admin-editable master data: a field's tier changes when
 * the schema changes, not when an administrator changes their mind. What *is*
 * data — and what §3.2 actually means by "visibility is data, not code" — is
 * the member's own per-field override map, which lives on the member row.
 */
const FIELD_TIERS: Record<string, FieldTier> = {
  phone: 'community',
  whatsappPhone: 'community',
  dateOfBirth: 'community',
  weddingDate: 'community',
  familyHistory: 'community',
  education: 'community',
  jobTitle: 'community',
  industry: 'community',
  linkedinUrl: 'community',
  facebookUrl: 'community',
  totalDonationsCents: 'financial',
};

/**
 * The single path through which a member is serialised.
 *
 * §3.2 is explicit that tier checks must not be scattered across controllers —
 * one missed check leaks a member's finances, and the acceptance criterion is
 * that confidential fields are *absent from the payload*, not merely hidden by
 * the client.
 */
@Injectable()
export class ProfileVisibilityService {
  private static canSeeFinancial(viewer: AuthenticatedUser, member: Member): boolean {
    return (
      viewer.id === member.userId ||
      viewer.permissions?.includes(PORTAL_PERMISSIONS.MEMBERS_READ_FINANCIAL) === true
    );
  }

  private static canSeeAll(viewer: AuthenticatedUser, member: Member): boolean {
    return (
      viewer.id === member.userId ||
      viewer.permissions?.includes(PORTAL_PERMISSIONS.MEMBERS_WRITE) === true ||
      viewer.permissions?.includes(PORTAL_PERMISSIONS.REGISTRATION_READ) === true
    );
  }

  /**
   * `visible(field, viewer)` from §3.2 — owner, or an explicit override
   * permission, or a community-tier field the owner has not hidden and whose
   * owner is in the directory.
   */
  private static isVisible(
    field: string,
    viewer: AuthenticatedUser,
    member: Member,
  ): boolean {
    if (viewer.id === member.userId) return true;
    const tier = FIELD_TIERS[field] ?? 'community';
    if (tier === 'financial') return ProfileVisibilityService.canSeeFinancial(viewer, member);
    if (ProfileVisibilityService.canSeeAll(viewer, member)) return true;
    if (!member.directoryOptIn) return false;
    return member.fieldVisibility?.[field] !== 'hidden';
  }

  toSummary(member: Member, email: string): MemberSummaryDto {
    return {
      id: member.id,
      publicMemberId: member.publicMemberId,
      firstName: member.firstName,
      lastName: member.lastName,
      email,
      phone: member.phone,
      status: member.status,
      isEmailVerified: member.isEmailVerified,
      isApproved: member.isApproved,
      isPaymentMade: member.isPaymentMade,
      isActive: member.isActive,
      membershipTier: member.membershipTier,
      chapterId: member.chapterId,
      gotra: member.gotra,
      caste: member.caste,
      thikana: member.thikana,
      passwordSetAt: member.passwordSetAt,
      createdAt: member.createdAt,
    };
  }

  /**
   * Build the detail payload, omitting anything the viewer may not see.
   *
   * Fields are deleted from the object rather than nulled, so a client cannot
   * infer that a hidden value exists.
   */
  toDetail(
    member: Member,
    email: string,
    viewer: AuthenticatedUser,
    extras: { references?: MemberDetailDto['references']; totalDonationsCents?: number } = {},
  ): MemberDetailDto {
    const detail: MemberDetailDto = {
      ...this.toSummary(member, email),
      middleName: member.middleName,
      honorific: member.honorific,
      gender: member.gender,
      dateOfBirth: member.dateOfBirth,
      sasural: member.sasural,
      nanihal: member.nanihal,
      languages: member.languages,
      familyHistory: member.familyHistory,
      industry: member.industry,
      jobTitle: member.jobTitle,
      skills: member.skills,
      education: member.education,
      linkedinUrl: member.socialLinksApproved ? member.linkedinUrl : null,
      facebookUrl: member.socialLinksApproved ? member.facebookUrl : null,
      householdId: member.householdId,
      relationship: member.relationship,
      weddingDate: member.weddingDate,
      rejectionReason: member.rejectionReason,
      infoRequestMessage: member.infoRequestMessage,
      offlineVerification: member.offlineVerification,
      references: extras.references,
      reviewerNotes: member.reviewerNotes,
      approvedAt: member.approvedAt,
      activatedAt: member.activatedAt,
      paymentOverrideReason: member.paymentOverrideReason,
      totalDonationsCents: extras.totalDonationsCents,
    };

    // One mutable view of the payload; `MemberDetailDto` has no index
    // signature, so the cast goes through `unknown`.
    const bag = detail as unknown as Record<string, unknown>;

    for (const field of Object.keys(FIELD_TIERS)) {
      if (!ProfileVisibilityService.isVisible(field, viewer, member)) {
        delete bag[field];
      }
    }

    // Vetting internals are for reviewers, never for other members.
    if (!ProfileVisibilityService.canSeeAll(viewer, member)) {
      for (const field of [
        'reviewerNotes',
        'references',
        'rejectionReason',
        'infoRequestMessage',
        'paymentOverrideReason',
      ]) {
        delete bag[field];
      }
    }

    return detail;
  }
}
