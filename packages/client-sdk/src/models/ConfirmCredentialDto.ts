/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ConfirmCredentialDto = {
    /**
     * Single-use ticket returned by the matching verify step. Not the emailed token.
     */
    ticket: string;
    /**
     * Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol.
     */
    newPassword: string;
};

