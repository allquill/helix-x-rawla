/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EventDocumentDto } from './EventDocumentDto';
export type ListEventDocumentsResponseDto = {
    items: Array<EventDocumentDto>;
    /**
     * DOC security level in force: 4 while open, 5 once closed.
     */
    level: number;
};

