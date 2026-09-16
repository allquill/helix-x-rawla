/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type OAuthTokenResponseDto = {
    access_token: string;
    token_type: string;
    /**
     * Seconds until the access token expires
     */
    expires_in: number;
    /**
     * Omitted for client_credentials grant
     */
    refresh_token?: string;
    /**
     * Space-separated scopes granted
     */
    scope: string;
    /**
     * OIDC ID token — present when the openid scope is granted
     */
    id_token?: string;
};

