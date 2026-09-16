/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminUserResponseDto } from '../models/AdminUserResponseDto';
import type { AssignRolesDto } from '../models/AssignRolesDto';
import type { ListAdminUsersResponseDto } from '../models/ListAdminUsersResponseDto';
import type { SetUserActiveDto } from '../models/SetUserActiveDto';
import type { UpdateAdminUserDto } from '../models/UpdateAdminUserDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdminUsersService {
    /**
     * List all users
     * @returns ListAdminUsersResponseDto
     * @throws ApiError
     */
    public static listAdminUsers(): CancelablePromise<ListAdminUsersResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/users',
        });
    }
    /**
     * Get a user by id
     * @returns AdminUserResponseDto
     * @throws ApiError
     */
    public static getAdminUser({
        id,
    }: {
        id: number,
    }): CancelablePromise<AdminUserResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/users/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Update a user (name, email)
     * @returns AdminUserResponseDto
     * @throws ApiError
     */
    public static updateAdminUser({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: UpdateAdminUserDto,
    }): CancelablePromise<AdminUserResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/admin/users/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete a user
     * @returns void
     * @throws ApiError
     */
    public static deleteAdminUser({
        id,
    }: {
        id: number,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/users/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Enable or disable a user account
     * @returns AdminUserResponseDto
     * @throws ApiError
     */
    public static setAdminUserActive({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: SetUserActiveDto,
    }): CancelablePromise<AdminUserResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/admin/users/{id}/active',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Replace the roles assigned to a user
     * @returns AdminUserResponseDto
     * @throws ApiError
     */
    public static assignAdminUserRoles({
        id,
        requestBody,
    }: {
        id: number,
        requestBody: AssignRolesDto,
    }): CancelablePromise<AdminUserResponseDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/admin/users/{id}/roles',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
