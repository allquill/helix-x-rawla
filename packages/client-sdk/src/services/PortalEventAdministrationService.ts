/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminEventDto } from '../models/AdminEventDto';
import type { AdminEventRegistrationDto } from '../models/AdminEventRegistrationDto';
import type { CloseEventDto } from '../models/CloseEventDto';
import type { ClosePreviewDto } from '../models/ClosePreviewDto';
import type { CreateDonatedGoodDto } from '../models/CreateDonatedGoodDto';
import type { CreateEventCostDto } from '../models/CreateEventCostDto';
import type { CreateEventDto } from '../models/CreateEventDto';
import type { DonatedGoodDto } from '../models/DonatedGoodDto';
import type { EventCostDto } from '../models/EventCostDto';
import type { EventFinanceSummaryDto } from '../models/EventFinanceSummaryDto';
import type { EventNotificationStatusDto } from '../models/EventNotificationStatusDto';
import type { EventVolunteerDto } from '../models/EventVolunteerDto';
import type { ListAdminEventsResponseDto } from '../models/ListAdminEventsResponseDto';
import type { ListEventRegistrationsResponseDto } from '../models/ListEventRegistrationsResponseDto';
import type { RecordEventPaymentDto } from '../models/RecordEventPaymentDto';
import type { RemoveRegistrationDto } from '../models/RemoveRegistrationDto';
import type { SaveVolunteerHoursDto } from '../models/SaveVolunteerHoursDto';
import type { SetPhotosLinkDto } from '../models/SetPhotosLinkDto';
import type { SlotDto } from '../models/SlotDto';
import type { TicketTypeDto } from '../models/TicketTypeDto';
import type { UpdateEventDto } from '../models/UpdateEventDto';
import type { UpsertSlotDto } from '../models/UpsertSlotDto';
import type { UpsertTicketTypeDto } from '../models/UpsertTicketTypeDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PortalEventAdministrationService {
    /**
     * Create an event, as a draft (EVT-16)
     * @returns AdminEventDto
     * @throws ApiError
     */
    public static createPortalEvent({
        requestBody,
    }: {
        requestBody: CreateEventDto,
    }): CancelablePromise<AdminEventDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/events',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Every event, drafts included, with registration totals
     * @returns ListAdminEventsResponseDto
     * @throws ApiError
     */
    public static listAdminEvents({
        status,
        category,
        limit,
        offset,
    }: {
        status?: 'draft' | 'published' | 'closed',
        category?: 'mel' | 'annual_chapter' | 'local_charity',
        limit?: string,
        offset?: string,
    }): CancelablePromise<ListAdminEventsResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/events',
            query: {
                'status': status,
                'category': category,
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * One event, for the people running it
     * @returns AdminEventDto
     * @throws ApiError
     */
    public static getAdminEvent({
        id,
    }: {
        id: string,
    }): CancelablePromise<AdminEventDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/events/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Edit an event
     * @returns AdminEventDto
     * @throws ApiError
     */
    public static updatePortalEvent({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: UpdateEventDto,
    }): CancelablePromise<AdminEventDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/admin/events/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Publish a draft
     * Members can now see it and register, and the invitation is sent (EVT-22).
     * @returns AdminEventDto
     * @throws ApiError
     */
    public static publishPortalEvent({
        id,
    }: {
        id: string,
    }): CancelablePromise<AdminEventDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/events/{id}/publish',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Upload or replace the flyer
     * @returns AdminEventDto
     * @throws ApiError
     */
    public static uploadEventFlyer({
        id,
        formData,
    }: {
        id: string,
        formData: {
            file: Blob;
        },
    }): CancelablePromise<AdminEventDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/events/{id}/flyer',
            path: {
                'id': id,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
    /**
     * Post or remove the link to the event photos (EVT-25)
     * @returns AdminEventDto
     * @throws ApiError
     */
    public static setEventPhotosLink({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: SetPhotosLinkDto,
    }): CancelablePromise<AdminEventDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/admin/events/{id}/photos-link',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Add an age-banded ticket
     * @returns TicketTypeDto
     * @throws ApiError
     */
    public static createEventTicketType({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: UpsertTicketTypeDto,
    }): CancelablePromise<TicketTypeDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/events/{id}/ticket-types',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Edit a ticket
     * Prices already locked on registrations do not change.
     * @returns TicketTypeDto
     * @throws ApiError
     */
    public static updateEventTicketType({
        id,
        ticketTypeId,
        requestBody,
    }: {
        id: string,
        ticketTypeId: string,
        requestBody: UpsertTicketTypeDto,
    }): CancelablePromise<TicketTypeDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/admin/events/{id}/ticket-types/{ticketTypeId}',
            path: {
                'id': id,
                'ticketTypeId': ticketTypeId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete a ticket nobody holds
     * @returns void
     * @throws ApiError
     */
    public static deleteEventTicketType({
        id,
        ticketTypeId,
    }: {
        id: string,
        ticketTypeId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/events/{id}/ticket-types/{ticketTypeId}',
            path: {
                'id': id,
                'ticketTypeId': ticketTypeId,
            },
        });
    }
    /**
     * An event's time slots, drafts included
     * @returns SlotDto
     * @throws ApiError
     */
    public static listAdminEventSlots({
        id,
    }: {
        id: string,
    }): CancelablePromise<Array<SlotDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/events/{id}/slots',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Add a bookable time slot
     * @returns SlotDto
     * @throws ApiError
     */
    public static createEventSlot({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: UpsertSlotDto,
    }): CancelablePromise<SlotDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/events/{id}/slots',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Edit a time slot
     * @returns SlotDto
     * @throws ApiError
     */
    public static updateEventSlot({
        id,
        slotId,
        requestBody,
    }: {
        id: string,
        slotId: string,
        requestBody: UpsertSlotDto,
    }): CancelablePromise<SlotDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/admin/events/{id}/slots/{slotId}',
            path: {
                'id': id,
                'slotId': slotId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete a time slot nobody has booked
     * @returns void
     * @throws ApiError
     */
    public static deleteEventSlot({
        id,
        slotId,
    }: {
        id: string,
        slotId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/events/{id}/slots/{slotId}',
            path: {
                'id': id,
                'slotId': slotId,
            },
        });
    }
    /**
     * An event's registrations, with amounts and preferences
     * @returns ListEventRegistrationsResponseDto
     * @throws ApiError
     */
    public static listEventRegistrations({
        id,
        status,
        q,
        limit,
        offset,
    }: {
        id: string,
        status?: 'pending_payment' | 'confirmed' | 'cancelled' | 'removed_by_admin',
        /**
         * Purchaser name
         */
        q?: string,
        limit?: string,
        offset?: string,
    }): CancelablePromise<ListEventRegistrationsResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/events/{id}/registrations',
            path: {
                'id': id,
            },
            query: {
                'status': status,
                'q': q,
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * One registration
     * @returns AdminEventRegistrationDto
     * @throws ApiError
     */
    public static getEventRegistration({
        id,
        registrationId,
    }: {
        id: string,
        registrationId: string,
    }): CancelablePromise<AdminEventRegistrationDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/events/{id}/registrations/{registrationId}',
            path: {
                'id': id,
                'registrationId': registrationId,
            },
        });
    }
    /**
     * Record a payment received outside the checkout (EVT-20)
     * Zelle, cheque, cash. The actor, time and reference are kept and audited.
     * @returns AdminEventRegistrationDto
     * @throws ApiError
     */
    public static recordEventPayment({
        id,
        registrationId,
        requestBody,
    }: {
        id: string,
        registrationId: string,
        requestBody: RecordEventPaymentDto,
    }): CancelablePromise<AdminEventRegistrationDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/events/{id}/registrations/{registrationId}/payments',
            path: {
                'id': id,
                'registrationId': registrationId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Remove a household from the event (EVT-23)
     * Whatever it has paid. A reason is required. Refunds are handled outside the portal.
     * @returns AdminEventRegistrationDto
     * @throws ApiError
     */
    public static removeEventRegistration({
        id,
        registrationId,
        requestBody,
    }: {
        id: string,
        registrationId: string,
        requestBody: RemoveRegistrationDto,
    }): CancelablePromise<AdminEventRegistrationDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/events/{id}/registrations/{registrationId}/remove',
            path: {
                'id': id,
                'registrationId': registrationId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Everyone volunteering at the event, with their hours so far
     * @returns EventVolunteerDto
     * @throws ApiError
     */
    public static listEventVolunteers({
        id,
    }: {
        id: string,
    }): CancelablePromise<Array<EventVolunteerDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/events/{id}/volunteers',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Enter or correct volunteer hours
     * @returns EventVolunteerDto
     * @throws ApiError
     */
    public static saveEventVolunteerHours({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: SaveVolunteerHoursDto,
    }): CancelablePromise<Array<EventVolunteerDto>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/admin/events/{id}/volunteer-hours',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Whether the event can be closed, and what closing will do
     * @returns ClosePreviewDto
     * @throws ApiError
     */
    public static getEventClosePreview({
        id,
    }: {
        id: string,
    }): CancelablePromise<ClosePreviewDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/events/{id}/close-preview',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Close the event — permanently
     * Needs hours for every volunteer (zero is allowed). From then on every write to the event is refused with 409 and its statements and bills are visible only to the Finance and General Secretaries. A closed event cannot be reopened.
     * @returns AdminEventDto
     * @throws ApiError
     */
    public static closePortalEvent({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: CloseEventDto,
    }): CancelablePromise<AdminEventDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/events/{id}/close',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Goods donated for the event
     * @returns DonatedGoodDto
     * @throws ApiError
     */
    public static listEventDonatedGoods({
        id,
    }: {
        id: string,
    }): CancelablePromise<Array<DonatedGoodDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/events/{id}/donated-goods',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Record donated goods, with the donor
     * @returns DonatedGoodDto
     * @throws ApiError
     */
    public static addEventDonatedGood({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: CreateDonatedGoodDto,
    }): CancelablePromise<DonatedGoodDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/events/{id}/donated-goods',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete a donated-goods entry
     * @returns void
     * @throws ApiError
     */
    public static deleteEventDonatedGood({
        id,
        goodId,
    }: {
        id: string,
        goodId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/events/{id}/donated-goods/{goodId}',
            path: {
                'id': id,
                'goodId': goodId,
            },
        });
    }
    /**
     * The event's costs
     * @returns EventCostDto
     * @throws ApiError
     */
    public static listEventCosts({
        id,
    }: {
        id: string,
    }): CancelablePromise<Array<EventCostDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/events/{id}/costs',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Record a cost against a chapter
     * @returns EventCostDto
     * @throws ApiError
     */
    public static addEventCost({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: CreateEventCostDto,
    }): CancelablePromise<Array<EventCostDto>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/events/{id}/costs',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete a cost
     * @returns void
     * @throws ApiError
     */
    public static deleteEventCost({
        id,
        costId,
    }: {
        id: string,
        costId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/admin/events/{id}/costs/{costId}',
            path: {
                'id': id,
                'costId': costId,
            },
        });
    }
    /**
     * Revenue and cost by chapter
     * @returns EventFinanceSummaryDto
     * @throws ApiError
     */
    public static getEventFinanceSummary({
        id,
    }: {
        id: string,
    }): CancelablePromise<EventFinanceSummaryDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/events/{id}/finance-summary',
            path: {
                'id': id,
            },
        });
    }
    /**
     * What has been sent: the invitation and each reminder
     * @returns EventNotificationStatusDto
     * @throws ApiError
     */
    public static getEventNotificationStatus({
        id,
    }: {
        id: string,
    }): CancelablePromise<EventNotificationStatusDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/admin/events/{id}/notifications',
            path: {
                'id': id,
            },
        });
    }
}
