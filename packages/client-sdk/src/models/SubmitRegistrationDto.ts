/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RegistrationChildDto } from './RegistrationChildDto';
import type { RegistrationReferenceDto } from './RegistrationReferenceDto';
import type { RegistrationSpouseDto } from './RegistrationSpouseDto';
export type SubmitRegistrationDto = {
    email: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    honorific?: string;
    gender: SubmitRegistrationDto.gender;
    /**
     * ISO date. Checked against the configured minimum age.
     */
    dateOfBirth: string;
    thikana: string;
    gotra: string;
    /**
     * Rajput caste / sub-clan — distinct from Gotra.
     */
    caste: string;
    sasural?: string;
    nanihal?: string;
    languages?: Array<string>;
    familyHistory?: string;
    phone: string;
    whatsappPhone?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    /**
     * Two-letter state code; drives chapter auto-assignment.
     */
    stateCode: string;
    postalCode: string;
    weddingDate?: string;
    spouse?: RegistrationSpouseDto;
    children?: Array<RegistrationChildDto>;
    industry?: string;
    jobTitle?: string;
    skills?: Array<string>;
    education?: string;
    membershipTier: string;
    volunteerInterests?: Array<string>;
    /**
     * Two vouching Rawla members, unless supplied offline.
     */
    references?: Array<RegistrationReferenceDto>;
    offlineVerification?: boolean;
    /**
     * Must be true — the accepted version is recorded.
     */
    acceptCommunityGuidelines: boolean;
    /**
     * Must be true — the accepted version is recorded.
     */
    acceptPrivacyPolicy: boolean;
    acknowledgeDuplicatePhone?: boolean;
};
export namespace SubmitRegistrationDto {
    export enum gender {
        MALE = 'male',
        FEMALE = 'female',
    }
}

