/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConfirmCredentialDto } from '../models/ConfirmCredentialDto';
import type { ConfirmEmailVerificationDto } from '../models/ConfirmEmailVerificationDto';
import type { CredentialLandingResponseDto } from '../models/CredentialLandingResponseDto';
import type { CredentialLinkRequestedResponseDto } from '../models/CredentialLinkRequestedResponseDto';
import type { CredentialTicketResponseDto } from '../models/CredentialTicketResponseDto';
import type { EmailVerifiedResponseDto } from '../models/EmailVerifiedResponseDto';
import type { MessageResponseDto } from '../models/MessageResponseDto';
import type { RequestCredentialLinkDto } from '../models/RequestCredentialLinkDto';
import type { VerifyCredentialLinkDto } from '../models/VerifyCredentialLinkDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CredentialsService {
    /**
     * Describe a verification link without consuming it
     * @returns CredentialLandingResponseDto
     * @throws ApiError
     */
    public static describeEmailVerificationLanding({
        token,
    }: {
        token: string,
    }): CancelablePromise<CredentialLandingResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/email-verification/landing',
            query: {
                'token': token,
            },
        });
    }
    /**
     * Describe a password-setup link without consuming it
     * @returns CredentialLandingResponseDto
     * @throws ApiError
     */
    public static describeCredentialSetupLanding({
        token,
    }: {
        token: string,
    }): CancelablePromise<CredentialLandingResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/credential-setup/landing',
            query: {
                'token': token,
            },
        });
    }
    /**
     * Describe a password-reset link without consuming it
     * @returns CredentialLandingResponseDto
     * @throws ApiError
     */
    public static describePasswordResetLanding({
        token,
    }: {
        token: string,
    }): CancelablePromise<CredentialLandingResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/password-reset/landing',
            query: {
                'token': token,
            },
        });
    }
    /**
     * Spend a verification link; returns a setup ticket when no password is set
     * @returns EmailVerifiedResponseDto
     * @throws ApiError
     */
    public static confirmEmailVerification({
        requestBody,
    }: {
        requestBody: ConfirmEmailVerificationDto,
    }): CancelablePromise<EmailVerifiedResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/email-verification/confirm',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Resend a verification link (throttled)
     * @returns CredentialLinkRequestedResponseDto
     * @throws ApiError
     */
    public static resendEmailVerification({
        requestBody,
    }: {
        requestBody: RequestCredentialLinkDto,
    }): CancelablePromise<CredentialLinkRequestedResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/email-verification/resend',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Email a link for setting a first password
     * @returns CredentialLinkRequestedResponseDto
     * @throws ApiError
     */
    public static requestCredentialSetup({
        requestBody,
    }: {
        requestBody: RequestCredentialLinkDto,
    }): CancelablePromise<CredentialLinkRequestedResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/credential-setup/request',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Spend a setup link and receive a ticket
     * @returns CredentialTicketResponseDto
     * @throws ApiError
     */
    public static verifyCredentialSetup({
        requestBody,
    }: {
        requestBody: VerifyCredentialLinkDto,
    }): CancelablePromise<CredentialTicketResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/credential-setup/verify',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Spend a setup ticket and set the first password
     * @returns MessageResponseDto
     * @throws ApiError
     */
    public static confirmCredentialSetup({
        requestBody,
    }: {
        requestBody: ConfirmCredentialDto,
    }): CancelablePromise<MessageResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/credential-setup/confirm',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Email a password-reset link
     * @returns CredentialLinkRequestedResponseDto
     * @throws ApiError
     */
    public static requestPasswordReset({
        requestBody,
    }: {
        requestBody: RequestCredentialLinkDto,
    }): CancelablePromise<CredentialLinkRequestedResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/password-reset/request',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Spend a reset link and receive a ticket
     * @returns CredentialTicketResponseDto
     * @throws ApiError
     */
    public static verifyPasswordReset({
        requestBody,
    }: {
        requestBody: VerifyCredentialLinkDto,
    }): CancelablePromise<CredentialTicketResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/password-reset/verify',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Spend a reset ticket, set the password and revoke other sessions
     * @returns MessageResponseDto
     * @throws ApiError
     */
    public static confirmPasswordReset({
        requestBody,
    }: {
        requestBody: ConfirmCredentialDto,
    }): CancelablePromise<MessageResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/password-reset/confirm',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
