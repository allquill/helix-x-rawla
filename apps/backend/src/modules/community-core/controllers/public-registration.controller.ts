import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PUBLIC_REFERENCE_LIST_KEYS } from '../constants';
import {
  CheckRegistrationDuplicateDto,
  SubmitRegistrationDto,
} from '../models/registration.dto';
import {
  DuplicateProbeDto,
  PublicRegistrationConfigDto,
  RegistrationSubmittedDto,
} from '../models/registration-response.dto';
import { MemberRegistrationService } from '../providers/member-registration.service';
import { PortalSettingsService } from '../providers/portal-settings.service';
import { ReferenceDataService } from '../providers/reference-data.service';

/**
 * The anonymous surface of the portal (REG-01).
 *
 * No guards, by omission — the repo has no global guard, so a route without
 * `@UseGuards` is public. That also puts every route here outside the
 * activation gates, since the gate interceptor only engages when a request
 * carries an authenticated principal.
 */
@ApiTags('Portal Registration')
@Controller('public')
export class PublicRegistrationController {
  constructor(
    private readonly registration: MemberRegistrationService,
    private readonly settings: PortalSettingsService,
    private readonly referenceData: ReferenceDataService,
  ) {}

  @ApiOperation({ summary: 'Submit a membership application' })
  @ApiCreatedResponse({ type: RegistrationSubmittedDto })
  @Post('registrations')
  async submitMemberRegistration(
    @Body() dto: SubmitRegistrationDto,
    @Req() request: { ip?: string },
  ): Promise<RegistrationSubmittedDto> {
    const { memberId, status } = await this.registration.submit(dto, {
      ip: request.ip ?? null,
    });
    return {
      memberId,
      status: status as RegistrationSubmittedDto['status'],
      gates: { emailVerified: false, approved: false, paymentMade: false },
      message:
        'Check your email — we have sent a link to confirm your address and set your password.',
    };
  }

  @ApiOperation({ summary: 'Check whether an email or phone is already on file' })
  @ApiOkResponse({ type: DuplicateProbeDto })
  @HttpCode(HttpStatus.OK)
  @Post('registrations/check-duplicate')
  async checkRegistrationDuplicate(
    @Body() dto: CheckRegistrationDuplicateDto,
  ): Promise<DuplicateProbeDto> {
    return this.registration.probeDuplicate(dto);
  }

  /**
   * Everything the public form needs to render and validate itself.
   *
   * Serving the minimum age from here is what stops the client and the server
   * disagreeing about the age gate (ADM-09).
   */
  @ApiOperation({ summary: 'Public configuration for the registration form' })
  @ApiOkResponse({ type: PublicRegistrationConfigDto })
  @Get('config/registration')
  async getPublicRegistrationConfig(): Promise<PublicRegistrationConfigDto> {
    const options = await this.referenceData.optionsFor(PUBLIC_REFERENCE_LIST_KEYS);
    const tiers = (options.membership_tier ?? []).map((option) => {
      const meta = (option.metadata ?? {}) as { duesCents?: number; currency?: string };
      return {
        value: option.value,
        label: option.label,
        duesCents: Number(meta.duesCents ?? 0),
        currency: String(meta.currency ?? 'USD'),
      };
    });

    const referenceLists: Record<string, Array<{ value: string; label: string }>> = {};
    for (const [key, values] of Object.entries(options)) {
      referenceLists[key] = values.map(({ value, label }) => ({ value, label }));
    }

    return {
      minimumAge: this.settings.minimumAge,
      paymentRequired: this.settings.paymentRequired,
      consentVersion: this.settings.consentVersion,
      membershipTiers: tiers,
      referenceLists,
    };
  }
}
