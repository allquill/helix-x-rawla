/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminPermissionResponseDto } from '../models/AdminPermissionResponseDto';
import type { CreateAdminPermissionDto } from '../models/CreateAdminPermissionDto';
import type { ListAdminPermissionsResponseDto } from '../models/ListAdminPermissionsResponseDto';
import type { UpdateAdminPermissionDto } from '../models/UpdateAdminPermissionDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdminPermissionsService {
    /**
     * List all permissions
     * @returns ListAdminPermissionsResponseDto
     * @throws ApiError
     */
    public static listAdminPermissions(): CancelablePromise<ListAdminPermissionsResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/permissions',
        });
    }
    /**
     * Create a new permission
     * @returns AdminPermissionResponseDto
     * @throws ApiError
     */
    public static createAdminPermission({
        requestBody,
    }: {
        requestBody: CreateAdminPermissionDto,
    }): CancelablePromise<AdminPermissionResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/permissions',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get a permission by id
     * @returns AdminPermissionResponseDto
     * @throws ApiError
     */
    public static getAdminPermission({
        id,
    }: {
        id: number,
    }): CancelablePromise<AdminPermissionResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/permissions/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Update permission name or description
     * @returns AdminPermissionResponseDto
     * @throws ApiError
     */
    public static updateAdminPermission({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: UpdateAdminPermissionDto,
    }): CancelablePromise<AdminPermissionResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/admin/permissions/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete a permission
     * @returns void
     * @throws ApiError
     */
    public static deleteAdminPermission({
        id,
    }: {
        id: number,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/permissions/{id}',
            path: {
                'id': id,
            },
        });
    }
}
