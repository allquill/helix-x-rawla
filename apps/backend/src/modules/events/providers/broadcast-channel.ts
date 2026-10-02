import { Injectable } from '@nestjs/common';
import { EmailNotificationService } from '@helix-x/backend';
import type { NotificationChannel } from '../constants';

/** Someone an event message may go to. */
export interface BroadcastRecipient {
  email: string | null;
  phone: string | null;
  firstName: string;
  /** False when the member has opted out of event messages. */
  optedIn: boolean;
}

/**
 * One way of reaching a recipient. The runner sends through every channel
 * that is configured, and logs each under its own `channel`.
 */
export interface BroadcastChannel {
  readonly key: NotificationChannel;
  isConfigured(): boolean;
  /** The address this channel uses for the recipient, or null if they have none. */
  addressOf(recipient: BroadcastRecipient): string | null;
  send(address: string, template: string, variables: Record<string, unknown>): Promise<void>;
}

@Injectable()
export class EmailBroadcastChannel implements BroadcastChannel {
  readonly key = 'email' as const;

  constructor(private readonly email: EmailNotificationService) {}

  isConfigured(): boolean {
    return true;
  }

  addressOf(recipient: BroadcastRecipient): string | null {
    return recipient.email?.trim().toLowerCase() || null;
  }

  async send(address: string, template: string, variables: Record<string, unknown>): Promise<void> {
    await this.email.send({ to: address, template, variables });
  }
}

/**
 * SEAM: EVT-22 SMS — no provider.
 *
 * RROA-DEV asks for the invitation as a text message "where the portal
 * supports texting". It does not yet: no SMS or WhatsApp provider is
 * contracted (requirements question #40). This channel is registered and
 * reports itself unconfigured, so the runner skips it. Implementing `send`
 * against a provider and returning true from `isConfigured` is the whole
 * change — the recipient query already carries `members.phone`, and the log
 * already has a `channel` column.
 */
@Injectable()
export class SmsBroadcastChannel implements BroadcastChannel {
  readonly key = 'sms' as const;

  isConfigured(): boolean {
    return false;
  }

  addressOf(recipient: BroadcastRecipient): string | null {
    return recipient.phone?.trim() || null;
  }

  async send(): Promise<void> {
    throw new Error('SMS is not configured');
  }
}
