/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EventDocumentDto = {
    id: string;
    kind: EventDocumentDto.kind;
    name: string;
    mimeType: string;
    sizeBytes: number;
    addedByUserId: number;
    createdAt: string;
};
export namespace EventDocumentDto {
    export enum kind {
        FINANCIAL_STATEMENT = 'financial_statement',
        BILL = 'bill',
        OTHER = 'other',
    }
}

