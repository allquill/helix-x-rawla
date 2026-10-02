/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TopVolunteersResponseDto } from '../models/TopVolunteersResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PortalVolunteersService {
    /**
     * Top volunteers by hours served or events served at
     * Counts closed events. A member outside the directory keeps their place, unnamed.
     * @returns TopVolunteersResponseDto
     * @throws ApiError
     */
    public static listTopVolunteers({
        metric,
        chapterId,
        group,
        limit,
    }: {
        metric?: 'hours' | 'events',
        chapterId?: string,
        group?: 'all' | 'youth' | 'adult',
        limit?: string,
    }): CancelablePromise<TopVolunteersResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/volunteers/top',
            query: {
                'metric': metric,
                'chapterId': chapterId,
                'group': group,
                'limit': limit,
            },
        });
    }
}
