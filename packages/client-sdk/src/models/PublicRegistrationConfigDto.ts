/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MembershipTierOptionDto } from './MembershipTierOptionDto';
export type PublicRegistrationConfigDto = {
    minimumAge: number;
    paymentRequired: boolean;
    consentVersion: string;
    membershipTiers: Array<MembershipTierOptionDto>;
    /**
     * Admin-maintained dropdowns, keyed by list.
     */
    referenceLists: Record<string, any>;
};

