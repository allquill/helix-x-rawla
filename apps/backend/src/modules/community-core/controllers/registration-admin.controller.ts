import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import type { ListMembersResponseDto, MemberDetailDto } from '../models/member-response.dto';
import { ListAuditLogResponseDto } from '../models/admin.dto';
import {
  OverrideEmailVerificationDto,
  RejectRegistrationDto,
  RequestRegistrationInfoDto,
  SetPaymentStatusDto,
} from '../models/vetting.dto';
import { AuditService } from '../providers/audit.service';
import { MemberService } from '../providers/member.service';
import { MemberVettingService } from '../providers/member-vetting.service';

/** The Membership Secretary's vetting queue (REG-09 … REG-16, REG-23). */
@ApiTags('Portal Registrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('registrations')
export class RegistrationAdminController {
  constructor(
    private readonly vetting: MemberVettingService,
    private readonly members: MemberService,
    private readonly audit: AuditService,
  ) {}

  @ApiOperation({ summary: 'List applications by status' })
  @ApiQuery({ name: 'status', required: false, example: 'pending' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @Permissions(PORTAL_PERMISSIONS.REGISTRATION_READ)
  @Get()
  async listMemberRegistrations(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ListMembersResponseDto> {
    const scope = await this.members.scopeFor(user);
    // Applications that have not confirmed their address stay out of the queue
    // (REG-09): an unverified application must not consume a reviewer's time.
    const effectiveStatus = status ?? 'pending';
    return this.members.list(
      { status: effectiveStatus, search, limit, offset },
      scope,
      user,
    );
  }

  @ApiOperation({ summary: 'Open one application for review' })
  @Permissions(PORTAL_PERMISSIONS.REGISTRATION_READ)
  @Get(':id')
  async getMemberRegistration(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberDetailDto> {
    const scope = await this.members.scopeFor(user);
    await this.vetting.startReview(id, user);
    return this.members.detail(id, user, scope);
  }

  @ApiOperation({
    summary: 'Approve an application',
    description:
      'Sets is_approved and allocates the Member ID. Approval alone does not activate the account — the dues gate must also close.',
  })
  @Permissions(PORTAL_PERMISSIONS.REGISTRATION_APPROVE)
  @Post(':id/approve')
  async approveMemberRegistration(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberDetailDto> {
    await this.vetting.approve(id, user);
    return this.members.detail(id, user, await this.members.scopeFor(user));
  }

  @ApiOperation({ summary: 'Reject an application (reason required)' })
  @Permissions(PORTAL_PERMISSIONS.REGISTRATION_APPROVE)
  @Post(':id/reject')
  async rejectMemberRegistration(
    @Param('id') id: string,
    @Body() dto: RejectRegistrationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberDetailDto> {
    await this.vetting.reject(id, dto.reason, user);
    return this.members.detail(id, user, await this.members.scopeFor(user));
  }

  @ApiOperation({ summary: 'Ask the applicant for more information' })
  @Permissions(PORTAL_PERMISSIONS.REGISTRATION_APPROVE)
  @Post(':id/request-info')
  async requestMemberRegistrationInfo(
    @Param('id') id: string,
    @Body() dto: RequestRegistrationInfoDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberDetailDto> {
    await this.vetting.requestInfo(id, dto.message, user);
    return this.members.detail(id, user, await this.members.scopeFor(user));
  }

  @ApiOperation({
    summary: 'Set or clear the dues gate by hand',
    description:
      'For cheque, Zelle, cash, waived, honorary and complimentary memberships. Reason is mandatory; clearing the flag deactivates a live member.',
  })
  @Permissions(PORTAL_PERMISSIONS.REGISTRATION_PAYMENT_OVERRIDE)
  @Post(':id/payment-status')
  async setMemberPaymentStatus(
    @Param('id') id: string,
    @Body() dto: SetPaymentStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberDetailDto> {
    await this.vetting.setPaymentStatus(id, dto, user);
    return this.members.detail(id, user, await this.members.scopeFor(user));
  }

  @ApiOperation({ summary: 'Mark an email address verified manually' })
  @Permissions(PORTAL_PERMISSIONS.REGISTRATION_EMAIL_OVERRIDE)
  @Post(':id/email-verification')
  async overrideMemberEmailVerification(
    @Param('id') id: string,
    @Body() dto: OverrideEmailVerificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberDetailDto> {
    await this.vetting.overrideEmailVerification(id, dto.reason, user);
    return this.members.detail(id, user, await this.members.scopeFor(user));
  }

  @ApiOperation({ summary: 'The append-only history of one application' })
  @ApiOkResponse({ type: ListAuditLogResponseDto })
  @Permissions(PORTAL_PERMISSIONS.REGISTRATION_READ)
  @Get(':id/audit')
  async getMemberRegistrationAudit(
    @Param('id') id: string,
  ): Promise<ListAuditLogResponseDto> {
    const { items, total } = await this.audit.list({ entityType: 'member', entityId: id });
    return { items, total };
  }
}
