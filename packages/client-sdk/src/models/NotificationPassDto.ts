/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type NotificationPassDto = {
    kind: string;
    scheduleKey: string;
    sent: number;
    failed: number;
    skippedOptOut: number;
    /**
     * Claimed but never confirmed sent — worth a look.
     */
    claimed: number;
};

