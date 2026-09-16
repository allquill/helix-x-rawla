/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GateSnapshotDto } from './GateSnapshotDto';
export type MemberStatusDto = {
    memberId: string;
    status: MemberStatusDto.status;
    isActive: boolean;
    gates: GateSnapshotDto;
    /**
     * The one gate to act on next; null when active.
     */
    blockedBy?: MemberStatusDto.blockedBy;
    message?: string;
    infoRequest?: string;
    rejectionReason?: string;
    publicMemberId?: string;
    membershipTier?: string;
    duesCents?: number;
};
export namespace MemberStatusDto {
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
    /**
     * The one gate to act on next; null when active.
     */
    export enum blockedBy {
        INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
        ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
        ACCOUNT_ARCHIVED = 'ACCOUNT_ARCHIVED',
        REGISTRATION_REJECTED = 'REGISTRATION_REJECTED',
        EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
        INFO_REQUESTED = 'INFO_REQUESTED',
        ACCOUNT_PENDING_APPROVAL = 'ACCOUNT_PENDING_APPROVAL',
        PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
    }
}

