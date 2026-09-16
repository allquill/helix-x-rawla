/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MemberReferenceDto } from './MemberReferenceDto';
export type MemberDetailDto = {
    id: string;
    publicMemberId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: MemberDetailDto.status;
    isEmailVerified: boolean;
    isApproved: boolean;
    isPaymentMade: boolean;
    isActive: boolean;
    membershipTier: string;
    chapterId?: string;
    gotra: string;
    caste: string;
    thikana: string;
    passwordSetAt?: string;
    createdAt: string;
    middleName?: string;
    honorific?: string;
    gender: string;
    dateOfBirth: string;
    sasural?: string;
    nanihal?: string;
    languages?: Array<string>;
    familyHistory?: string;
    industry?: string;
    jobTitle?: string;
    skills?: Array<string>;
    education?: string;
    linkedinUrl?: string;
    facebookUrl?: string;
    householdId: string;
    relationship: string;
    weddingDate?: string;
    rejectionReason?: string;
    infoRequestMessage?: string;
    offlineVerification?: boolean;
    references?: Array<MemberReferenceDto>;
    reviewerNotes?: string;
    approvedAt?: string;
    activatedAt?: string;
    paymentOverrideReason?: string;
    totalDonationsCents?: number;
};
export namespace MemberDetailDto {
    export enum status {
        PENDING_EMAIL_VERIFICATION = 'pending_email_verification',
        PENDING = 'pending',
        IN_REVIEW = 'in_review',
        INFO_REQUESTED = 'info_requested',
        REJECTED = 'rejected',
        APPROVED_AWAITING_PAYMENT = 'approved_awaiting_payment',
        ACTIVE = 'active',
        ACTIVE_SECURED = 'active_secured',
        ARCHIVED = 'archived',
    }
}

