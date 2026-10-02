import { unlink } from 'node:fs/promises';
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import multer from 'multer';
import { finalize, type Observable } from 'rxjs';
import { PORTAL_FILE_LIMITS, type PortalFileLimits } from './portal-file.service';

/**
 * Accepts one multipart `file`, spooled to the OS temp directory, plus the
 * form's text fields.
 *
 * The same shape as the framework's `DocumentUploadInterceptor`, which is not
 * exported and is bound to `DocumentsModule`'s options. Disk rather than
 * memory so a large upload is not held in the heap; `defParamCharset: 'utf8'`
 * (multer ≥ 2.1.0) keeps non-ASCII filenames intact. The temp file is removed
 * however the request ends.
 */
@Injectable()
export class PortalUploadInterceptor implements NestInterceptor {
  private readonly upload: ReturnType<ReturnType<typeof multer>['single']>;

  constructor(@Inject(PORTAL_FILE_LIMITS) private readonly limits: PortalFileLimits) {
    // @types/multer does not declare `defParamCharset` yet.
    const options: multer.Options & { defParamCharset: string } = {
      storage: multer.diskStorage({}),
      limits: { fileSize: limits.maxFileSizeBytes, files: 1, fields: 10 },
      defParamCharset: 'utf8',
    };
    this.upload = multer(options).single('file');
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    await new Promise<void>((resolve, reject) => {
      this.upload(request as never, response as never, (error: unknown) =>
        error ? reject(this.translate(error)) : resolve(),
      );
    });

    const spooled = (request as Request & { file?: { path?: string } }).file?.path;
    return next.handle().pipe(
      finalize(() => {
        if (spooled) void unlink(spooled).catch(() => undefined);
      }),
    );
  }

  private translate(error: unknown): Error {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return new PayloadTooLargeException(
          `File exceeds the ${this.limits.maxFileSizeBytes} byte limit`,
        );
      }
      return new BadRequestException(`Upload rejected: ${error.message}`);
    }
    return error instanceof Error ? error : new BadRequestException('Upload failed');
  }
}
