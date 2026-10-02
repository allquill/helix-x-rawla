/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateMemberPrivacyDto = {
    /**
     * Global directory opt-out (MP-19).
     */
    directoryOptIn?: boolean;
    fieldVisibility?: Record<string, any>;
    /**
     * Receive event invitations and reminders by email (EVT-22).
     */
    eventEmailOptIn?: boolean;
};

