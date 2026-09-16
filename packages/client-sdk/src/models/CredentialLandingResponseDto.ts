/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CredentialLandingResponseDto = {
    /**
     * False when the link is expired, used or unknown.
     */
    valid: boolean;
    purpose: CredentialLandingResponseDto.purpose;
    /**
     * Masked recipient, e.g. al••••@example.com. Absent when invalid.
     */
    maskedDestination?: string | null;
};
export namespace CredentialLandingResponseDto {
    export enum purpose {
        EMAIL_VERIFICATION = 'email_verification',
        CREDENTIAL_SETUP = 'credential_setup',
        PASSWORD_RESET = 'password_reset',
    }
}

