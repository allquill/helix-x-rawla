import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormField,
  Modal,
  TextareaField,
} from '@helix-x/web/design-system';
import type { WaiverTemplateDto } from '@helix-x-rawla/client-sdk';
import { PortalAdminLayout } from '../../../shared/PortalAdminLayout';
import { useWaiverTemplates } from '../hooks/useEventAdmin';
import { apiMessage } from '../lib/format';

/**
 * Liability waivers (EVT-05).
 *
 * A waiver is never edited in place: changing its text publishes the next
 * version, and every signature keeps pointing at the version it agreed to.
 */
export function WaiverTemplatesPage() {
  const { waivers, loading, error, create, publishVersion } = useWaiverTemplates();
  const [editing, setEditing] = useState<WaiverTemplateDto | 'new' | null>(null);

  const keys = [...new Set(waivers.map((w) => w.key))];

  return (
    <PortalAdminLayout
        title="Waivers"
        description="Liability waivers attendees sign when they register. Attach one to an event from its Details tab."
        actions={<Button onClick={() => setEditing('new')}>New waiver</Button>}
    >
      <div className="max-w-4xl">

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {loading && <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">Loading…</p>}
      {!loading && keys.length === 0 && (
        <Alert variant="info">
          No waivers yet. Have the wording reviewed by counsel before publishing one — members sign
          exactly this text.
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        {keys.map((key) => {
          const versions = waivers.filter((w) => w.key === key);
          const current = versions.find((w) => w.isCurrent) ?? versions[0];
          if (!current) return null;
          return (
            <Card key={key}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{current.title}</h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-mono text-xs">{key}</span>
                      <Badge variant="success">Version {current.version}</Badge>
                      {versions.length > 1 && <span>{versions.length - 1} earlier</span>}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(current)}>
                    Publish a new version
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <p className="max-h-48 overflow-y-auto whitespace-pre-line text-sm leading-6 text-gray-700 dark:text-gray-300">
                  {current.body}
                </p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <WaiverDialog
        open={editing !== null}
        waiver={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSave={async ({ key, title, body }) => {
          if (editing && editing !== 'new') await publishVersion(editing.key, { title, body });
          else await create({ key, title, body });
        }}
      />
      </div>
    </PortalAdminLayout>
  );
}

function WaiverDialog({
  open,
  waiver,
  onClose,
  onSave,
}: {
  open: boolean;
  waiver: WaiverTemplateDto | null;
  onClose: () => void;
  onSave: (values: { key: string; title: string; body: string }) => Promise<void>;
}) {
  const [key, setKey] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKey(waiver?.key ?? '');
    setTitle(waiver?.title ?? '');
    setBody(waiver?.body ?? '');
    setError(null);
  }, [open, waiver]);

  const save = async () => {
    if (!waiver && !/^[a-z][a-z0-9_]{2,59}$/.test(key)) {
      setError('The key must be lower-case letters, digits and underscores, e.g. general_liability.');
      return;
    }
    if (title.trim().length < 3 || body.trim().length < 20) {
      setError('A title and the full waiver text are both required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave({ key, title: title.trim(), body });
      onClose();
    } catch (err) {
      setError(apiMessage(err, 'The waiver could not be saved.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      size="lg"
      onClose={submitting ? () => {} : onClose}
      title={waiver ? `New version of ${waiver.title}` : 'New waiver'}
      description={
        waiver
          ? `This becomes version ${waiver.version + 1}. Earlier signatures keep the version they agreed to.`
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={save} loading={submitting}>
            {waiver ? 'Publish version' : 'Create waiver'}
          </Button>
        </>
      }
    >
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <div className="flex flex-col gap-4">
        {!waiver && (
          <FormField
            label="Key"
            helperText="A short permanent name, e.g. general_liability."
            value={key}
            disabled={submitting}
            onChange={(e) => setKey(e.target.value)}
          />
        )}
        <FormField label="Title" value={title} disabled={submitting} onChange={(e) => setTitle(e.target.value)} />
        <TextareaField label="Waiver text" rows={12} value={body} disabled={submitting} onChange={(e) => setBody(e.target.value)} />
      </div>
    </Modal>
  );
}
