/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateOAuthClientDto = {
    name?: string;
    redirectUris?: Array<string>;
    allowedScopes?: Array<string>;
    grantTypes?: Array<'authorization_code' | 'client_credentials' | 'refresh_token' | 'password'>;
    isActive?: boolean;
};

