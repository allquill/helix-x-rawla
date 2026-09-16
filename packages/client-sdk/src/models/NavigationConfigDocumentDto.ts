/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type NavigationConfigDocumentDto = {
    /**
     * Document schema version.
     */
    version: number;
    /**
     * Nav-item overrides keyed by contribution id.
     */
    items: Record<string, any>;
    /**
     * Route overrides keyed by route id. Moving a path also moves every nav item that links to it.
     */
    routes?: Record<string, any>;
};

