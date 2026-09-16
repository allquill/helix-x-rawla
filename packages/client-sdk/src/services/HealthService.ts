/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HealthDto } from '../models/HealthDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HealthService {
    /**
     * Health check
     * @returns HealthDto
     * @throws ApiError
     */
    public static getHealth(): CancelablePromise<HealthDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/health',
        });
    }
}
