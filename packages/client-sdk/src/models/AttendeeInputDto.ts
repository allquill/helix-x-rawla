/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AttendeeInputDto = {
    /**
     * A `personKey` from the registration options.
     */
    personKey: string;
    dietaryPref?: string | null;
    dietaryNotes?: string | null;
    tshirtSize?: string | null;
    hotelDetails?: string | null;
    /**
     * This person will volunteer at the event (VOL-10).
     */
    isVolunteer?: boolean;
    /**
     * Time slots to book for this person (EVT-03).
     */
    slotIds?: Array<string>;
};

