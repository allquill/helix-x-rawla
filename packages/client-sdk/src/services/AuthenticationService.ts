/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuthResponseDto } from '../models/AuthResponseDto';
import type { ChangePasswordDto } from '../models/ChangePasswordDto';
import type { LoginDto } from '../models/LoginDto';
import type { MessageResponseDto } from '../models/MessageResponseDto';
import type { RegisterDto } from '../models/RegisterDto';
import type { UpdateAccountDto } from '../models/UpdateAccountDto';
import type { UserResponseDto } from '../models/UserResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * Register a new user account
     * @returns AuthResponseDto
     * @throws ApiError
     */
    public static register({
        requestBody,
    }: {
        requestBody: RegisterDto,
    }): CancelablePromise<AuthResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/register',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                409: `Email already registered`,
            },
        });
    }
    /**
     * Log in and receive a Bearer token
     * @returns AuthResponseDto
     * @throws ApiError
     */
    public static login({
        requestBody,
    }: {
        requestBody: LoginDto,
    }): CancelablePromise<AuthResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Invalid credentials or inactive account`,
            },
        });
    }
    /**
     * Get current authenticated user profile
     * @returns UserResponseDto
     * @throws ApiError
     */
    public static getMe(): CancelablePromise<UserResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/me',
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Update account details (name, email)
     * @returns UserResponseDto
     * @throws ApiError
     */
    public static updateAccount({
        requestBody,
    }: {
        requestBody: UpdateAccountDto,
    }): CancelablePromise<UserResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/auth/account',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                409: `Email already in use`,
            },
        });
    }
    /**
     * Change password for the authenticated user
     * @returns MessageResponseDto
     * @throws ApiError
     */
    public static changePassword({
        requestBody,
    }: {
        requestBody: ChangePasswordDto,
    }): CancelablePromise<MessageResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/auth/password',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Current password is incorrect`,
            },
        });
    }
}
