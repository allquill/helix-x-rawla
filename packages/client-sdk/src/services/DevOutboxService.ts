/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DevMailOutboxDetailDto } from '../models/DevMailOutboxDetailDto';
import type { ListDevMailOutboxResponseDto } from '../models/ListDevMailOutboxResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DevOutboxService {
    /**
     * List captured development emails, newest first
     * @returns ListDevMailOutboxResponseDto
     * @throws ApiError
     */
    public static listDevOutbox(): CancelablePromise<ListDevMailOutboxResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dev/outbox',
        });
    }
    /**
     * Read one captured development email in full
     * @returns DevMailOutboxDetailDto
     * @throws ApiError
     */
    public static getDevOutboxMessage({
        id,
    }: {
        id: string,
    }): CancelablePromise<DevMailOutboxDetailDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dev/outbox/{id}',
            path: {
                'id': id,
            },
        });
    }
}
