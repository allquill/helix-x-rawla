/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateRegistrationDto } from '../models/CreateRegistrationDto';
import type { EventCheckoutDto } from '../models/EventCheckoutDto';
import type { EventDetailDto } from '../models/EventDetailDto';
import type { EventRegistrationDto } from '../models/EventRegistrationDto';
import type { ListEventParticipantsResponseDto } from '../models/ListEventParticipantsResponseDto';
import type { ListEventsResponseDto } from '../models/ListEventsResponseDto';
import type { MyEventRegistrationDto } from '../models/MyEventRegistrationDto';
import type { NextUpcomingEventDto } from '../models/NextUpcomingEventDto';
import type { RegistrationOptionsDto } from '../models/RegistrationOptionsDto';
import type { SlotDto } from '../models/SlotDto';
import type { UpdatePreferencesDto } from '../models/UpdatePreferencesDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PortalEventsService {
    /**
     * Published events, upcoming or past
     * @returns ListEventsResponseDto
     * @throws ApiError
     */
    public static listPortalEvents({
        scope,
        category,
        chapterId,
        limit,
        offset,
    }: {
        scope?: 'upcoming' | 'past',
        category?: 'mel' | 'annual_chapter' | 'local_charity',
        chapterId?: string,
        limit?: string,
        offset?: string,
    }): CancelablePromise<ListEventsResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/events',
            query: {
                'scope': scope,
                'category': category,
                'chapterId': chapterId,
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * The next event still open for registration
     * For the home page highlight (HOM-02). `event` is null when nothing is coming up.
     * @returns NextUpcomingEventDto
     * @throws ApiError
     */
    public static getNextUpcomingEvent(): CancelablePromise<NextUpcomingEventDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/events/next-upcoming',
        });
    }
    /**
     * One event: dates, place, fee, flyer and description
     * @returns EventDetailDto
     * @throws ApiError
     */
    public static getPortalEvent({
        id,
    }: {
        id: string,
    }): CancelablePromise<EventDetailDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/events/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Who is taking part
     * Names only (EVT-21). A member outside the directory is counted, not named.
     * @returns ListEventParticipantsResponseDto
     * @throws ApiError
     */
    public static listEventParticipants({
        id,
    }: {
        id: string,
    }): CancelablePromise<ListEventParticipantsResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/events/{id}/participants',
            path: {
                'id': id,
            },
        });
    }
    /**
     * The event flyer
     * @returns binary
     * @throws ApiError
     */
    public static downloadEventFlyer({
        id,
    }: {
        id: string,
    }): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/events/{id}/flyer',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Bookable time slots, with the places left in each
     * @returns SlotDto
     * @throws ApiError
     */
    public static listEventSlots({
        id,
    }: {
        id: string,
    }): CancelablePromise<Array<SlotDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/events/{id}/slots',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Everything the registration form needs
     * The people in your household with the ticket and price each would get right now, the waiver to sign, the time slots and the places left.
     * @returns RegistrationOptionsDto
     * @throws ApiError
     */
    public static getEventRegistrationOptions({
        id,
    }: {
        id: string,
    }): CancelablePromise<RegistrationOptionsDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/events/{id}/registration-options',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Your household's registration for this event
     * @returns MyEventRegistrationDto
     * @throws ApiError
     */
    public static getMyEventRegistration({
        id,
    }: {
        id: string,
    }): CancelablePromise<MyEventRegistrationDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/events/{id}/my-registration',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Register your household
     * Everyone attending, in one registration and one payment (EVT-01). Refused after the closing date and when the event is full; prices are locked at this moment.
     * @returns EventRegistrationDto
     * @throws ApiError
     */
    public static createEventRegistration({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: CreateRegistrationDto,
    }): CancelablePromise<EventRegistrationDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/events/{id}/registrations',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Change dietary, T-shirt and hotel details on your registration
     * @returns EventRegistrationDto
     * @throws ApiError
     */
    public static updateMyEventPreferences({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: UpdatePreferencesDto,
    }): CancelablePromise<EventRegistrationDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/events/{id}/my-registration/preferences',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Cancel your registration
     * Only while nothing has been paid (EVT-23). After that, an administrator removes it.
     * @returns EventRegistrationDto
     * @throws ApiError
     */
    public static cancelMyEventRegistration({
        id,
    }: {
        id: string,
    }): CancelablePromise<EventRegistrationDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/events/{id}/my-registration/cancel',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Start paying for your registration
     * Opens a checkout for the balance. The registration is confirmed when the provider confirms the payment, not when the browser returns.
     * @returns EventCheckoutDto
     * @throws ApiError
     */
    public static startEventCheckout({
        id,
    }: {
        id: string,
    }): CancelablePromise<EventCheckoutDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/events/{id}/my-registration/checkout',
            path: {
                'id': id,
            },
        });
    }
}
