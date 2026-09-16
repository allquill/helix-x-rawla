/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DuplicateProbeDto = {
    /**
     * True when the email is already registered — a hard block.
     */
    emailTaken: boolean;
    /**
     * True when the phone is on file. A warning, not a block: households share numbers.
     */
    phoneSeen: boolean;
    action: DuplicateProbeDto.action;
};
export namespace DuplicateProbeDto {
    export enum action {
        PROCEED = 'proceed',
        RECOVER = 'recover',
        ACKNOWLEDGE = 'acknowledge',
    }
}

