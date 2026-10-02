/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateEventDto = {
    title?: string;
    category?: UpdateEventDto.category;
    description?: string | null;
    chapterId?: string | null;
    venue?: string | null;
    startsAt?: string;
    endsAt?: string;
    timezone?: string;
    capacity?: number | null;
    registrationClosesOn?: string;
    attireGuide?: string | null;
    waiverTemplateId?: string | null;
    collectTshirt?: boolean;
    collectHotel?: boolean;
    reminderOffsetsDays?: Array<number> | null;
    stripePaymentLink?: string | null;
    zelleInstructions?: string | null;
};
export namespace UpdateEventDto {
    export enum category {
        MEL = 'mel',
        ANNUAL_CHAPTER = 'annual_chapter',
        LOCAL_CHARITY = 'local_charity',
    }
}

