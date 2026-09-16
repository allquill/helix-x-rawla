/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ListAuditLogResponseDto } from '../models/ListAuditLogResponseDto';
import type { OverrideEmailVerificationDto } from '../models/OverrideEmailVerificationDto';
import type { RejectRegistrationDto } from '../models/RejectRegistrationDto';
import type { RequestRegistrationInfoDto } from '../models/RequestRegistrationInfoDto';
import type { SetPaymentStatusDto } from '../models/SetPaymentStatusDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PortalRegistrationsService {
    /**
     * List applications by status
     * @returns any
     * @throws ApiError
     */
    public static listMemberRegistrations({
        status,
        search,
        limit,
        offset,
    }: {
        status?: string,
        search?: string,
        limit?: string,
        offset?: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/registrations',
            query: {
                'status': status,
                'search': search,
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * Open one application for review
     * @returns any
     * @throws ApiError
     */
    public static getMemberRegistration({
        id,
    }: {
        id: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/registrations/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Approve an application
     * Sets is_approved and allocates the Member ID. Approval alone does not activate the account — the dues gate must also close.
     * @returns any
     * @throws ApiError
     */
    public static approveMemberRegistration({
        id,
    }: {
        id: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/registrations/{id}/approve',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Reject an application (reason required)
     * @returns any
     * @throws ApiError
     */
    public static rejectMemberRegistration({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: RejectRegistrationDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/registrations/{id}/reject',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Ask the applicant for more information
     * @returns any
     * @throws ApiError
     */
    public static requestMemberRegistrationInfo({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: RequestRegistrationInfoDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/registrations/{id}/request-info',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Set or clear the dues gate by hand
     * For cheque, Zelle, cash, waived, honorary and complimentary memberships. Reason is mandatory; clearing the flag deactivates a live member.
     * @returns any
     * @throws ApiError
     */
    public static setMemberPaymentStatus({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: SetPaymentStatusDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/registrations/{id}/payment-status',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Mark an email address verified manually
     * @returns any
     * @throws ApiError
     */
    public static overrideMemberEmailVerification({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: OverrideEmailVerificationDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/registrations/{id}/email-verification',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * The append-only history of one application
     * @returns ListAuditLogResponseDto
     * @throws ApiError
     */
    public static getMemberRegistrationAudit({
        id,
    }: {
        id: string,
    }): CancelablePromise<ListAuditLogResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/registrations/{id}/audit',
            path: {
                'id': id,
            },
        });
    }
}
