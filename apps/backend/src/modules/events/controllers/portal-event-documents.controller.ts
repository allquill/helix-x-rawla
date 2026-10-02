import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  CurrentUser,
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
  type AuthenticatedUser,
} from '@helix-x/backend';
import { type UploadedPortalFile } from '../../portal-files/portal-file.service';
import { PortalUploadInterceptor } from '../../portal-files/portal-upload.interceptor';
import { EVENT_DOCUMENT_KINDS, EVENT_PERMISSIONS } from '../constants';
import { IdPipe } from '../models/id';
import {
  EventDocumentDto,
  ListEventDocumentsResponseDto,
  UploadEventDocumentDto,
} from '../models/operations.dto';
import { EventLedgerService } from '../providers/event-ledger.service';

/**
 * An event's financial statements and bills (EVT-24).
 *
 * `events:documents.read` only opens the door. Whether the caller may see a
 * given event's documents is the DOC security level, decided in
 * `EventLedgerService`: level 4 (Admins and all Secretaries) while the event
 * is open, level 5 (Finance and General Secretaries) once it is closed. The
 * read routes answer 403 `DOCUMENT_LEVEL_RESTRICTED` to a holder of the
 * permission who is below the level.
 */
@ApiTags('Portal Event Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/events/:id/documents')
export class PortalEventDocumentsController {
  constructor(private readonly ledger: EventLedgerService) {}

  @ApiOperation({ summary: "An event's statements and bills, with the security level in force" })
  @ApiOkResponse({ type: ListEventDocumentsResponseDto })
  @Permissions(EVENT_PERMISSIONS.DOCUMENTS_READ)
  @Get()
  listEventDocuments(
    @Param('id', IdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListEventDocumentsResponseDto> {
    return this.ledger.listDocuments(id, user);
  }

  @ApiOperation({ summary: 'Attach a document', description: 'Any time before the event is closed.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        kind: { type: 'string', enum: [...EVENT_DOCUMENT_KINDS] },
      },
    },
  })
  @ApiCreatedResponse({ type: EventDocumentDto })
  @Permissions(EVENT_PERMISSIONS.DOCUMENTS_MANAGE)
  @UseInterceptors(PortalUploadInterceptor)
  @Post()
  uploadEventDocument(
    @Param('id', IdPipe) id: string,
    @UploadedFile() file: UploadedPortalFile | undefined,
    @Body() dto: UploadEventDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EventDocumentDto> {
    return this.ledger.uploadDocument(id, file, dto.kind, user);
  }

  @ApiOperation({ summary: 'Download a document' })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @Permissions(EVENT_PERMISSIONS.DOCUMENTS_READ)
  @Get(':documentId/content')
  downloadEventDocument(
    @Param('id', IdPipe) id: string,
    @Param('documentId', IdPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    return this.ledger.sendDocument(id, documentId, user, response);
  }

  @ApiOperation({ summary: 'Delete a document, before the event is closed' })
  @ApiNoContentResponse()
  @Permissions(EVENT_PERMISSIONS.DOCUMENTS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':documentId')
  deleteEventDocument(
    @Param('id', IdPipe) id: string,
    @Param('documentId', IdPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.ledger.deleteDocument(id, documentId, user);
  }
}
