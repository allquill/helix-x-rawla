/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NavigationConfigDocumentDto } from './NavigationConfigDocumentDto';
export type ReplaceNavigationConfigDto = {
    document: NavigationConfigDocumentDto;
    /**
     * Revision the edit was based on. When supplied and stale, the write is rejected so two administrators cannot silently overwrite each other.
     */
    baseRevision?: number;
};

