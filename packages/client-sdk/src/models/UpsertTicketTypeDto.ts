/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpsertTicketTypeDto = {
    name: string;
    minAge?: number | null;
    maxAge?: number | null;
    /**
     * Minor units; 0 is free.
     */
    priceCents: number;
    earlyBirdPriceCents?: number | null;
    earlyBirdEndsAt?: string | null;
    sortOrder?: number;
    isActive?: boolean;
};

