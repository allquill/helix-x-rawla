import { resolve } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import type { DocumentsModuleOptions } from '@helix-x/backend';

/**
 * The document store's configuration, read from the environment.
 *
 * One function because two modules need the same answer: the framework's
 * `DocumentsModule` (members' private files) and this app's
 * `PortalFilesModule` (flyers, event bills, certificates), which writes to the
 * same root or bucket under its own `portal/` prefix.
 */
export function documentsOptions(config: ConfigService): DocumentsModuleOptions {
  const driver = config.get<string>('DOCUMENTS_STORAGE_DRIVER', 'local');
  const accessKeyId = config.get<string>('DOCUMENTS_S3_ACCESS_KEY_ID');
  const allowed = config.get<string>('DOCUMENTS_ALLOWED_MIME_TYPES', '');
  // Behind nginx the request's own origin is the backend's, so links are
  // built on the public one: API_PUBLIC_URL is an origin, the API is /api.
  const apiPublicUrl = config.get<string>('API_PUBLIC_URL');
  return {
    storage:
      driver === 's3'
        ? {
            driver: 's3' as const,
            bucket: config.getOrThrow<string>('DOCUMENTS_S3_BUCKET'),
            region: config.get<string>('DOCUMENTS_S3_REGION') || undefined,
            prefix: config.get<string>('DOCUMENTS_S3_PREFIX', ''),
            endpoint: config.get<string>('DOCUMENTS_S3_ENDPOINT') || undefined,
            forcePathStyle: config.get<string>('DOCUMENTS_S3_FORCE_PATH_STYLE') === 'true',
            credentials: accessKeyId
              ? {
                  accessKeyId,
                  secretAccessKey: config.getOrThrow<string>('DOCUMENTS_S3_SECRET_ACCESS_KEY'),
                }
              : undefined,
          }
        : {
            driver: 'local' as const,
            root: resolve(config.get<string>('DOCUMENTS_LOCAL_ROOT', 'data/documents')),
          },
    storageKeyNaming: (config.get<string>('DOCUMENTS_STORAGE_NAMING') || 'readable') as
      | 'readable'
      | 'opaque',
    signingSecret: config.getOrThrow<string>('DOCUMENTS_SIGNING_SECRET'),
    maxFileSizeBytes: Number(config.get<string>('DOCUMENTS_MAX_FILE_SIZE_MB', '50')) * 1024 * 1024,
    allowedMimeTypes: allowed
      .split(',')
      .map((type) => type.trim())
      .filter(Boolean),
    downloadLinkTtlSeconds: Number(config.get<string>('DOCUMENTS_LINK_TTL_SECONDS', '300')),
    publicBaseUrl:
      config.get<string>('DOCUMENTS_PUBLIC_BASE_URL') ||
      (apiPublicUrl ? `${apiPublicUrl.replace(/\/+$/, '')}/api` : undefined),
  };
}
