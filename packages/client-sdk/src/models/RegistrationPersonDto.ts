/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RegistrationPersonDto = {
    personKey: string;
    personType: RegistrationPersonDto.personType;
    fullName: string;
    isYouth: boolean;
    /**
     * Null when no ticket covers this person.
     */
    ticketTypeId?: string | null;
    ticketTypeName?: string | null;
    unitPriceCents?: number | null;
    pricingTier?: RegistrationPersonDto.pricingTier | null;
};
export namespace RegistrationPersonDto {
    export enum personType {
        MEMBER = 'member',
        SPOUSE = 'spouse',
        CHILD = 'child',
    }
    export enum pricingTier {
        EARLY_BIRD = 'early_bird',
        STANDARD = 'standard',
    }
}

