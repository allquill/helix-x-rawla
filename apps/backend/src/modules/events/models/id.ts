import { Injectable, NotFoundException, type PipeTransform } from '@nestjs/common';

/**
 * The shape of every primary key in this app: a uuid, with or without dashes
 * (the SQLite baseline seeded some without).
 *
 * PostgreSQL stores them in `uuid` columns and rejects anything else outright
 * — a path like `/events/new` would otherwise reach the database and come
 * back as a 500. Checking the shape first turns that into the 404 it is.
 */
export const ID_PATTERN =
  /^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/;

export const ID_MESSAGE = { message: '$property must be an id' };

/** A path id that is not even id-shaped names nothing: 404, like an unknown one. */
@Injectable()
export class IdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !ID_PATTERN.test(value)) throw new NotFoundException();
    return value;
  }
}
