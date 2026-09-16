/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RevokeTokenDto = {
    token: string;
    token_type_hint?: RevokeTokenDto.token_type_hint;
};
export namespace RevokeTokenDto {
    export enum token_type_hint {
        ACCESS_TOKEN = 'access_token',
        REFRESH_TOKEN = 'refresh_token',
    }
}

