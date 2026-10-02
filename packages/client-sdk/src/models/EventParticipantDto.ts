/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EventParticipantDto = {
    displayName: string;
    /**
     * The person is not in the directory; the name is withheld.
     */
    isPrivate: boolean;
    chapterName?: string | null;
    isVolunteer: boolean;
    /**
     * Groups a household together; opaque.
     */
    householdKey: string;
};

