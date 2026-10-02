/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EventCostDto = {
    id: string;
    chapterId?: string | null;
    chapterName?: string | null;
    category: EventCostDto.category;
    description: string;
    amountCents: number;
    currency: string;
    incurredOn: string;
    recordedByUserId: number;
};
export namespace EventCostDto {
    export enum category {
        VENUE = 'venue',
        FOOD = 'food',
        VOLUNTEER = 'volunteer',
        SUPPLIES = 'supplies',
        OTHER = 'other',
    }
}

