/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateDonatedGoodDto = {
    item: string;
    description?: string;
    quantity: number;
    unit?: string;
    estimatedValueCents?: number | null;
    /**
     * The donating member, when they are one.
     */
    donorMemberId?: string | null;
    donorName?: string;
    receivedAt?: string;
};

