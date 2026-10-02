/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateEventDto = {
    title: string;
    category: CreateEventDto.category;
    /**
     * Optional for smaller events (EVT-17).
     */
    description?: string | null;
    /**
     * Sponsoring chapter; omit for a national event.
     */
    chapterId?: string | null;
    venue?: string | null;
    startsAt: string;
    endsAt: string;
    /**
     * IANA time zone; defaults to the portal setting.
     */
    timezone?: string;
    /**
     * Maximum participants; null is "No maximum".
     */
    capacity?: number | null;
    /**
     * The last day to register (EVT-18).
     */
    registrationClosesOn: string;
    currency?: string;
    attireGuide?: string | null;
    /**
     * Waiver every attendee signs; null for none.
     */
    waiverTemplateId?: string | null;
    collectTshirt?: boolean;
    collectHotel?: boolean;
    /**
     * Days before the start a reminder is sent; null uses the portal setting.
     */
    reminderOffsetsDays?: Array<number> | null;
    stripePaymentLink?: string | null;
    zelleInstructions?: string | null;
};
export namespace CreateEventDto {
    export enum category {
        MEL = 'mel',
        ANNUAL_CHAPTER = 'annual_chapter',
        LOCAL_CHARITY = 'local_charity',
    }
}

