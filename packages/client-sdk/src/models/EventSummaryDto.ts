/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EventSummaryDto = {
    id: string;
    title: string;
    category: EventSummaryDto.category;
    chapterId?: string | null;
    chapterName?: string | null;
    venue?: string | null;
    startsAt: string;
    endsAt: string;
    timezone: string;
    /**
     * Null is "No maximum".
     */
    capacity?: number | null;
    attendeeCount: number;
    registrationClosesOn: string;
    status: EventSummaryDto.status;
    currency: string;
    hasFlyer: boolean;
    /**
     * So a list can show an image flyer as a thumbnail without downloading a PDF to find out.
     */
    flyerMimeType?: string | null;
    registrationOpen: boolean;
    /**
     * Why registration is not open.
     */
    registrationClosedCode?: string | null;
    /**
     * Lowest current ticket price; null with no tickets.
     */
    fromPriceCents?: number | null;
};
export namespace EventSummaryDto {
    export enum category {
        MEL = 'mel',
        ANNUAL_CHAPTER = 'annual_chapter',
        LOCAL_CHARITY = 'local_charity',
    }
    export enum status {
        DRAFT = 'draft',
        PUBLISHED = 'published',
        CLOSED = 'closed',
    }
}

