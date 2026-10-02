/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChapterFinanceLineDto } from './ChapterFinanceLineDto';
export type EventFinanceSummaryDto = {
    currency: string;
    chapters: Array<ChapterFinanceLineDto>;
    billedCents: number;
    revenueCents: number;
    costCents: number;
    netCents: number;
};

