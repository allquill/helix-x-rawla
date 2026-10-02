/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttendeeInputDto } from './AttendeeInputDto';
export type CreateRegistrationDto = {
    attendees: Array<AttendeeInputDto>;
    /**
     * Required when the event has a waiver (EVT-05).
     */
    waiverAccepted?: boolean;
    /**
     * The signer types their full name.
     */
    waiverSignedName?: string;
};

