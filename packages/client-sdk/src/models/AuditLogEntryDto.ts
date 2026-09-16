/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AuditLogEntryDto = {
    id: string;
    actorUserId?: number;
    action: string;
    entityType: string;
    entityId?: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    reason?: string;
    createdAt: string;
};

