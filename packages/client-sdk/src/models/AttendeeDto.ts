/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttendeeSlotDto } from './AttendeeSlotDto';
export type AttendeeDto = {
    id: string;
    personKey: string;
    personType: AttendeeDto.personType;
    fullName: string;
    isYouth: boolean;
    ticketTypeName: string;
    unitPriceCents: number;
    pricingTier: AttendeeDto.pricingTier;
    dietaryPref?: string | null;
    dietaryNotes?: string | null;
    tshirtSize?: string | null;
    hotelDetails?: string | null;
    isVolunteer: boolean;
    volunteerMinutes?: number | null;
    waiverSignedAt?: string | null;
    slots: Array<AttendeeSlotDto>;
};
export namespace AttendeeDto {
    export enum personType {
        MEMBER = 'member',
        SPOUSE = 'spouse',
        CHILD = 'child',
    }
    export enum pricingTier {
        EARLY_BIRD = 'early_bird',
        STANDARD = 'standard',
    }
}

