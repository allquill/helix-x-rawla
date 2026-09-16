/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GateSnapshotDto } from './GateSnapshotDto';
export type RegistrationSubmittedDto = {
    memberId: string;
    status: RegistrationSubmittedDto.status;
    gates: GateSnapshotDto;
    message: string;
};
export namespace RegistrationSubmittedDto {
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

