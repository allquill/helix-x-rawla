import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardBody, CardHeader, Modal } from '@helix-x/design-system';

/**
 * The one editing pattern on My Profile: every section is read-only, and its
 * Edit button opens an `EditDialog`. Profile details and the household share
 * these pieces so they look and behave the same.
 */

/** The API's error text, which may be a class-validator list. */
export const apiMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error && !(err as { body?: unknown }).body) return err.message || fallback;
  const message = (err as { body?: { message?: string | string[] } }).body?.message;
  return Array.isArray(message) ? message.join('; ') : message ?? fallback;
};

/** `''` → `undefined`, so the API's email and E.164 checks see an omitted field. */
export const withoutBlanks = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).map(([key, v]) => [key, typeof v === 'string' && v.trim() === '' ? undefined : v]),
  ) as T;

export const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
);

export const Label = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 dark:text-gray-300">
    {children}
  </label>
);

/** What an empty value reads as in a summary. */
export const orDash = (value: unknown): React.ReactNode =>
  value === null || value === undefined || value === '' ? '—' : (value as React.ReactNode);

export type ProfileSectionProps = {
  title: string;
  description?: React.ReactNode;
  /** Right-aligned header actions — usually an Edit button. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function ProfileSection({ title, description, actions, children, className = '' }: ProfileSectionProps) {
  return (
    <Card className={className || undefined}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export type EditDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  /**
   * Persist the draft. Resolve to close the dialog; reject to keep it open
   * with the error shown. Throw an `Error` for a client-side check.
   */
  onSubmit: () => Promise<void>;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

export function EditDialog({ open, title, onClose, onSubmit, children, size = 'lg' }: EditDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit();
      onClose();
    } catch (err) {
      setError(apiMessage(err, 'Your changes could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size={size}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}
        {children}
      </div>
    </Modal>
  );
}
