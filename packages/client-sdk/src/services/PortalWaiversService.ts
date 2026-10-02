/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateWaiverTemplateDto } from '../models/CreateWaiverTemplateDto';
import type { PublishWaiverVersionDto } from '../models/PublishWaiverVersionDto';
import type { WaiverTemplateDto } from '../models/WaiverTemplateDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PortalWaiversService {
    /**
     * Every waiver, every version
     * @returns WaiverTemplateDto
     * @throws ApiError
     */
    public static listWaiverTemplates(): CancelablePromise<Array<WaiverTemplateDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/waiver-templates',
        });
    }
    /**
     * Write a new waiver
     * @returns WaiverTemplateDto
     * @throws ApiError
     */
    public static createWaiverTemplate({
        requestBody,
    }: {
        requestBody: CreateWaiverTemplateDto,
    }): CancelablePromise<WaiverTemplateDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/waiver-templates',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Publish the next version of a waiver
     * Existing signatures keep pointing at the version they agreed to.
     * @returns WaiverTemplateDto
     * @throws ApiError
     */
    public static publishWaiverTemplateVersion({
        key,
        requestBody,
    }: {
        key: string,
        requestBody: PublishWaiverVersionDto,
    }): CancelablePromise<WaiverTemplateDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/waiver-templates/{key}/versions',
            path: {
                'key': key,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
