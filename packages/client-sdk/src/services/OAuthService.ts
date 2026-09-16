/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApproveAuthorizationDto } from '../models/ApproveAuthorizationDto';
import type { AuthorizationCodeResponseDto } from '../models/AuthorizationCodeResponseDto';
import type { IntrospectionResponseDto } from '../models/IntrospectionResponseDto';
import type { IntrospectTokenDto } from '../models/IntrospectTokenDto';
import type { OAuthErrorResponseDto } from '../models/OAuthErrorResponseDto';
import type { OAuthTokenResponseDto } from '../models/OAuthTokenResponseDto';
import type { RevokeTokenDto } from '../models/RevokeTokenDto';
import type { TokenRequestDto } from '../models/TokenRequestDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OAuthService {
    /**
     * Approve a pending authorization request
     * User grants access. Returns a one-time authorization code that the client exchanges at POST /oauth/token.
     * @returns AuthorizationCodeResponseDto
     * @throws ApiError
     */
    public static approve({
        requestBody,
    }: {
        requestBody: ApproveAuthorizationDto,
    }): CancelablePromise<AuthorizationCodeResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/oauth/authorize/approve',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Deny a pending authorization request
     * @returns OAuthErrorResponseDto
     * @throws ApiError
     */
    public static deny(): CancelablePromise<OAuthErrorResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/oauth/authorize/deny',
        });
    }
    /**
     * Exchange credentials for tokens
     * Supports: authorization_code, client_credentials, refresh_token, password. Accepts both application/json and application/x-www-form-urlencoded.
     * @returns OAuthTokenResponseDto
     * @throws ApiError
     */
    public static token({
        requestBody,
    }: {
        requestBody: TokenRequestDto,
    }): CancelablePromise<OAuthTokenResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/oauth/token',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Introspect a token (RFC 7662)
     * Returns { active: false } for expired, revoked, or unknown tokens. Protect this endpoint — it reveals token metadata.
     * @returns IntrospectionResponseDto
     * @throws ApiError
     */
    public static introspect({
        requestBody,
    }: {
        requestBody: IntrospectTokenDto,
    }): CancelablePromise<IntrospectionResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/oauth/introspect',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Revoke an access or refresh token (RFC 7009)
     * Idempotent — always returns 200 even if the token is already revoked or unknown.
     * @returns any
     * @throws ApiError
     */
    public static revoke({
        requestBody,
    }: {
        requestBody: RevokeTokenDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/oauth/revoke',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
