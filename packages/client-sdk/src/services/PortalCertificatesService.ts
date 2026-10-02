/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CertificateDto } from '../models/CertificateDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PortalCertificatesService {
    /**
     * Your certificates and your children's
     * @returns CertificateDto
     * @throws ApiError
     */
    public static listMyCertificates(): CancelablePromise<Array<CertificateDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/members/me/certificates',
        });
    }
    /**
     * A member's certificates
     * @returns CertificateDto
     * @throws ApiError
     */
    public static listMemberCertificates({
        memberId,
    }: {
        memberId: string,
    }): CancelablePromise<Array<CertificateDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/members/{memberId}/certificates',
            path: {
                'memberId': memberId,
            },
        });
    }
    /**
     * Upload a certificate to a member's profile, or their child's section of it
     * @returns CertificateDto
     * @throws ApiError
     */
    public static uploadMemberCertificate({
        memberId,
        formData,
    }: {
        memberId: string,
        formData: {
            file: Blob;
            title: string;
            childProfileId?: string;
            eventId?: string;
        },
    }): CancelablePromise<CertificateDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/members/{memberId}/certificates',
            path: {
                'memberId': memberId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
    /**
     * Download a certificate
     * @returns binary
     * @throws ApiError
     */
    public static downloadCertificate({
        certificateId,
    }: {
        certificateId: string,
    }): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/certificates/{certificateId}/content',
            path: {
                'certificateId': certificateId,
            },
        });
    }
    /**
     * Delete a certificate
     * @returns void
     * @throws ApiError
     */
    public static deleteMemberCertificate({
        certificateId,
    }: {
        certificateId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/certificates/{certificateId}',
            path: {
                'certificateId': certificateId,
            },
        });
    }
}
