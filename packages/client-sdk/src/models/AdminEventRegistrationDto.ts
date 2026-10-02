/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttendeeDto } from './AttendeeDto';
import type { EventPaymentDto } from './EventPaymentDto';
export type AdminEventRegistrationDto = {
    id: string;
    eventId: string;
    status: AdminEventRegistrationDto.status;
    totalCents: number;
    paidCents: number;
    balanceCents: number;
    currency: string;
    /**
     * Whether the member may cancel it themselves (EVT-23).
     */
    canCancel: boolean;
    cancelBlockedCode?: string | null;
    attendees: Array<AttendeeDto>;
    payments: Array<EventPaymentDto>;
    createdAt: string;
    householdId: string;
    purchaserMemberId: string;
    purchaserName: string;
    purchaserEmail?: string | null;
    chapterId?: string | null;
    removedReason?: string | null;
    removedAt?: string | null;
    removedByUserId?: number | null;
};
export namespace AdminEventRegistrationDto {
    export enum status {
        PENDING_PAYMENT = 'pending_payment',
        CONFIRMED = 'confirmed',
        CANCELLED = 'cancelled',
        REMOVED_BY_ADMIN = 'removed_by_admin',
    }
}

