import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
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
  ApiQuery,
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
import { GateExempt } from '../../community-core/decorators/gate-exempt.decorator';
import { type UploadedPortalFile } from '../../portal-files/portal-file.service';
import { PortalUploadInterceptor } from '../../portal-files/portal-upload.interceptor';
import { EVENT_PERMISSIONS } from '../constants';
import { IdPipe } from '../models/id';
import {
  CertificateDto,
  CreateWaiverTemplateDto,
  PublishWaiverVersionDto,
  TopVolunteersResponseDto,
  UploadCertificateDto,
  WaiverTemplateDto,
} from '../models/operations.dto';
import { CertificateService } from '../providers/certificate.service';
import { VolunteerService } from '../providers/volunteer.service';
import { WaiverService } from '../providers/waiver.service';

/** Top Volunteers — the Volunteers part of the Wall of Fame (VOL-06 / VOL-13). */
@ApiTags('Portal Volunteers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('volunteers')
export class PortalVolunteersController {
  constructor(private readonly volunteers: VolunteerService) {}

  @ApiOperation({
    summary: 'Top volunteers by hours served or events served at',
    description: 'Counts closed events. A member outside the directory keeps their place, unnamed.',
  })
  @ApiOkResponse({ type: TopVolunteersResponseDto })
  @ApiQuery({ name: 'metric', required: false, enum: ['hours', 'events'] })
  @ApiQuery({ name: 'chapterId', required: false })
  @ApiQuery({ name: 'group', required: false, enum: ['all', 'youth', 'adult'] })
  @ApiQuery({ name: 'limit', required: false })
  @Permissions(EVENT_PERMISSIONS.VOLUNTEERS_READ)
  @Get('top')
  async listTopVolunteers(
    @CurrentUser() user: AuthenticatedUser,
    @Query('metric') metric?: string,
    @Query('chapterId') chapterId?: string,
    @Query('group') group?: string,
    @Query('limit') limit?: string,
  ): Promise<TopVolunteersResponseDto> {
    return { items: await this.volunteers.top({ metric, chapterId, group, limit }, user) };
  }
}

/** Liability waivers and their versions (EVT-05). */
@ApiTags('Portal Waivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/waiver-templates')
export class PortalWaiversController {
  constructor(private readonly waivers: WaiverService) {}

  @ApiOperation({ summary: 'Every waiver, every version' })
  @ApiOkResponse({ type: [WaiverTemplateDto] })
  @Permissions(EVENT_PERMISSIONS.WAIVERS_MANAGE)
  @Get()
  listWaiverTemplates(): Promise<WaiverTemplateDto[]> {
    return this.waivers.list();
  }

  @ApiOperation({ summary: 'Write a new waiver' })
  @ApiCreatedResponse({ type: WaiverTemplateDto })
  @Permissions(EVENT_PERMISSIONS.WAIVERS_MANAGE)
  @Post()
  createWaiverTemplate(
    @Body() dto: CreateWaiverTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WaiverTemplateDto> {
    return this.waivers.create(dto, user);
  }

  @ApiOperation({
    summary: 'Publish the next version of a waiver',
    description: 'Existing signatures keep pointing at the version they agreed to.',
  })
  @ApiCreatedResponse({ type: WaiverTemplateDto })
  @Permissions(EVENT_PERMISSIONS.WAIVERS_MANAGE)
  @Post(':key/versions')
  publishWaiverTemplateVersion(
    @Param('key') key: string,
    @Body() dto: PublishWaiverVersionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WaiverTemplateDto> {
    return this.waivers.publishVersion(key, dto, user);
  }
}

/**
 * Certificates uploaded to a profile (REC-07) and downloaded by the member or
 * parent (REC-08).
 *
 * The two member routes are `@GateExempt()` like the rest of the profile: a
 * certificate is the member's own document and stays reachable if, say, their
 * dues lapse. Reading needs no permission beyond a session — the service
 * decides by ownership (DOC level 2) and answers 404 to anyone else.
 */
@ApiTags('Portal Certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class PortalCertificatesController {
  constructor(private readonly certificates: CertificateService) {}

  @ApiOperation({ summary: "Your certificates and your children's" })
  @ApiOkResponse({ type: [CertificateDto] })
  @GateExempt()
  @Get('members/me/certificates')
  listMyCertificates(@CurrentUser() user: AuthenticatedUser): Promise<CertificateDto[]> {
    return this.certificates.listMine(user);
  }

  @ApiOperation({ summary: "A member's certificates" })
  @ApiOkResponse({ type: [CertificateDto] })
  @Permissions(EVENT_PERMISSIONS.CERTIFICATES_UPLOAD)
  @Get('members/:memberId/certificates')
  listMemberCertificates(@Param('memberId', IdPipe) memberId: string): Promise<CertificateDto[]> {
    return this.certificates.listForMember(memberId);
  }

  @ApiOperation({ summary: "Upload a certificate to a member's profile, or their child's section of it" })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        childProfileId: { type: 'string' },
        eventId: { type: 'string' },
      },
    },
  })
  @ApiCreatedResponse({ type: CertificateDto })
  @Permissions(EVENT_PERMISSIONS.CERTIFICATES_UPLOAD)
  @UseInterceptors(PortalUploadInterceptor)
  @Post('members/:memberId/certificates')
  uploadMemberCertificate(
    @Param('memberId', IdPipe) memberId: string,
    @UploadedFile() file: UploadedPortalFile | undefined,
    @Body() dto: UploadCertificateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CertificateDto> {
    return this.certificates.upload(memberId, file, dto, user);
  }

  @ApiOperation({ summary: 'Download a certificate' })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @GateExempt()
  @Get('certificates/:certificateId/content')
  downloadCertificate(
    @Param('certificateId', IdPipe) certificateId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    return this.certificates.send(certificateId, user, response);
  }

  @ApiOperation({ summary: 'Delete a certificate' })
  @ApiNoContentResponse()
  @Permissions(EVENT_PERMISSIONS.CERTIFICATES_UPLOAD)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('certificates/:certificateId')
  deleteMemberCertificate(
    @Param('certificateId', IdPipe) certificateId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.certificates.remove(certificateId, user);
  }
}
