import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { VerificationTokenService } from '@helix-x/backend';
import { SETTING_KEYS } from '../constants';
import { PortalSettingsService } from './portal-settings.service';

/**
 * Pushes the ADM-12 link parameters into the framework's token service.
 *
 * Separate from `PortalSettingsService` on purpose. That service sits on the
 * dependency chain behind `AUTH_HOOKS`, which `AuthService` resolves at
 * construction; giving it a dependency on `VerificationTokenService` would run
 * that chain back into `AuthModule` for no benefit. Keeping the coupling here,
 * in a provider nothing in the auth path depends on, leaves the hooks graph
 * flat.
 *
 * ADM-12 needs no new mechanism: the framework already exposes `setPolicy`.
 * Links already in flight keep the parameters they were issued under, because
 * the expiry is stamped onto the token row at issue time rather than read back
 * from policy at redemption.
 */
@Injectable()
export class CredentialPolicyService implements OnModuleInit {
  private readonly logger = new Logger(CredentialPolicyService.name);

  constructor(
    private readonly settings: PortalSettingsService,
    private readonly tokens: VerificationTokenService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.apply();
  }

  apply(): void {
    try {
      this.tokens.setPolicy({
        ttlMinutes: {
          email_verification: this.settings.getNumber(SETTING_KEYS.TTL_EMAIL_VERIFICATION),
          credential_setup: this.settings.getNumber(SETTING_KEYS.TTL_CREDENTIAL_SETUP),
          password_reset: this.settings.getNumber(SETTING_KEYS.TTL_PASSWORD_RESET),
        },
        resendCooldownSeconds: this.settings.getNumber(SETTING_KEYS.RESEND_COOLDOWN_SECONDS),
        resendHourlyCap: this.settings.getNumber(SETTING_KEYS.RESEND_HOURLY_CAP),
      });
    } catch (error) {
      // A bad setting must not stop the app booting: the framework defaults are
      // safe, so this belongs in the log, not in a dead API.
      this.logger.error(`Could not apply the credential policy: ${(error as Error).message}`);
    }
  }
}
