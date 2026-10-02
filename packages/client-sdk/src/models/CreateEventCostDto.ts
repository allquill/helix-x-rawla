/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateEventCostDto = {
    /**
     * The chapter that bears it; null is the national pool.
     */
    chapterId?: string | null;
    category: CreateEventCostDto.category;
    description: string;
    amountCents: number;
    incurredOn: string;
};
export namespace CreateEventCostDto {
    export enum category {
        VENUE = 'venue',
        FOOD = 'food',
        VOLUNTEER = 'volunteer',
        SUPPLIES = 'supplies',
        OTHER = 'other',
    }
}

