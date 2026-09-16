/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ApproveAuthorizationDto = {
    /**
     * requestId returned by GET /oauth/authorize
     */
    requestId: string;
    /**
     * true = grant, false = deny
     */
    approved: boolean;
    /**
     * Subset of requested scopes to grant — defaults to all requested scopes
     */
    grantedScopes?: Array<string>;
};

