/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MemberSummaryDto = {
    id: string;
    publicMemberId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: MemberSummaryDto.status;
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
};
export namespace MemberSummaryDto {
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

