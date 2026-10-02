/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EventDocumentDto } from '../models/EventDocumentDto';
import type { ListEventDocumentsResponseDto } from '../models/ListEventDocumentsResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PortalEventDocumentsService {
    /**
     * An event's statements and bills, with the security level in force
     * @returns ListEventDocumentsResponseDto
     * @throws ApiError
     */
    public static listEventDocuments({
        id,
    }: {
        id: string,
    }): CancelablePromise<ListEventDocumentsResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/events/{id}/documents',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Attach a document
     * Any time before the event is closed.
     * @returns EventDocumentDto
     * @throws ApiError
     */
    public static uploadEventDocument({
        id,
        formData,
    }: {
        id: string,
        formData: {
            file: Blob;
            kind?: 'financial_statement' | 'bill' | 'other';
        },
    }): CancelablePromise<EventDocumentDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/events/{id}/documents',
            path: {
                'id': id,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
    /**
     * Download a document
     * @returns binary
     * @throws ApiError
     */
    public static downloadEventDocument({
        id,
        documentId,
    }: {
        id: string,
        documentId: string,
    }): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/events/{id}/documents/{documentId}/content',
            path: {
                'id': id,
                'documentId': documentId,
            },
        });
    }
    /**
     * Delete a document, before the event is closed
     * @returns void
     * @throws ApiError
     */
    public static deleteEventDocument({
        id,
        documentId,
    }: {
        id: string,
        documentId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/events/{id}/documents/{documentId}',
            path: {
                'id': id,
                'documentId': documentId,
            },
        });
    }
}
