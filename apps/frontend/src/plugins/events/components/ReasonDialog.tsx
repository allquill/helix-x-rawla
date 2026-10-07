import { useEffect, useState } from 'react';
import { Alert, Button, Modal, Textarea } from '@helix-x/web/design-system';
import { apiMessage } from '../lib/format';

export type ReasonDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  /** The server's own minimum, so the dialog refuses before the API does. */
  minLength?: number;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

/**
 * Collects the mandatory reason behind removing a household from an event
 * (EVT-23). The reason is written to the audit log with the Admin's name.
 */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  minLength = 5,
  onClose,
  onConfirm,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  const confirm = async () => {
    if (reason.trim().length < minLength) {
      setError('Please give a reason — it is recorded in the audit log.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      setError(apiMessage(err, 'The action could not be completed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={submitting}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <label htmlFor="event-reason" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Reason
      </label>
      <Textarea
        id="event-reason"
        rows={4}
        value={reason}
        disabled={submitting}
        onChange={(event) => setReason(event.target.value)}
      />
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        Recorded in the audit log with your name and the time.
      </p>
    </Modal>
  );
}
