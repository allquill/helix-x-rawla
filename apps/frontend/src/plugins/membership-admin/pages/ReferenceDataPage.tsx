import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  FormField,
  Modal,
  Switch,
  Tabs,
  type DataTableColumn,
} from '@helix-x/web/design-system';
import {
  PortalAdministrationService,
  type ReferenceListDto,
  type ReferenceListValueDto,
} from '@helix-x-rawla/client-sdk';
import { PortalAdminLayout } from '../../../shared/PortalAdminLayout';

/**
 * The admin-maintained dropdowns (ADM-01).
 *
 * Values are deactivated rather than deleted: a member who chose a since-retired
 * Gotra keeps it, and the option simply stops appearing in new forms.
 */
export function ReferenceDataPage() {
  const [lists, setLists] = useState<ReferenceListDto[]>([]);
  const [active, setActive] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ReferenceListValueDto | 'new' | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PortalAdministrationService.listReferenceData();
      setLists(data);
      setActive((current) => current || data[0]?.key || '');
    } catch {
      setError('Could not load the reference lists.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const list = lists.find((l) => l.key === active);

  const columns = useMemo<DataTableColumn<ReferenceListValueDto>[]>(
    () => [
      { key: 'label', header: 'Label', render: (v) => <span className="font-medium">{v.label}</span> },
      {
        key: 'value',
        header: 'Code',
        hideOnMobile: true,
        render: (v) => <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{v.value}</span>,
      },
      {
        key: 'meta',
        header: 'Details',
        hideOnMobile: true,
        render: (v) =>
          v.metadata ? (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {JSON.stringify(v.metadata)}
            </span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          ),
      },
      {
        key: 'active',
        header: 'Active',
        width: '110px',
        render: (v) => <Badge variant={v.isActive ? 'success' : 'default'}>{v.isActive ? 'Active' : 'Retired'}</Badge>,
      },
      {
        key: 'actions',
        header: '',
        width: '110px',
        render: (v) => (
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setEditing(v)}>
              Edit
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PortalAdminLayout
      title="Reference data"
      description="Gotra, caste, honorifics, languages, tiers and volunteer roles."
      actions={
        <Button onClick={() => setEditing('new')} disabled={!active}>
          Add value
        </Button>
      }
    >
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {lists.length > 0 && (
        <div className="mb-4">
          <Tabs
            items={lists.map((l) => ({ id: l.key, label: l.label, count: l.values.length }))}
            value={active}
            onChange={setActive}
            aria-label="Reference list"
          />
        </div>
      )}

      {list && list.values.length === 0 && (
        <Alert variant="warning" className="mb-4">
          This list has no values yet, so the registration form accepts any entry
          for it. Adding the first value starts enforcing the list.
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={list?.values ?? []}
        rowKey={(v) => v.id}
        loading={loading}
        emptyState="No values in this list yet."
      />

      <ValueDialog
        open={editing !== null}
        listKey={active}
        value={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void refresh();
        }}
      />
    </PortalAdminLayout>
  );
}

function ValueDialog({
  open,
  listKey,
  value,
  onClose,
  onSaved,
}: {
  open: boolean;
  listKey: string;
  value: ReferenceListValueDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [metadata, setMetadata] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCode(value?.value ?? '');
    setLabel(value?.label ?? '');
    setIsActive(value?.isActive ?? true);
    setMetadata(value?.metadata ? JSON.stringify(value.metadata) : '');
    setError(null);
  }, [open, value]);

  const save = async () => {
    if (!label.trim() || (!value && !code.trim())) {
      setError('A code and a label are both required.');
      return;
    }
    let parsed: Record<string, unknown> | undefined;
    if (metadata.trim()) {
      try {
        parsed = JSON.parse(metadata) as Record<string, unknown>;
      } catch {
        setError('Details must be valid JSON, e.g. {"duesCents":5000,"currency":"USD"}.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const body = { value: code.trim(), label: label.trim(), isActive, metadata: parsed };
      if (value) {
        await PortalAdministrationService.updateReferenceDataValue({
          id: value.id,
          requestBody: body,
        });
      } else {
        await PortalAdministrationService.createReferenceDataValue({
          key: listKey,
          requestBody: body,
        });
      }
      onSaved();
    } catch (err) {
      const message = (err as { body?: { message?: string } }).body?.message;
      setError(message ?? 'The value could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={value ? `Edit "${value.label}"` : 'Add a value'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={save} loading={submitting}>
            {value ? 'Save changes' : 'Add value'}
          </Button>
        </>
      }
    >
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <div className="flex flex-col gap-4">
        <FormField
          label="Code"
          value={code}
          disabled={Boolean(value) || submitting}
          helperText={value ? 'The code is stored on member records and never changes.' : 'Lower case, no spaces.'}
          onChange={(event) => setCode(event.target.value)}
        />
        <FormField
          label="Label"
          value={label}
          disabled={submitting}
          helperText="Safe to rename — member records keep the code."
          onChange={(event) => setLabel(event.target.value)}
        />
        <FormField
          label="Details (JSON)"
          value={metadata}
          disabled={submitting}
          placeholder='{"duesCents":5000,"currency":"USD"}'
          helperText="Membership tiers carry their dues here."
          onChange={(event) => setMetadata(event.target.value)}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
          <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Value is active" />
        </div>
      </div>
    </Modal>
  );
}
