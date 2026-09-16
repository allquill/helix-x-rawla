/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminRoleResponseDto } from '../models/AdminRoleResponseDto';
import type { AssignPermissionsDto } from '../models/AssignPermissionsDto';
import type { CreateAdminRoleDto } from '../models/CreateAdminRoleDto';
import type { ListAdminRolesResponseDto } from '../models/ListAdminRolesResponseDto';
import type { UpdateAdminRoleDto } from '../models/UpdateAdminRoleDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdminRolesService {
    /**
     * List all roles
     * @returns ListAdminRolesResponseDto
     * @throws ApiError
     */
    public static listAdminRoles(): CancelablePromise<ListAdminRolesResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/roles',
        });
    }
    /**
     * Create a new role
     * @returns AdminRoleResponseDto
     * @throws ApiError
     */
    public static createAdminRole({
        requestBody,
    }: {
        requestBody: CreateAdminRoleDto,
    }): CancelablePromise<AdminRoleResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/roles',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get a role by id
     * @returns AdminRoleResponseDto
     * @throws ApiError
     */
    public static getAdminRole({
        id,
    }: {
        id: number,
    }): CancelablePromise<AdminRoleResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/roles/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Update role name or description
     * @returns AdminRoleResponseDto
     * @throws ApiError
     */
    public static updateAdminRole({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: UpdateAdminRoleDto,
    }): CancelablePromise<AdminRoleResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/admin/roles/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete a role
     * @returns void
     * @throws ApiError
     */
    public static deleteAdminRole({
        id,
    }: {
        id: number,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/roles/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Replace the permissions assigned to a role
     * @returns AdminRoleResponseDto
     * @throws ApiError
     */
    public static assignAdminRolePermissions({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: AssignPermissionsDto,
    }): CancelablePromise<AdminRoleResponseDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/admin/roles/{id}/permissions',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
