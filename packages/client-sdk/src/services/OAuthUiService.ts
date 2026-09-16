/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OAuthUiService {
    /**
     * Render the OAuth login page (browser flow)
     * @returns any
     * @throws ApiError
     */
    public static getLoginPage({
        returnTo,
        error,
    }: {
        returnTo: string,
        error: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/oauth/login',
            query: {
                'return_to': returnTo,
                'error': error,
            },
        });
    }
    /**
     * OAuth authorization endpoint (browser flow)
     * Redirects unauthenticated users to the login page. Authenticated users see the consent screen where they can review and adjust scope permissions.
     * @returns any
     * @throws ApiError
     */
    public static getAuthorize({
        responseType,
        clientId,
        redirectUri,
        scope,
        state,
        nonce,
        codeChallenge,
        codeChallengeMethod = 'S256',
    }: {
        responseType: string,
        clientId: string,
        redirectUri: string,
        scope?: string,
        /**
         * CSRF protection — echoed back in the response
         */
        state?: string,
        /**
         * OIDC nonce — a random value embedded in the ID token to prevent replay attacks
         */
        nonce?: string,
        /**
         * PKCE code_challenge (RFC 7636) — required for public clients
         */
        codeChallenge?: string,
        codeChallengeMethod?: 'S256' | 'plain',
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/oauth/authorize',
            query: {
                'response_type': responseType,
                'client_id': clientId,
                'redirect_uri': redirectUri,
                'scope': scope,
                'state': state,
                'nonce': nonce,
                'code_challenge': codeChallenge,
                'code_challenge_method': codeChallengeMethod,
            },
        });
    }
}
