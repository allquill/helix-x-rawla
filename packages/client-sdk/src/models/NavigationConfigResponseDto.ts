/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NavigationConfigDocumentDto } from './NavigationConfigDocumentDto';
export type NavigationConfigResponseDto = {
    document: NavigationConfigDocumentDto;
    /**
     * Increments on every write.
     */
    revision: number;
    updatedByUserId?: number | null;
    updatedAt?: string | null;
};

