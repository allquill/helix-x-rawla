import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { GateExempt } from '../decorators/gate-exempt.decorator';
import {
  ListMembersResponseDto,
  MemberDetailDto,
} from '../models/member-response.dto';
import { DuesCheckoutDto, MemberStatusDto } from '../models/registration-response.dto';
import { ArchiveMemberDto } from '../models/vetting.dto';
import { UpsertChildDto } from '../models/household.dto';
import { RegistrationSpouseDto } from '../models/registration.dto';
import { UpdateMemberDto, UpdateMemberPrivacyDto } from '../models/member-update.dto';
import { DuesPaymentService } from '../providers/dues-payment.service';
import { HouseholdService } from '../providers/household.service';
import { MemberService } from '../providers/member.service';
import { MemberVettingService } from '../providers/member-vetting.service';

/**
 * Member records (module MP).
 *
 * `forbidNonWhitelisted` on the write paths is deliberate: the global pipe
 * whitelists silently, which would let `PATCH /members/:id` with `isActive` in
 * the body return 200 having quietly dropped it. The requirement is a 400 — a
 * caller trying to set a derived flag should be told they cannot, not left
 * believing they did.
 */
@ApiTags('Portal Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('members')
export class MemberController {
  constructor(
    private readonly members: MemberService,
    private readonly vetting: MemberVettingService,
    private readonly duesPayment: DuesPaymentService,
    private readonly household: HouseholdService,
  ) {}

  // ── Self-service. Reachable while gates are still closed (IAM-14). ────────

  @ApiOperation({ summary: "The signed-in member's own gate checklist" })
  @ApiOkResponse({ type: MemberStatusDto })
  @GateExempt()
  @Get('me/status')
  getMyMembershipStatus(@CurrentUser() user: AuthenticatedUser): Promise<MemberStatusDto> {
    return this.members.statusFor(user);
  }

  @ApiOperation({ summary: "The signed-in member's own profile" })
  @ApiOkResponse({ type: MemberDetailDto })
  @GateExempt()
  @Get('me')
  async getMyMemberProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberDetailDto> {
    const member = await this.members.byUserId(user.id);
    return this.members.detail(member.id, user, { all: true, chapterIds: [] });
  }

  @ApiOperation({ summary: 'Update your own profile' })
  @ApiOkResponse({ type: MemberDetailDto })
  @GateExempt()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  @Patch('me')
  async updateMyMemberProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMemberDto,
  ): Promise<MemberDetailDto> {
    const member = await this.members.byUserId(user.id);
    await this.members.applyProfileUpdate(member.id, dto, user);
    return this.members.detail(member.id, user, { all: true, chapterIds: [] });
  }

  @ApiOperation({ summary: 'Directory opt-out and per-field visibility' })
  @ApiOkResponse({ type: MemberStatusDto })
  @GateExempt()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  @Patch('me/privacy')
  updateMyMemberPrivacy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMemberPrivacyDto,
  ): Promise<MemberStatusDto> {
    return this.members.updatePrivacy(user, dto);
  }

  @ApiOperation({
    summary: 'Start paying your membership dues',
    description:
      'Opens a checkout for the dues of your tier. Available once your email is verified, ' +
      'whether or not your application has been approved yet. The payment gate closes when ' +
      'the provider confirms the payment, not when the browser returns.',
  })
  @ApiCreatedResponse({ type: DuesCheckoutDto })
  @GateExempt()
  @Post('me/payments/checkout')
  createMyDuesCheckout(@CurrentUser() user: AuthenticatedUser): Promise<DuesCheckoutDto> {
    return this.duesPayment.startCheckout(user);
  }

  // ── Household (MP-17 / MP-18). Optional at joining, so filled in here. ────
  //
  // Gate-exempt like the rest of the profile: an applicant still waiting on
  // approval or dues may complete their household in the meantime. Every
  // route resolves the member from the session, never from the request.

  @ApiOperation({ summary: 'Add or replace your spouse' })
  @ApiOkResponse({ type: MemberDetailDto })
  @GateExempt()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  @Put('me/spouse')
  async upsertMySpouse(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegistrationSpouseDto,
  ): Promise<MemberDetailDto> {
    const member = await this.members.byUserId(user.id);
    await this.household.upsertSpouse(member, dto, user);
    return this.members.detail(member.id, user, { all: true, chapterIds: [] });
  }

  @ApiOperation({ summary: 'Remove your spouse record' })
  @ApiOkResponse({ type: MemberDetailDto })
  @GateExempt()
  @Delete('me/spouse')
  async removeMySpouse(@CurrentUser() user: AuthenticatedUser): Promise<MemberDetailDto> {
    const member = await this.members.byUserId(user.id);
    await this.household.removeSpouse(member, user);
    return this.members.detail(member.id, user, { all: true, chapterIds: [] });
  }

  @ApiOperation({ summary: 'Add a child to your household' })
  @ApiCreatedResponse({ type: MemberDetailDto })
  @GateExempt()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  @Post('me/children')
  async addMyChild(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertChildDto,
  ): Promise<MemberDetailDto> {
    const member = await this.members.byUserId(user.id);
    await this.household.addChild(member, dto, user);
    return this.members.detail(member.id, user, { all: true, chapterIds: [] });
  }

  @ApiOperation({ summary: "Replace one child's details" })
  @ApiOkResponse({ type: MemberDetailDto })
  @GateExempt()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  @Put('me/children/:childId')
  async updateMyChild(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
    @Body() dto: UpsertChildDto,
  ): Promise<MemberDetailDto> {
    const member = await this.members.byUserId(user.id);
    await this.household.updateChild(member, childId, dto, user);
    return this.members.detail(member.id, user, { all: true, chapterIds: [] });
  }

  @ApiOperation({ summary: 'Remove a child from your household' })
  @ApiOkResponse({ type: MemberDetailDto })
  @GateExempt()
  @Delete('me/children/:childId')
  async removeMyChild(
    @CurrentUser() user: AuthenticatedUser,
    @Param('childId') childId: string,
  ): Promise<MemberDetailDto> {
    const member = await this.members.byUserId(user.id);
    await this.household.removeChild(member, childId, user);
    return this.members.detail(member.id, user, { all: true, chapterIds: [] });
  }

  // ── Directory and administration. Gated normally. ─────────────────────────

  @ApiOperation({ summary: 'List members' })
  @ApiOkResponse({ type: ListMembersResponseDto })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'gotra', required: false })
  @ApiQuery({ name: 'caste', required: false })
  @ApiQuery({ name: 'membershipTier', required: false })
  @ApiQuery({ name: 'chapterId', required: false })
  // String, not Boolean: the handler receives the raw query value and compares
  // it to 'true' itself. Declaring Boolean here made the generated client send
  // a boolean for a parameter the server reads as a string.
  @ApiQuery({ name: 'isActive', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @Permissions(PORTAL_PERMISSIONS.MEMBERS_READ)
  @Get()
  async listPortalMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('gotra') gotra?: string,
    @Query('caste') caste?: string,
    @Query('membershipTier') membershipTier?: string,
    @Query('chapterId') chapterId?: string,
    @Query('isActive') isActive?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ListMembersResponseDto> {
    const scope = await this.members.scopeFor(user);
    return this.members.list(
      {
        search, status, gotra, caste, membershipTier, chapterId,
        isActive: isActive === undefined ? undefined : isActive === 'true',
        limit, offset,
      },
      scope,
      user,
    );
  }

  @ApiOperation({ summary: 'One member, filtered to what the viewer may see' })
  @ApiOkResponse({ type: MemberDetailDto })
  @Permissions(PORTAL_PERMISSIONS.MEMBERS_READ)
  @Get(':id')
  async getPortalMember(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberDetailDto> {
    return this.members.detail(id, user, await this.members.scopeFor(user));
  }

  @ApiOperation({ summary: 'Administrative edit of a member record' })
  @ApiOkResponse({ type: MemberDetailDto })
  @Permissions(PORTAL_PERMISSIONS.MEMBERS_WRITE)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  @Patch(':id')
  async updatePortalMember(
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberDetailDto> {
    await this.members.applyProfileUpdate(id, dto, user);
    return this.members.detail(id, user, await this.members.scopeFor(user));
  }

  @ApiOperation({
    summary: 'Archive a member',
    description: 'Retains the gate flags, so reinstatement does not require re-payment.',
  })
  @Permissions(PORTAL_PERMISSIONS.MEMBERS_WRITE)
  @Post(':id/archive')
  async archivePortalMember(
    @Param('id') id: string,
    @Body() dto: ArchiveMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberDetailDto> {
    await this.vetting.archive(id, user, dto.reason);
    return this.members.detail(id, user, await this.members.scopeFor(user));
  }

  @ApiOperation({ summary: 'Reinstate an archived member' })
  @Permissions(PORTAL_PERMISSIONS.MEMBERS_WRITE)
  @Post(':id/reinstate')
  async reinstatePortalMember(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberDetailDto> {
    await this.vetting.reinstate(id, user);
    return this.members.detail(id, user, await this.members.scopeFor(user));
  }
}
