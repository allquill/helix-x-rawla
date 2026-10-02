import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { Transform, type Readable } from 'node:stream';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  StreamableFile,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import { Repository } from 'typeorm';
import {
  INLINE_PREVIEW_MIME_TYPES,
  toStorageFilename,
  type createDocumentStorage,
} from '@helix-x/backend';
import { PortalFile } from './entities/portal-file.entity';

export const PORTAL_FILE_STORAGE = 'PORTAL_FILE_STORAGE';
export const PORTAL_FILE_LIMITS = 'PORTAL_FILE_LIMITS';

export type PortalFileStorage = Awaited<ReturnType<typeof createDocumentStorage>>;

export interface PortalFileLimits {
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
}

/** A file multer has already spooled to a temp path. */
export interface UploadedPortalFile {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/** What a feature stores a file as — the folder it lands in. */
export type PortalFilePurpose = 'event-flyers' | 'event-documents' | 'certificates';

/**
 * Bytes in, bytes out. **It never decides who may read a file** — the caller
 * does, through `doc-level-rules`, before asking for the stream. Keeping the
 * decision out of here is what lets one event document be level 4 today and
 * level 5 after its event closes without touching the file.
 */
@Injectable()
export class PortalFileService {
  private readonly logger = new Logger(PortalFileService.name);

  constructor(
    @InjectRepository(PortalFile) private readonly fileRepo: Repository<PortalFile>,
    @Inject(PORTAL_FILE_STORAGE) private readonly storage: PortalFileStorage,
    @Inject(PORTAL_FILE_LIMITS) private readonly limits: PortalFileLimits,
  ) {}

  async store(
    file: UploadedPortalFile | undefined,
    purpose: PortalFilePurpose,
    userId: number,
  ): Promise<PortalFile> {
    if (!file) throw new BadRequestException('A file is required');
    if (file.size > this.limits.maxFileSizeBytes) {
      throw new BadRequestException(`File exceeds the ${this.limits.maxFileSizeBytes} byte limit`);
    }
    const mimeType = this.acceptedMimeType(file.mimetype);
    const name = file.originalname?.trim() || 'file';
    // The `portal/` prefix keeps these apart from the framework's documents,
    // which share the same root or bucket.
    const storageKey = `portal/${purpose}/${randomUUID()}/${toStorageFilename(name)}`;

    const hash = createHash('sha256');
    const hashing = new Transform({
      transform(chunk, _encoding, callback) {
        hash.update(chunk);
        callback(null, chunk);
      },
    });
    await this.storage.write(storageKey, createReadStream(file.path).pipe(hashing), {
      mimeType,
      size: file.size,
    });

    try {
      return await this.fileRepo.save(
        this.fileRepo.create({
          storageKey,
          name,
          mimeType,
          sizeBytes: file.size,
          checksumSha256: hash.digest('hex'),
          uploadedByUserId: userId,
        }),
      );
    } catch (error) {
      await this.deleteContentQuietly(storageKey);
      throw error;
    }
  }

  async get(fileId: string): Promise<PortalFile> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  /**
   * Stream a file the caller has already decided the viewer may read.
   *
   * The headers are the framework's: nothing stored here can run script in
   * the API's origin, and anything that is not a known previewable type is
   * forced to download whatever MIME type the uploader claimed.
   */
  async send(fileId: string, response: Response): Promise<StreamableFile> {
    const file = await this.get(fileId);
    let stream: Readable;
    try {
      stream = await this.storage.read(file.storageKey);
    } catch (error) {
      this.logger.error(
        `Content missing for portal file ${file.id} at ${file.storageKey}: ${(error as Error).message}`,
      );
      throw new NotFoundException('File content not found');
    }

    const inline = INLINE_PREVIEW_MIME_TYPES.includes(file.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    if (file.mimeType !== 'application/pdf') {
      response.setHeader(
        'Content-Security-Policy',
        "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      );
    }
    return new StreamableFile(stream, {
      type: inline ? file.mimeType : 'application/octet-stream',
      length: file.sizeBytes,
      disposition: contentDisposition(inline ? 'inline' : 'attachment', file.name),
    });
  }

  /** Delete the row and then its bytes. */
  async remove(fileId: string): Promise<void> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) return;
    await this.fileRepo.delete({ id: file.id });
    await this.deleteContentQuietly(file.storageKey);
  }

  private acceptedMimeType(claimed: string | undefined): string {
    const mimeType = (claimed ?? '').split(';')[0].trim().toLowerCase() || 'application/octet-stream';
    const allowed = this.limits.allowedMimeTypes;
    if (allowed.length) {
      const ok = allowed.some((pattern) => {
        const p = pattern.trim().toLowerCase();
        return p.endsWith('/*') ? mimeType.startsWith(p.slice(0, -1)) : mimeType === p;
      });
      if (!ok) throw new UnsupportedMediaTypeException(`Files of type ${mimeType} are not allowed`);
    }
    return mimeType;
  }

  private async deleteContentQuietly(storageKey: string): Promise<void> {
    try {
      await this.storage.deleteFile(storageKey);
    } catch (error) {
      // An orphaned object is recoverable; a row pointing at nothing is not.
      this.logger.warn(`Could not delete stored object ${storageKey}: ${(error as Error).message}`);
    }
  }
}

/** RFC 6266: an ASCII fallback plus the exact UTF-8 name. */
function contentDisposition(disposition: 'inline' | 'attachment', filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
