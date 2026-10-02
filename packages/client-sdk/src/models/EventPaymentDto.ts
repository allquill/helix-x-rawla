/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EventPaymentDto = {
    id: string;
    amountCents: number;
    currency: string;
    method: EventPaymentDto.method;
    status: EventPaymentDto.status;
    reference?: string | null;
    note?: string | null;
    recordedByUserId?: number | null;
    settledAt?: string | null;
    createdAt: string;
};
export namespace EventPaymentDto {
    export enum method {
        STRIPE = 'stripe',
        CONSOLE = 'console',
        ZELLE = 'zelle',
        OTHER = 'other',
    }
    export enum status {
        PENDING = 'pending',
        SETTLED = 'settled',
        EXPIRED = 'expired',
    }
}

