/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type IntrospectionResponseDto = {
    /**
     * false if the token is expired, revoked, or unknown
     */
    active: boolean;
    scope?: string;
    client_id?: string;
    username?: string;
    token_type?: string;
    exp?: number;
    iat?: number;
    sub?: string;
    jti?: string;
    iss?: string;
};

