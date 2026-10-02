/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttendeeDto } from './AttendeeDto';
import type { EventPaymentDto } from './EventPaymentDto';
export type EventRegistrationDto = {
    id: string;
    eventId: string;
    status: EventRegistrationDto.status;
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
};
export namespace EventRegistrationDto {
    export enum status {
        PENDING_PAYMENT = 'pending_payment',
        CONFIRMED = 'confirmed',
        CANCELLED = 'cancelled',
        REMOVED_BY_ADMIN = 'removed_by_admin',
    }
}

