/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChapterDto } from '../models/ChapterDto';
import type { ListAuditLogResponseDto } from '../models/ListAuditLogResponseDto';
import type { PortalSettingDto } from '../models/PortalSettingDto';
import type { ReferenceListDto } from '../models/ReferenceListDto';
import type { StateChapterMappingDto } from '../models/StateChapterMappingDto';
import type { UpdatePortalSettingsDto } from '../models/UpdatePortalSettingsDto';
import type { UpsertChapterDto } from '../models/UpsertChapterDto';
import type { UpsertReferenceValueDto } from '../models/UpsertReferenceValueDto';
import type { UpsertStateChapterMappingDto } from '../models/UpsertStateChapterMappingDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PortalAdministrationService {
    /**
     * List chapters
     * @returns ChapterDto
     * @throws ApiError
     */
    public static listPortalChapters(): CancelablePromise<Array<ChapterDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/chapters',
        });
    }
    /**
     * Create a chapter
     * @returns any
     * @throws ApiError
     */
    public static createPortalChapter({
        requestBody,
    }: {
        requestBody: UpsertChapterDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/chapters',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Update a chapter
     * @returns any
     * @throws ApiError
     */
    public static updatePortalChapter({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: UpsertChapterDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/chapters/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * The state → chapter map that drives auto-assignment
     * @returns StateChapterMappingDto
     * @throws ApiError
     */
    public static getStateChapterMap(): CancelablePromise<Array<StateChapterMappingDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/chapters/state-map',
        });
    }
    /**
     * Map a state to a chapter
     * @returns any
     * @throws ApiError
     */
    public static updateStateChapterMap({
        requestBody,
    }: {
        requestBody: UpsertStateChapterMappingDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/chapters/state-map',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * All reference lists with their values
     * @returns ReferenceListDto
     * @throws ApiError
     */
    public static listReferenceData(): CancelablePromise<Array<ReferenceListDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/reference-data',
        });
    }
    /**
     * Add a value to a reference list
     * @returns any
     * @throws ApiError
     */
    public static createReferenceDataValue({
        key,
        requestBody,
    }: {
        key: string,
        requestBody: UpsertReferenceValueDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/reference-data/{key}/values',
            path: {
                'key': key,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Update or deactivate a reference value
     * Deactivating hides the option from new dropdowns without orphaning members who already chose it.
     * @returns any
     * @throws ApiError
     */
    public static updateReferenceDataValue({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: UpsertReferenceValueDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/reference-data/values/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * All portal settings
     * @returns PortalSettingDto
     * @throws ApiError
     */
    public static listPortalSettings(): CancelablePromise<Array<PortalSettingDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/portal-settings',
        });
    }
    /**
     * Update portal settings
     * Writes are audited one row per changed key. Credential TTLs and resend limits are pushed into the verification-token policy immediately; links already in flight keep the parameters they were issued under.
     * @returns PortalSettingDto
     * @throws ApiError
     */
    public static updatePortalSettings({
        requestBody,
    }: {
        requestBody: UpdatePortalSettingsDto,
    }): CancelablePromise<Array<PortalSettingDto>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/portal-settings',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * The append-only change log
     * @returns ListAuditLogResponseDto
     * @throws ApiError
     */
    public static listPortalAuditLogs({
        entityType,
        entityId,
        action,
        limit,
        offset,
    }: {
        entityType?: string,
        entityId?: string,
        action?: string,
        limit?: string,
        offset?: string,
    }): CancelablePromise<ListAuditLogResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/audit-logs',
            query: {
                'entityType': entityType,
                'entityId': entityId,
                'action': action,
                'limit': limit,
                'offset': offset,
            },
        });
    }
}
