import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDocumentStorage, DEFAULT_MAX_FILE_SIZE_BYTES } from '@helix-x/backend';
import { documentsOptions } from '../../config/documents-options';
import { PortalFile } from './entities/portal-file.entity';
import {
  PORTAL_FILE_LIMITS,
  PORTAL_FILE_STORAGE,
  PortalFileService,
  type PortalFileLimits,
} from './portal-file.service';
import { PortalUploadInterceptor } from './portal-upload.interceptor';

/**
 * Files the portal keeps for its own features, governed by the DOC security
 * levels (§20.4) rather than by ownership and sharing.
 *
 * It opens its own handle on the document store — same root or bucket as the
 * framework's `DocumentsModule`, same size limit and MIME allow-list — because
 * that module's storage token is only visible to modules importing its
 * configured instance, and its services grant access by owner and share.
 *
 * `@Global()` so events, certificates and whatever comes next (TAX, FIN) take
 * `PortalFileService` without an import.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PortalFile])],
  providers: [
    {
      provide: PORTAL_FILE_STORAGE,
      useFactory: (config: ConfigService) => createDocumentStorage(documentsOptions(config).storage),
      inject: [ConfigService],
    },
    {
      provide: PORTAL_FILE_LIMITS,
      useFactory: (config: ConfigService): PortalFileLimits => {
        const options = documentsOptions(config);
        return {
          maxFileSizeBytes: options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES,
          allowedMimeTypes: options.allowedMimeTypes ?? [],
        };
      },
      inject: [ConfigService],
    },
    PortalFileService,
    PortalUploadInterceptor,
  ],
  exports: [PortalFileService, PortalUploadInterceptor, PORTAL_FILE_LIMITS],
})
export class PortalFilesModule {}
