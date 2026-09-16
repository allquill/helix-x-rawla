import { forwardRef, useEffect, useState } from 'react';
import { Alert, Button, Modal, Textarea } from '@helix-x/design-system';

export type ReasonDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  placeholder?: string;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

/**
 * Collects the mandatory reason behind an irreversible decision.
 *
 * Rejection, an information request and a payment override all write an audit
 * row carrying this text, and the server rejects the call without it — so the
 * dialog refuses to submit rather than letting the request fail at the API.
 */
export const ReasonDialog = forwardRef<HTMLDivElement, ReasonDialogProps>(
  ({ open, title, description, confirmLabel, placeholder, destructive, onClose, onConfirm }, _ref) => {
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
      if (reason.trim().length < 3) {
        setError('Please give a reason — it is recorded in the audit log.');
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        await onConfirm(reason.trim());
        onClose();
      } catch (err) {
        const body = (err as { body?: { message?: string } }).body;
        setError(body?.message ?? 'The action could not be completed.');
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
            <Button variant={destructive ? 'danger' : 'primary'} onClick={confirm} loading={submitting}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        {error && <Alert variant="error" className="mb-3">{error}</Alert>}
        <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Reason
        </label>
        <Textarea
          id="reason"
          rows={4}
          value={reason}
          disabled={submitting}
          placeholder={placeholder}
          onChange={(event) => setReason(event.target.value)}
        />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          Recorded against this member with your name and the time.
        </p>
      </Modal>
    );
  },
);

ReasonDialog.displayName = 'ReasonDialog';
