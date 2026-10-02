import { NotFoundException } from '@nestjs/common';
import { DuesPaymentService } from './dues-payment.service';

/**
 * Settlement idempotency (REG-16).
 *
 * Stripe delivers webhooks at least once and retries on any non-2xx, so the
 * same completed checkout routinely arrives more than once. It must close the
 * gate, audit and re-derive activation exactly once.
 */
describe('DuesPaymentService.settle', () => {
  const build = () => {
    const payment = { id: 'pay-1', memberId: 'mem-1', providerRef: 'cs_test_1', status: 'pending' };
    const memberUpdates: unknown[] = [];

    const em = {
      findOne: jest.fn(async (_entity: unknown, { where }: { where: { providerRef: string } }) =>
        where.providerRef === payment.providerRef ? { ...payment } : null,
      ),
      update: jest.fn(async (entity: { name: string }, criteria: Record<string, unknown>, patch: Record<string, unknown>) => {
        if (entity.name === 'MembershipPayment') {
          // The conditional update the service relies on: only a pending row moves.
          if (criteria.status !== payment.status) return { affected: 0 };
          Object.assign(payment, patch);
          return { affected: 1 };
        }
        memberUpdates.push(patch);
        return { affected: 1 };
      }),
    };
    const dataSource = { transaction: jest.fn(async (fn: (m: typeof em) => unknown) => fn(em)) };
    const activation = { recompute: jest.fn(async () => ({ member: {}, justActivated: true })) };
    const audit = { record: jest.fn(async () => ({})) };
    const gateway = { portalUrl: 'http://localhost:5173' };
    const settlements = { register: jest.fn() };

    const service = new DuesPaymentService(
      gateway as never,
      settlements as never,
      dataSource as never,
      {} as never,
      {} as never,
      activation as never,
      {} as never,
      {} as never,
      audit as never,
    );
    return { service, payment, memberUpdates, activation, audit };
  };

  it('closes the gate once however many times the webhook arrives', async () => {
    const { service, payment, memberUpdates, activation, audit } = build();

    await expect(service.settle('cs_test_1')).resolves.toBe(true);
    await expect(service.settle('cs_test_1')).resolves.toBe(false);
    await expect(service.settle('cs_test_1')).resolves.toBe(false);

    expect(payment.status).toBe('settled');
    expect(memberUpdates).toEqual([expect.objectContaining({ isPaymentMade: true })]);
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(activation.recompute).toHaveBeenCalledTimes(1);
    expect(activation.recompute).toHaveBeenCalledWith('mem-1');
  });

  it('refuses a checkout it never opened', async () => {
    const { service, activation } = build();
    await expect(service.settle('cs_unknown')).rejects.toBeInstanceOf(NotFoundException);
    expect(activation.recompute).not.toHaveBeenCalled();
  });
});
