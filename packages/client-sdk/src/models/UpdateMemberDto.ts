/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateMemberDto = {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    honorific?: string;
    dateOfBirth?: string;
    thikana?: string;
    gotra?: string;
    caste?: string;
    sasural?: string;
    nanihal?: string;
    languages?: Array<string>;
    familyHistory?: string;
    phone?: string;
    whatsappPhone?: string;
    weddingDate?: string;
    industry?: string;
    jobTitle?: string;
    skills?: Array<string>;
    education?: string;
    linkedinUrl?: string;
    facebookUrl?: string;
    /**
     * MP-09: social links appear only with the member's consent.
     */
    socialLinksApproved?: boolean;
    volunteerInterests?: Array<string>;
    membershipTier?: string;
    chapterId?: string;
    reviewerNotes?: string;
    /**
     * Read-only. Derived from the three activation gates; rejected if sent.
     */
    isActive?: boolean;
    /**
     * Read-only. Set only by an approval decision.
     */
    isApproved?: boolean;
    /**
     * Read-only. Set only by the dues flow or an audited override.
     */
    isPaymentMade?: boolean;
    /**
     * Read-only. Set only by the verification flow or an audited override.
     */
    isEmailVerified?: boolean;
};

