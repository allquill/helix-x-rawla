/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ClosePreviewDto = {
    canClose: boolean;
    code?: string | null;
    missingHoursAttendeeIds: Array<string>;
    volunteerCount: number;
    /**
     * Live registrations with a balance still owing.
     */
    unpaidRegistrationCount: number;
    outstandingCents: number;
    /**
     * Documents that become finance-restricted at close.
     */
    documentCount: number;
};

