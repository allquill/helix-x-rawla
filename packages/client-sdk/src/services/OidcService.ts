/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OidcService {
    /**
     * OIDC UserInfo endpoint
     * Returns standard OIDC claims filtered to the granted scope. Requires an access token with at least the `openid` scope.
     * @returns any
     * @throws ApiError
     */
    public static userinfo(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/oauth/userinfo',
        });
    }
    /**
     * OIDC Discovery document
     * Returns the provider metadata document. Configure `oidc.issuerUrl` in OAuthModule options so the URLs in this document are correct.
     * @returns any
     * @throws ApiError
     */
    public static discoveryDocument(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/oauth/.well-known/openid-configuration',
        });
    }
    /**
     * JSON Web Key Set
     * Returns public signing keys. Empty for HS256 — upgrade to RS256 for public key distribution.
     * @returns any
     * @throws ApiError
     */
    public static jwks(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/oauth/.well-known/jwks.json',
        });
    }
    /**
     * End session / logout
     * Revokes the Bearer access token used in this request. The refresh token should be revoked separately via POST /oauth/revoke.
     * @returns void
     * @throws ApiError
     */
    public static logout(): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/oauth/logout',
        });
    }
}
