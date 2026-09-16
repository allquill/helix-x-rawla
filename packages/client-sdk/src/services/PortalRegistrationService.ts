/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckRegistrationDuplicateDto } from '../models/CheckRegistrationDuplicateDto';
import type { DuplicateProbeDto } from '../models/DuplicateProbeDto';
import type { PublicRegistrationConfigDto } from '../models/PublicRegistrationConfigDto';
import type { RegistrationSubmittedDto } from '../models/RegistrationSubmittedDto';
import type { SubmitRegistrationDto } from '../models/SubmitRegistrationDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PortalRegistrationService {
    /**
     * Submit a membership application
     * @returns RegistrationSubmittedDto
     * @throws ApiError
     */
    public static submitMemberRegistration({
        requestBody,
    }: {
        requestBody: SubmitRegistrationDto,
    }): CancelablePromise<RegistrationSubmittedDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/public/registrations',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Check whether an email or phone is already on file
     * @returns DuplicateProbeDto
     * @throws ApiError
     */
    public static checkRegistrationDuplicate({
        requestBody,
    }: {
        requestBody: CheckRegistrationDuplicateDto,
    }): CancelablePromise<DuplicateProbeDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/public/registrations/check-duplicate',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Public configuration for the registration form
     * @returns PublicRegistrationConfigDto
     * @throws ApiError
     */
    public static getPublicRegistrationConfig(): CancelablePromise<PublicRegistrationConfigDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/public/config/registration',
        });
    }
}
