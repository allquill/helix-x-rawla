/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CredentialTicketResponseDto = {
    /**
     * Single-use ticket to spend on the confirm step.
     */
    ticket: string;
    expiresAt: string;
    /**
     * Masked recipient address.
     */
    destination: string;
};

