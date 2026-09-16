/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type OAuthClientCreatedResponseDto = {
    id: string;
    clientId: string;
    name: string;
    redirectUris: Array<string>;
    allowedScopes: Array<string>;
    grantTypes: Array<string>;
    isConfidential: boolean;
    isActive: boolean;
    userId?: number;
    createdAt: string;
    updatedAt: string;
    /**
     * Shown once — store this securely. Not recoverable.
     */
    clientSecret: string;
};

