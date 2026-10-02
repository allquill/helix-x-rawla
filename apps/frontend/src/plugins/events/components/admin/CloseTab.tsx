import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, FormField, Modal } from '@helix-x/design-system';
import type { AdminEventDto, VolunteerHoursEntryDto } from '@helix-x-rawla/client-sdk';
import { useEventClose } from '../../hooks/useEventAdmin';
import { apiMessage, formatAmount, formatHours } from '../../lib/format';

export type CloseTabProps = {
  event: AdminEventDto;
  canEnterHours: boolean;
  canClose: boolean;
  onClose: (hours: VolunteerHoursEntryDto[]) => Promise<unknown>;
};

/**
 * Volunteer hours and closing the event (VOL-12 / EVT-26).
 *
 * Hours are typed in hours and sent as minutes. Closing needs a figure for
 * every volunteer — zero is a figure, empty is not — and it is permanent:
 * there is no reopen, so the last step asks for an explicit confirmation.
 */
export function CloseTab({ event, canEnterHours, canClose, onClose }: CloseTabProps) {
  const closed = event.status === 'closed';
  const { volunteers, preview, loading, error, saveHours, refresh } = useEventClose(event.id);
  const [hours, setHours] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [understood, setUnderstood] = useState(false);

  useEffect(() => {
    setHours(
      Object.fromEntries(
        volunteers.map((v) => [v.attendeeId, v.volunteerMinutes == null ? '' : String(v.volunteerMinutes / 60)]),
      ),
    );
  }, [volunteers]);

  /** The entries typed so far; null if any is not a valid number of hours. */
  const entries = (): VolunteerHoursEntryDto[] | null => {
    const list: VolunteerHoursEntryDto[] = [];
    for (const v of volunteers) {
      const raw = (hours[v.attendeeId] ?? '').trim();
      if (raw === '') continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) return null;
      list.push({ attendeeId: v.attendeeId, minutes: Math.round(value * 60) });
    }
    return list;
  };
  const typed = entries();
  const missing = volunteers.filter((v) => (hours[v.attendeeId] ?? '').trim() === '').length;

  const save = async () => {
    if (!typed) return setActionError('Hours must be numbers, such as 3 or 4.5.');
    setSaving(true);
    setActionError(null);
    setSaved(false);
    try {
      await saveHours(typed);
      setSaved(true);
    } catch (err) {
      setActionError(apiMessage(err, 'The hours could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const close = async () => {
    if (!typed) return;
    setSaving(true);
    setActionError(null);
    try {
      await onClose(typed);
      setConfirming(false);
      await refresh();
    } catch (err) {
      setConfirming(false);
      setActionError(apiMessage(err, 'The event could not be closed.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {error && <Alert variant="error">{error}</Alert>}
      {actionError && <Alert variant="error">{actionError}</Alert>}
      {saved && <Alert variant="success">Hours saved.</Alert>}

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Volunteer hours</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Everyone who volunteered at sign-up, adults and children. Enter the hours each served;
            enter 0 for someone who did not serve.
          </p>
        </CardHeader>
        <CardBody>
          {loading && <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">Loading…</p>}
          {!loading && volunteers.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nobody volunteered for this event.</p>
          )}
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {volunteers.map((v) => (
              <li key={v.attendeeId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="text-sm">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {v.fullName}
                    {v.isYouth && <Badge className="ml-2">Youth</Badge>}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">{v.householdName} household</p>
                </div>
                {closed || !canEnterHours ? (
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {v.volunteerMinutes == null ? 'Not entered' : formatHours(v.volunteerMinutes)}
                  </span>
                ) : (
                  <div className="w-32">
                    <FormField
                      label={`Hours for ${v.fullName}`}
                      placeholder="Hours"
                      inputMode="decimal"
                      value={hours[v.attendeeId] ?? ''}
                      disabled={saving}
                      onChange={(e) => setHours((h) => ({ ...h, [v.attendeeId]: e.target.value }))}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
          {!closed && canEnterHours && volunteers.length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={save} loading={saving}>
                Save hours
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {closed ? (
        <Alert variant="info">
          This event was closed{event.closedAt ? ` on ${new Date(event.closedAt).toLocaleString()}` : ''}. It is
          read-only and cannot be reopened.
        </Alert>
      ) : (
        canClose && (
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Close the event</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Do this when everything is done. Closing is permanent.
              </p>
            </CardHeader>
            <CardBody>
              <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
                <li>Nothing more can be added or changed — registrations, payments, documents, photos or hours.</li>
                <li>
                  {preview?.documentCount ?? 0} statement(s) and bill(s) become visible only to the Finance
                  and General Secretaries.
                </li>
                <li>The hours above count towards Top Volunteers.</li>
                {preview && preview.unpaidRegistrationCount > 0 && (
                  <li className="font-medium text-amber-800 dark:text-amber-300">
                    {preview.unpaidRegistrationCount} registration(s) still owe{' '}
                    {formatAmount(preview.outstandingCents, event.currency)}. No payment can be recorded after closing.
                  </li>
                )}
              </ul>
              {event.status !== 'published' && (
                <Alert variant="info" className="mb-4">Only a published event can be closed.</Alert>
              )}
              {missing > 0 && (
                <Alert variant="warning" className="mb-4">
                  {missing} volunteer(s) still have no hours. Enter a figure for each — 0 is allowed.
                </Alert>
              )}
              <Button
                variant="danger"
                disabled={event.status !== 'published' || missing > 0 || !typed || saving}
                onClick={() => {
                  setUnderstood(false);
                  setConfirming(true);
                }}
              >
                Close event…
              </Button>
            </CardBody>
          </Card>
        )
      )}

      <Modal
        open={confirming}
        onClose={saving ? () => {} : () => setConfirming(false)}
        title={`Close ${event.title}?`}
        description="A closed event cannot be reopened."
        footer={
          <>
            <Button variant="secondary" disabled={saving} onClick={() => setConfirming(false)}>
              Not yet
            </Button>
            <Button variant="danger" disabled={!understood} loading={saving} onClick={close}>
              Close permanently
            </Button>
          </>
        }
      >
        <Checkbox
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
          label="I understand that this is permanent and that nothing can be added afterwards."
        />
      </Modal>
    </div>
  );
}
