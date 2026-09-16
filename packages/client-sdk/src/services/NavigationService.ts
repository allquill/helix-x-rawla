/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NavigationConfigResponseDto } from '../models/NavigationConfigResponseDto';
import type { ReplaceNavigationConfigDto } from '../models/ReplaceNavigationConfigDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class NavigationService {
    /**
     * Navigation configuration for this deployment
     * @returns NavigationConfigResponseDto
     * @throws ApiError
     */
    public static getPublicNavigationConfig(): CancelablePromise<NavigationConfigResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/public/config/navigation',
        });
    }
    /**
     * Read the navigation configuration for editing
     * @returns NavigationConfigResponseDto
     * @throws ApiError
     */
    public static getNavigationConfig(): CancelablePromise<NavigationConfigResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/navigation/config',
        });
    }
    /**
     * Replace the navigation configuration
     * The document is stored whole. Overrides can hide items, move them between surfaces and add access requirements; they can never remove a requirement the code declares.
     * @returns NavigationConfigResponseDto
     * @throws ApiError
     */
    public static replaceNavigationConfig({
        requestBody,
    }: {
        requestBody: ReplaceNavigationConfigDto,
    }): CancelablePromise<NavigationConfigResponseDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/navigation/config',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
