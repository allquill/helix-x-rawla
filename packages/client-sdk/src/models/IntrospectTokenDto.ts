/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type IntrospectTokenDto = {
    token: string;
    token_type_hint?: IntrospectTokenDto.token_type_hint;
};
export namespace IntrospectTokenDto {
    export enum token_type_hint {
        ACCESS_TOKEN = 'access_token',
        REFRESH_TOKEN = 'refresh_token',
    }
}

