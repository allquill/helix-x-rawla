import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
  type AuthenticatedUser,
} from '@helix-x/backend';
import { PORTAL_PERMISSIONS } from '../constants';
import { ReferenceList } from '../entities/reference-list.entity';
import { ReferenceListValue } from '../entities/reference-list-value.entity';
import {
  ChapterDto,
  ListAuditLogResponseDto,
  PortalSettingDto,
  ReferenceListDto,
  ReferenceListValueDto,
  StateChapterMappingDto,
  UpdatePortalSettingsDto,
  UpsertChapterDto,
  UpsertReferenceValueDto,
  UpsertStateChapterMappingDto,
} from '../models/admin.dto';
import { AuditService } from '../providers/audit.service';
import { ChapterService } from '../providers/chapter.service';
import { PortalSettingsService } from '../providers/portal-settings.service';
import { ReferenceDataService } from '../providers/reference-data.service';

/** Chapters, master data, activation settings and the audit log (CHP + ADM). */
@ApiTags('Portal Administration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class PortalAdminController {
  constructor(
    private readonly chapters: ChapterService,
    private readonly referenceData: ReferenceDataService,
    private readonly settings: PortalSettingsService,
    private readonly audit: AuditService,
    @InjectRepository(ReferenceList)
    private readonly listRepo: Repository<ReferenceList>,
    @InjectRepository(ReferenceListValue)
    private readonly valueRepo: Repository<ReferenceListValue>,
  ) {}

  // ─── Chapters (CHP-01 / CHP-02) ───────────────────────────────────────────

  @ApiOperation({ summary: 'List chapters' })
  @ApiOkResponse({ type: [ChapterDto] })
  @Permissions(PORTAL_PERMISSIONS.MEMBERS_READ)
  @Get('chapters')
  listPortalChapters(): Promise<ChapterDto[]> {
    return this.chapters.list(true) as unknown as Promise<ChapterDto[]>;
  }

  @ApiOperation({ summary: 'Create a chapter' })
  @Permissions(PORTAL_PERMISSIONS.CHAPTERS_MANAGE)
  @Post('chapters')
  async createPortalChapter(
    @Body() dto: UpsertChapterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChapterDto> {
    const chapter = await this.chapters.create(dto);
    await this.audit.record({
      actorUserId: user.id,
      action: 'chapter.created',
      entityType: 'chapter',
      entityId: chapter.id,
      after: { ...dto },
    });
    return chapter as unknown as ChapterDto;
  }

  @ApiOperation({ summary: 'Update a chapter' })
  @Permissions(PORTAL_PERMISSIONS.CHAPTERS_MANAGE)
  @Patch('chapters/:id')
  async updatePortalChapter(
    @Param('id') id: string,
    @Body() dto: UpsertChapterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChapterDto> {
    const chapter = await this.chapters.update(id, dto);
    await this.audit.record({
      actorUserId: user.id,
      action: 'chapter.updated',
      entityType: 'chapter',
      entityId: id,
      after: { ...dto },
    });
    return chapter as unknown as ChapterDto;
  }

  @ApiOperation({ summary: 'The state → chapter map that drives auto-assignment' })
  @ApiOkResponse({ type: [StateChapterMappingDto] })
  @Permissions(PORTAL_PERMISSIONS.MEMBERS_READ)
  @Get('chapters/state-map')
  getStateChapterMap(): Promise<StateChapterMappingDto[]> {
    return this.chapters.listStateMap() as unknown as Promise<StateChapterMappingDto[]>;
  }

  @ApiOperation({ summary: 'Map a state to a chapter' })
  @Permissions(PORTAL_PERMISSIONS.CHAPTERS_MANAGE)
  @Put('chapters/state-map')
  async updateStateChapterMap(
    @Body() dto: UpsertStateChapterMappingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StateChapterMappingDto> {
    const row = await this.chapters.upsertStateMapping(dto.stateCode, dto.chapterId);
    await this.audit.record({
      actorUserId: user.id,
      action: 'chapter.state_mapping.updated',
      entityType: 'state_chapter_map',
      entityId: row.id,
      after: { stateCode: row.stateCode, chapterId: row.chapterId },
    });
    return row as unknown as StateChapterMappingDto;
  }

  // ─── Master data (ADM-01) ─────────────────────────────────────────────────

  @ApiOperation({ summary: 'All reference lists with their values' })
  @ApiOkResponse({ type: [ReferenceListDto] })
  @Permissions(PORTAL_PERMISSIONS.MEMBERS_READ)
  @Get('reference-data')
  async listReferenceData(): Promise<ReferenceListDto[]> {
    const lists = await this.referenceData.listAll();
    return Promise.all(
      lists.map(async (list) => ({
        key: list.key,
        label: list.label,
        values: (await this.referenceData.valuesFor(list.key, true)).map((v) => ({
          id: v.id,
          value: v.value,
          label: v.label,
          sortOrder: v.sortOrder,
          isActive: v.isActive,
          metadata: v.metadata,
        })),
      })),
    );
  }

  @ApiOperation({ summary: 'Add a value to a reference list' })
  @Permissions(PORTAL_PERMISSIONS.MASTERDATA_MANAGE)
  @Post('reference-data/:key/values')
  async createReferenceDataValue(
    @Param('key') key: string,
    @Body() dto: UpsertReferenceValueDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReferenceListValueDto> {
    const list = await this.listRepo.findOneOrFail({ where: { key } });
    const row = await this.valueRepo.save(
      this.valueRepo.create({
        listId: list.id,
        value: dto.value,
        label: dto.label,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata ?? null,
      }),
    );
    await this.audit.record({
      actorUserId: user.id,
      action: 'reference_data.value_created',
      entityType: 'reference_list_value',
      entityId: row.id,
      after: { list: key, ...dto },
    });
    return row as unknown as ReferenceListValueDto;
  }

  @ApiOperation({
    summary: 'Update or deactivate a reference value',
    description:
      'Deactivating hides the option from new dropdowns without orphaning members who already chose it.',
  })
  @Permissions(PORTAL_PERMISSIONS.MASTERDATA_MANAGE)
  // No `:key` segment: the value id is a uuid and already unique, so repeating
  // the list here would be a path parameter the handler never reads — and one
  // the generated client could not fill.
  @Patch('reference-data/values/:id')
  async updateReferenceDataValue(
    @Param('id') id: string,
    @Body() dto: UpsertReferenceValueDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReferenceListValueDto> {
    const row = await this.valueRepo.findOneOrFail({ where: { id } });
    const before = { label: row.label, isActive: row.isActive, sortOrder: row.sortOrder };
    row.label = dto.label ?? row.label;
    row.sortOrder = dto.sortOrder ?? row.sortOrder;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    if (dto.metadata !== undefined) row.metadata = dto.metadata;
    await this.valueRepo.save(row);

    await this.audit.record({
      actorUserId: user.id,
      action: 'reference_data.value_updated',
      entityType: 'reference_list_value',
      entityId: id,
      before,
      after: { label: row.label, isActive: row.isActive, sortOrder: row.sortOrder },
    });
    return row as unknown as ReferenceListValueDto;
  }

  // ─── Activation settings (ADM-09 / ADM-11 / ADM-12) ───────────────────────

  @ApiOperation({ summary: 'All portal settings' })
  @ApiOkResponse({ type: [PortalSettingDto] })
  @Permissions(PORTAL_PERMISSIONS.SETTINGS_MANAGE)
  @Get('portal-settings')
  listPortalSettings(): Promise<PortalSettingDto[]> {
    return this.settings.list() as unknown as Promise<PortalSettingDto[]>;
  }

  @ApiOperation({
    summary: 'Update portal settings',
    description:
      'Writes are audited one row per changed key. Credential TTLs and resend limits are pushed into the verification-token policy immediately; links already in flight keep the parameters they were issued under.',
  })
  @ApiOkResponse({ type: [PortalSettingDto] })
  @Permissions(PORTAL_PERMISSIONS.SETTINGS_MANAGE)
  @Put('portal-settings')
  async updatePortalSettings(
    @Body() dto: UpdatePortalSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PortalSettingDto[]> {
    const changes = await this.settings.setMany(dto.values, user.id);
    for (const change of changes) {
      await this.audit.record({
        actorUserId: user.id,
        actorRoles: user.roles,
        action: 'portal_setting.updated',
        entityType: 'portal_setting',
        entityId: change.key,
        before: { value: change.before },
        after: { value: change.after },
      });
    }
    return this.settings.list() as unknown as Promise<PortalSettingDto[]>;
  }

  // ─── Audit (ADM-02 / AUD) ─────────────────────────────────────────────────

  @ApiOperation({ summary: 'The append-only change log' })
  @ApiOkResponse({ type: ListAuditLogResponseDto })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @Permissions(PORTAL_PERMISSIONS.AUDIT_READ)
  @Get('audit-logs')
  async listPortalAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ListAuditLogResponseDto> {
    return this.audit.list({ entityType, entityId, action, limit, offset });
  }
}
