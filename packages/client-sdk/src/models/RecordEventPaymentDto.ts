/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RecordEventPaymentDto = {
    /**
     * Amount received, in minor units.
     */
    amountCents: number;
    method: RecordEventPaymentDto.method;
    /**
     * Zelle confirmation, cheque number…
     */
    reference?: string;
    note?: string;
};
export namespace RecordEventPaymentDto {
    export enum method {
        ZELLE = 'zelle',
        OTHER = 'other',
    }
}

