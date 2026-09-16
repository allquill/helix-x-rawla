/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpsertReferenceValueDto = {
    value: string;
    label: string;
    sortOrder?: number;
    isActive?: boolean;
    /**
     * For membership_tier: { duesCents, currency }.
     */
    metadata?: Record<string, any>;
};

