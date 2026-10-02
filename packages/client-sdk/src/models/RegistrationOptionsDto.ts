/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EventDetailDto } from './EventDetailDto';
import type { ReferenceOptionDto } from './ReferenceOptionDto';
import type { RegistrationPersonDto } from './RegistrationPersonDto';
import type { SlotDto } from './SlotDto';
import type { WaiverForSigningDto } from './WaiverForSigningDto';
export type RegistrationOptionsDto = {
    event: EventDetailDto;
    registrationOpen: boolean;
    registrationClosedCode?: string | null;
    registrationClosedMessage?: string | null;
    /**
     * Seats left; null is "No maximum".
     */
    remainingCapacity?: number | null;
    people: Array<RegistrationPersonDto>;
    waiver?: WaiverForSigningDto | null;
    slots: Array<SlotDto>;
    dietaryOptions: Array<ReferenceOptionDto>;
    tshirtOptions: Array<ReferenceOptionDto>;
    /**
     * Set when the household already holds a live registration.
     */
    existingRegistrationId?: string | null;
};

