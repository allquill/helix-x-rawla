/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RegistrationChildDto = {
    firstName: string;
    middleName?: string;
    lastName: string;
    gender?: RegistrationChildDto.gender;
    dateOfBirth: string;
    sequence: number;
    educationLevel?: string;
    achievements?: string;
};
export namespace RegistrationChildDto {
    export enum gender {
        MALE = 'male',
        FEMALE = 'female',
    }
}

