import { NotFoundException } from '@nestjs/common';
import { PaymentSettlementRegistry } from './payment-settlement.registry';

/**
 * Webhook dispatch. Dues and event registrations share one Stripe endpoint, so
 * a paid checkout has to reach the feature that opened it — and only that one.
 */
describe('PaymentSettlementRegistry', () => {
  const build = () => {
    const registry = new PaymentSettlementRegistry();
    const handler = (known: string[]) => ({
      settle: jest.fn(async (ref: string) => {
        if (!known.includes(ref)) throw new NotFoundException();
        return true;
      }),
      returnUrl: jest.fn(() => 'http://portal/'),
    });
    const dues = handler(['cs_dues']);
    const events = handler(['cs_evt']);
    registry.register('dues', dues);
    registry.register('events', events);
    return { registry, dues, events };
  };

  it('settles with the handler the session names', async () => {
    const { registry, dues, events } = build();
    await registry.settle('cs_evt', 'events');
    expect(events.settle).toHaveBeenCalledWith('cs_evt');
    expect(dues.settle).not.toHaveBeenCalled();
  });

  it('treats a session with no kind as dues', async () => {
    const { registry, dues, events } = build();
    await registry.settle('cs_dues', undefined);
    expect(dues.settle).toHaveBeenCalledWith('cs_dues');
    expect(events.settle).not.toHaveBeenCalled();
  });

  it('falls through to the other handlers when the named one does not know it', async () => {
    const { registry, events } = build();
    await registry.settle('cs_evt', 'dues');
    expect(events.settle).toHaveBeenCalledWith('cs_evt');
  });

  it('acknowledges a checkout nobody opened', async () => {
    const { registry } = build();
    await expect(registry.settle('cs_other_app', 'events')).resolves.toBeUndefined();
  });

  it('does not swallow a real failure', async () => {
    const { registry, dues } = build();
    dues.settle.mockRejectedValueOnce(new Error('database is down'));
    await expect(registry.settle('cs_dues', 'dues')).rejects.toThrow('database is down');
  });

  it('routes console references by prefix', () => {
    const { registry } = build();
    expect(registry.kindOfConsoleRef('console_evt_abc')).toBe('events');
    expect(registry.kindOfConsoleRef('console_abc')).toBe('dues');
  });
});
