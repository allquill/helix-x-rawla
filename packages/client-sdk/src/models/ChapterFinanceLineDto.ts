/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ChapterFinanceLineDto = {
    /**
     * Null is the national pool / no chapter.
     */
    chapterId?: string | null;
    chapterName: string;
    registrationCount: number;
    attendeeCount: number;
    /**
     * Billed to this chapter’s households.
     */
    billedCents: number;
    /**
     * Received from this chapter’s households.
     */
    revenueCents: number;
    costCents: number;
    /**
     * The volunteer-related part of `costCents` (VOL-07).
     */
    volunteerCostCents: number;
    netCents: number;
};

