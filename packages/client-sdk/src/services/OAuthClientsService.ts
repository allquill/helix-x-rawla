/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateOAuthClientDto } from '../models/CreateOAuthClientDto';
import type { OAuthClientCreatedResponseDto } from '../models/OAuthClientCreatedResponseDto';
import type { OAuthClientResponseDto } from '../models/OAuthClientResponseDto';
import type { RotateClientSecretDto } from '../models/RotateClientSecretDto';
import type { UpdateOAuthClientDto } from '../models/UpdateOAuthClientDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OAuthClientsService {
    /**
     * Register a new OAuth client
     * @returns OAuthClientCreatedResponseDto Store the clientSecret — it will not be shown again
     * @throws ApiError
     */
    public static create({
        requestBody,
    }: {
        requestBody: CreateOAuthClientDto,
    }): CancelablePromise<OAuthClientCreatedResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/oauth/clients',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List the current user's OAuth clients
     * @returns OAuthClientResponseDto
     * @throws ApiError
     */
    public static findAll(): CancelablePromise<Array<OAuthClientResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/oauth/clients',
        });
    }
    /**
     * List all OAuth clients (admin only)
     * @returns OAuthClientResponseDto
     * @throws ApiError
     */
    public static findAllAdmin(): CancelablePromise<Array<OAuthClientResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/oauth/clients/all',
        });
    }
    /**
     * Get an OAuth client by ID
     * @returns OAuthClientResponseDto
     * @throws ApiError
     */
    public static findOne({
        id,
    }: {
        id: string,
    }): CancelablePromise<OAuthClientResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/oauth/clients/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Update an OAuth client
     * @returns OAuthClientResponseDto
     * @throws ApiError
     */
    public static update({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: UpdateOAuthClientDto,
    }): CancelablePromise<OAuthClientResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/oauth/clients/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete an OAuth client and revoke all its tokens
     * @returns void
     * @throws ApiError
     */
    public static remove({
        id,
    }: {
        id: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/oauth/clients/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Rotate the client secret — old secret is immediately invalidated
     * @returns any
     * @throws ApiError
     */
    public static rotateSecret({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: RotateClientSecretDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/oauth/clients/{id}/rotate-secret',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
