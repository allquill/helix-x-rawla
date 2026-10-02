/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TicketTypeDto = {
    id: string;
    name: string;
    minAge?: number | null;
    maxAge?: number | null;
    priceCents: number;
    earlyBirdPriceCents?: number | null;
    earlyBirdEndsAt?: string | null;
    sortOrder: number;
    isActive: boolean;
    /**
     * The price in force right now.
     */
    currentPriceCents: number;
    currentTier: TicketTypeDto.currentTier;
};
export namespace TicketTypeDto {
    export enum currentTier {
        EARLY_BIRD = 'early_bird',
        STANDARD = 'standard',
    }
}

