/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ArchiveMemberDto } from '../models/ArchiveMemberDto';
import type { ListMembersResponseDto } from '../models/ListMembersResponseDto';
import type { MemberDetailDto } from '../models/MemberDetailDto';
import type { MemberStatusDto } from '../models/MemberStatusDto';
import type { UpdateMemberDto } from '../models/UpdateMemberDto';
import type { UpdateMemberPrivacyDto } from '../models/UpdateMemberPrivacyDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PortalMembersService {
    /**
     * The signed-in member's own gate checklist
     * @returns MemberStatusDto
     * @throws ApiError
     */
    public static getMyMembershipStatus(): CancelablePromise<MemberStatusDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/members/me/status',
        });
    }
    /**
     * The signed-in member's own profile
     * @returns MemberDetailDto
     * @throws ApiError
     */
    public static getMyMemberProfile(): CancelablePromise<MemberDetailDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/members/me',
        });
    }
    /**
     * Update your own profile
     * @returns MemberDetailDto
     * @throws ApiError
     */
    public static updateMyMemberProfile({
        requestBody,
    }: {
        requestBody: UpdateMemberDto,
    }): CancelablePromise<MemberDetailDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/members/me',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Directory opt-out and per-field visibility
     * @returns MemberStatusDto
     * @throws ApiError
     */
    public static updateMyMemberPrivacy({
        requestBody,
    }: {
        requestBody: UpdateMemberPrivacyDto,
    }): CancelablePromise<MemberStatusDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/members/me/privacy',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List members
     * @returns ListMembersResponseDto
     * @throws ApiError
     */
    public static listPortalMembers({
        search,
        status,
        gotra,
        caste,
        membershipTier,
        chapterId,
        isActive,
        limit,
        offset,
    }: {
        search?: string,
        status?: string,
        gotra?: string,
        caste?: string,
        membershipTier?: string,
        chapterId?: string,
        isActive?: string,
        limit?: string,
        offset?: string,
    }): CancelablePromise<ListMembersResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/members',
            query: {
                'search': search,
                'status': status,
                'gotra': gotra,
                'caste': caste,
                'membershipTier': membershipTier,
                'chapterId': chapterId,
                'isActive': isActive,
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * One member, filtered to what the viewer may see
     * @returns MemberDetailDto
     * @throws ApiError
     */
    public static getPortalMember({
        id,
    }: {
        id: string,
    }): CancelablePromise<MemberDetailDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/members/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Administrative edit of a member record
     * @returns MemberDetailDto
     * @throws ApiError
     */
    public static updatePortalMember({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: UpdateMemberDto,
    }): CancelablePromise<MemberDetailDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/members/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Archive a member
     * Retains the gate flags, so reinstatement does not require re-payment.
     * @returns any
     * @throws ApiError
     */
    public static archivePortalMember({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: ArchiveMemberDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/members/{id}/archive',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Reinstate an archived member
     * @returns any
     * @throws ApiError
     */
    public static reinstatePortalMember({
        id,
    }: {
        id: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/members/{id}/reinstate',
            path: {
                'id': id,
            },
        });
    }
}
