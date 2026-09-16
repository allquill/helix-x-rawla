/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EmailVerifiedResponseDto = {
    destination: string;
    /**
     * Single-use ticket for setting a first password, when the account has none. Lets verification flow straight into password creation on one email.
     */
    setupTicket?: string | null;
    setupTicketExpiresAt?: string | null;
};

