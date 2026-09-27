import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { GENDERS, type Gender } from '../constants';

/**
 * A child added or replaced after joining (MP-18).
 *
 * Unlike `RegistrationChildDto` there is no `sequence`: the server owns sibling
 * order once the record exists, so two requests cannot both claim "child 2".
 */
export class UpsertChildDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) firstName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) middleName?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) lastName: string;
  @ApiPropertyOptional({ enum: GENDERS }) @IsOptional() @IsIn(GENDERS as unknown as string[]) gender?: Gender;
  @ApiProperty({ example: '2015-08-03' }) @IsISO8601() dateOfBirth: string;
  @ApiPropertyOptional() @IsOptional() @IsString() educationLevel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() achievements?: string;
}
