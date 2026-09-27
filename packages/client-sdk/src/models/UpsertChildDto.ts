/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpsertChildDto = {
    firstName: string;
    middleName?: string;
    lastName: string;
    gender?: UpsertChildDto.gender;
    dateOfBirth: string;
    educationLevel?: string;
    achievements?: string;
};
export namespace UpsertChildDto {
    export enum gender {
        MALE = 'male',
        FEMALE = 'female',
    }
}

