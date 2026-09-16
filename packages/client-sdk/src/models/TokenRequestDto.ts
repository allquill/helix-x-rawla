/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TokenRequestDto = {
    grant_type: TokenRequestDto.grant_type;
    /**
     * authorization_code grant
     */
    code?: string;
    /**
     * authorization_code grant
     */
    redirect_uri?: string;
    client_id?: string;
    client_secret?: string;
    /**
     * refresh_token grant
     */
    refresh_token?: string;
    /**
     * client_credentials grant — space-separated
     */
    scope?: string;
    /**
     * password grant
     */
    username?: string;
    /**
     * password grant
     */
    password?: string;
    /**
     * PKCE code_verifier for authorization_code grant
     */
    code_verifier?: string;
};
export namespace TokenRequestDto {
    export enum grant_type {
        AUTHORIZATION_CODE = 'authorization_code',
        CLIENT_CREDENTIALS = 'client_credentials',
        REFRESH_TOKEN = 'refresh_token',
        PASSWORD = 'password',
    }
}

