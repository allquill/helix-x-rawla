/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TicketTypeDto } from './TicketTypeDto';
export type EventDetailDto = {
    id: string;
    title: string;
    category: EventDetailDto.category;
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
    status: EventDetailDto.status;
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
    description?: string | null;
    attireGuide?: string | null;
    stripePaymentLink?: string | null;
    zelleInstructions?: string | null;
    photosUrl?: string | null;
    flyerName?: string | null;
    hasWaiver: boolean;
    hasSlots: boolean;
    collectTshirt: boolean;
    collectHotel: boolean;
    ticketTypes: Array<TicketTypeDto>;
    publishedAt?: string | null;
    closedAt?: string | null;
};
export namespace EventDetailDto {
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

