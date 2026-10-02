import { Injectable, Logger, NotFoundException } from '@nestjs/common';

export const DUES_PAYMENT_KIND = 'dues';
export const EVENT_PAYMENT_KIND = 'events';

/** The console reference prefix that routes a dev checkout to the events handler. */
export const EVENT_CONSOLE_REF_PREFIX = 'evt_';

export interface PaymentSettlementHandler {
  /**
   * Settle the checkout with this provider reference. Idempotent; answers
   * whether this call was the one that settled it, and throws
   * `NotFoundException` when the reference is not one of its own.
   */
  settle(providerRef: string): Promise<boolean>;
  /** Where the payer lands after the console checkout. */
  returnUrl(providerRef: string, outcome: 'success' | 'cancelled'): Promise<string> | string;
}

/**
 * Routes a paid checkout to whichever feature opened it.
 *
 * Each feature registers a handler for its kind in `onModuleInit`, so this
 * module depends on none of them.
 */
@Injectable()
export class PaymentSettlementRegistry {
  private readonly logger = new Logger(PaymentSettlementRegistry.name);
  private readonly handlers = new Map<string, PaymentSettlementHandler>();

  register(kind: string, handler: PaymentSettlementHandler): void {
    this.handlers.set(kind, handler);
  }

  get(kind: string): PaymentSettlementHandler | undefined {
    return this.handlers.get(kind);
  }

  /** The kind a console reference belongs to. */
  kindOfConsoleRef(providerRef: string): string {
    return providerRef.startsWith(`console_${EVENT_CONSOLE_REF_PREFIX}`)
      ? EVENT_PAYMENT_KIND
      : DUES_PAYMENT_KIND;
  }

  /**
   * Settle a webhook-reported checkout.
   *
   * The session's own kind is tried first; a session with none was opened
   * before kinds existed and is dues. If that handler does not know the
   * reference the others are tried, and a reference nobody knows is
   * acknowledged — it is another app on the same Stripe account, and an error
   * would only make Stripe retry.
   */
  async settle(providerRef: string, kind: string | undefined): Promise<void> {
    const preferred = kind ?? DUES_PAYMENT_KIND;
    const ordered = [
      ...[...this.handlers].filter(([name]) => name === preferred),
      ...[...this.handlers].filter(([name]) => name !== preferred),
    ];
    for (const [, handler] of ordered) {
      try {
        await handler.settle(providerRef);
        return;
      } catch (err) {
        if (!(err instanceof NotFoundException)) throw err;
      }
    }
    this.logger.warn(`Ignoring checkout ${providerRef}: no matching payment record`);
  }
}
