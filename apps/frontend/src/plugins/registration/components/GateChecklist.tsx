import { forwardRef } from 'react';
import { Badge } from '@helix-x/web/design-system';
import type { GateSnapshotDto } from '@helix-x-rawla/client-sdk';

export type GateChecklistProps = {
  gates: GateSnapshotDto;
  /** The gate the member should act on next, if any. */
  blockedBy?: string | null;
  className?: string;
};

const GATES: Array<{ key: keyof GateSnapshotDto; label: string; detail: string; code: string }> = [
  {
    key: 'emailVerified',
    label: 'Email confirmed',
    detail: 'You followed the link we emailed you.',
    code: 'EMAIL_NOT_VERIFIED',
  },
  {
    key: 'approved',
    label: 'Application approved',
    detail: 'The Membership Secretary has reviewed your application.',
    code: 'ACCOUNT_PENDING_APPROVAL',
  },
  {
    key: 'paymentMade',
    label: 'Membership dues settled',
    detail: 'Your dues for the selected tier have been received.',
    code: 'PAYMENT_REQUIRED',
  },
];

const Tick = ({ done }: { done: boolean }) => (
  <span
    aria-hidden="true"
    className={[
      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
      done
        ? 'border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500'
        : 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500',
    ].join(' ')}
  >
    {done ? '✓' : ''}
  </span>
);

/**
 * The three activation gates as a checklist (MP §4.4).
 *
 * All three are always shown, complete or not, so a member can see how far
 * along they are rather than only the single thing currently blocking them —
 * and the one they can act on is called out.
 */
export const GateChecklist = forwardRef<HTMLUListElement, GateChecklistProps>(
  ({ gates, blockedBy, className = '' }, ref) => {
    const done = GATES.filter((gate) => gates[gate.key]).length;

    return (
      <div className={className}>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
          {done} of {GATES.length} steps complete
        </p>
        <ul ref={ref} className="flex flex-col gap-3">
          {GATES.map((gate) => {
            const complete = Boolean(gates[gate.key]);
            const isNext = blockedBy === gate.code;
            return (
              <li
                key={gate.key}
                className={[
                  'flex items-start gap-3 rounded-lg border p-3',
                  isNext
                    ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700',
                ].join(' ')}
              >
                <Tick done={complete} />
                <div className="flex flex-col">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {gate.label}
                    {complete ? (
                      <Badge variant="success">Done</Badge>
                    ) : isNext ? (
                      <Badge variant="brand">Next step</Badge>
                    ) : (
                      <Badge variant="default">Waiting</Badge>
                    )}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{gate.detail}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  },
);

GateChecklist.displayName = 'GateChecklist';
