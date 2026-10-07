import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  DateField,
  FileDropzone,
  FormField,
  Modal,
  Select,
  type DataTableColumn,
} from '@helix-x/web/design-system';
import type {
  AdminEventDto,
  ChapterFinanceLineDto,
  CreateEventCostDto,
  DonatedGoodDto,
  EventCostDto,
  EventDocumentDto,
} from '@helix-x-rawla/client-sdk';
import {
  useEventDocuments,
  useEventFinance,
  useEventFormOptions,
  useEventGoods,
} from '../../hooks/useEventAdmin';
import { downloadPortalFile } from '../../lib/files';
import { apiMessage, formatAmount } from '../../lib/format';

const DOCUMENT_KINDS = [
  { value: 'financial_statement', label: 'Financial statement' },
  { value: 'bill', label: 'Bill' },
  { value: 'other', label: 'Other' },
];
const COST_CATEGORIES = [
  { value: 'venue', label: 'Venue' },
  { value: 'food', label: 'Food' },
  { value: 'volunteer', label: 'Volunteer-related' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'other', label: 'Other' },
];
const labelIn = (list: Array<{ value: string; label: string }>, value: string) =>
  list.find((item) => item.value === value)?.label ?? value;
const fieldLabel = 'text-sm font-medium text-gray-700 dark:text-gray-300';

// ─── Documents (EVT-24) ──────────────────────────────────────────────────────

/**
 * The event's statements and bills.
 *
 * Who may see them is a security level the server decides: Admins and all
 * Secretaries while the event is open, the Finance and General Secretaries
 * once it is closed. When the server refuses, this says why instead of
 * showing an error.
 */
export function DocumentsTab({ event, readOnly, canManage }: { event: AdminEventDto; readOnly: boolean; canManage: boolean }) {
  const { documents, level, loading, error, forbidden, upload, remove } = useEventDocuments(event.id);
  const [kind, setKind] = useState('bill');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (work: () => Promise<void>, failed: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await work();
    } catch (err) {
      setActionError(apiMessage(err, failed));
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo<DataTableColumn<EventDocumentDto>[]>(
    () => [
      { key: 'name', header: 'Document', render: (d) => <span className="font-medium">{d.name}</span> },
      { key: 'kind', header: 'Kind', render: (d) => <Badge>{labelIn(DOCUMENT_KINDS, d.kind)}</Badge> },
      {
        key: 'added',
        header: 'Added',
        hideOnMobile: true,
        render: (d) => <span className="text-sm">{new Date(d.createdAt).toLocaleDateString()}</span>,
      },
      {
        key: 'actions',
        header: '',
        width: '210px',
        render: (d) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon="download"
              disabled={busy}
              onClick={() =>
                run(
                  () => downloadPortalFile(`/api/admin/events/${event.id}/documents/${d.id}/content`, d.name),
                  'The document could not be downloaded.',
                )
              }
            >
              Download
            </Button>
            {!readOnly && canManage && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => remove(d.id), 'The document could not be deleted.')}>
                Delete
              </Button>
            )}
          </div>
        ),
      },
    ],
    // `run` and `remove` are recreated each render; the table only needs the latest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event.id, readOnly, canManage, busy],
  );

  if (forbidden) {
    return (
      <Alert variant="info">
        {event.status === 'closed'
          ? 'This event is closed. Its statements and bills are now visible only to the Finance and General Secretaries.'
          : 'These documents are visible only to Admins and Secretaries.'}
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {level === 5
          ? 'Finance-restricted: visible to the Finance and General Secretaries.'
          : 'Visible to Admins and all Secretaries. When the event is closed they become visible only to the Finance and General Secretaries, and nothing more can be added.'}
      </p>
      {(error || actionError) && <Alert variant="error">{error ?? actionError}</Alert>}

      {!readOnly && canManage && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5 sm:w-56">
            <label htmlFor="document-kind" className={fieldLabel}>
              Kind
            </label>
            <Select id="document-kind" value={kind} disabled={busy} options={DOCUMENT_KINDS} onChange={(e) => setKind(e.target.value)} />
          </div>
          <FileDropzone
            className="flex-1"
            disabled={busy}
            label={busy ? 'Working…' : 'Attach a document'}
            hint="A statement, a bill or a receipt."
            onFilesSelected={(files) => {
              const file = files[0];
              if (file) run(() => upload(file, kind), 'The document could not be uploaded.');
            }}
          />
        </div>
      )}

      <DataTable columns={columns} data={documents} rowKey={(d) => d.id} loading={loading} emptyState="No documents attached." />
    </div>
  );
}

// ─── Donated goods (EVT-06) ──────────────────────────────────────────────────

export function GoodsTab({ event, editable }: { event: AdminEventDto; editable: boolean }) {
  const { goods, loading, error, add, remove } = useEventGoods(event.id);
  const [adding, setAdding] = useState(false);
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [donorName, setDonorName] = useState('');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const columns = useMemo<DataTableColumn<DonatedGoodDto>[]>(
    () => [
      { key: 'item', header: 'Item', render: (g) => <span className="font-medium">{g.item}</span> },
      { key: 'quantity', header: 'Quantity', render: (g) => <span className="text-sm">{g.quantity} {g.unit ?? ''}</span> },
      { key: 'donor', header: 'Donor', render: (g) => <span className="text-sm">{g.donorName ?? '—'}</span> },
      {
        key: 'value',
        header: 'Est. value',
        hideOnMobile: true,
        render: (g) => (
          <span className="text-sm">
            {g.estimatedValueCents != null ? formatAmount(g.estimatedValueCents, event.currency) : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '100px',
        render: (g) =>
          editable ? (
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => remove(g.id).catch(() => undefined)}>
                Delete
              </Button>
            </div>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event.currency, editable],
  );

  const save = async () => {
    if (!item.trim() || !(Number(quantity) >= 1)) return setFormError('An item and a quantity are required.');
    setSubmitting(true);
    setFormError(null);
    try {
      await add({
        item: item.trim(),
        quantity: Number(quantity),
        unit: unit.trim() || undefined,
        donorName: donorName.trim() || undefined,
        estimatedValueCents: value.trim() ? Math.round(Number(value) * 100) : null,
      });
      setAdding(false);
      setItem('');
      setQuantity('1');
      setUnit('');
      setDonorName('');
      setValue('');
    } catch (err) {
      setFormError(apiMessage(err, 'The entry could not be saved.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Goods donated for the event, with who gave them.</p>
        {editable && <Button onClick={() => setAdding(true)}>Record donated goods</Button>}
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      <DataTable columns={columns} data={goods} rowKey={(g) => g.id} loading={loading} emptyState="Nothing recorded." />

      <Modal
        open={adding}
        onClose={submitting ? () => {} : () => setAdding(false)}
        title="Record donated goods"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={save} loading={submitting}>
              Save
            </Button>
          </>
        }
      >
        {formError && <Alert variant="error" className="mb-3">{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="Item" value={item} disabled={submitting} onChange={(e) => setItem(e.target.value)} />
          </div>
          <FormField label="Quantity" type="number" min={1} value={quantity} disabled={submitting} onChange={(e) => setQuantity(e.target.value)} />
          <FormField label="Unit" placeholder="kg, boxes…" value={unit} disabled={submitting} onChange={(e) => setUnit(e.target.value)} />
          <FormField label="Donor" value={donorName} disabled={submitting} onChange={(e) => setDonorName(e.target.value)} />
          <FormField label="Estimated value" helperText="Optional." inputMode="decimal" value={value} disabled={submitting} onChange={(e) => setValue(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

// ─── Costs and the chapter split (EVT-11 / VOL-07) ───────────────────────────

export function CostsTab({ event, editable }: { event: AdminEventDto; editable: boolean }) {
  const { costs, summary, loading, error, add, remove } = useEventFinance(event.id);
  const { chapters } = useEventFormOptions();
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState('venue');
  const [chapterId, setChapterId] = useState(event.chapterId ?? '');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [incurredOn, setIncurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const summaryColumns = useMemo<DataTableColumn<ChapterFinanceLineDto>[]>(
    () => [
      { key: 'chapter', header: 'Chapter', render: (l) => <span className="font-medium">{l.chapterName}</span> },
      { key: 'people', header: 'People', hideOnMobile: true, render: (l) => <span className="text-sm">{l.attendeeCount}</span> },
      { key: 'revenue', header: 'Received', render: (l) => <span className="text-sm">{formatAmount(l.revenueCents, event.currency)}</span> },
      {
        key: 'cost',
        header: 'Costs',
        render: (l) => (
          <span className="text-sm">
            {formatAmount(l.costCents, event.currency)}
            {l.volunteerCostCents > 0 && (
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {formatAmount(l.volunteerCostCents, event.currency)} volunteer-related
              </span>
            )}
          </span>
        ),
      },
      { key: 'net', header: 'Net', render: (l) => <span className="text-sm font-medium">{formatAmount(l.netCents, event.currency)}</span> },
    ],
    [event.currency],
  );

  const costColumns = useMemo<DataTableColumn<EventCostDto>[]>(
    () => [
      { key: 'description', header: 'Cost', render: (c) => <span className="font-medium">{c.description}</span> },
      { key: 'category', header: 'Category', render: (c) => <Badge>{labelIn(COST_CATEGORIES, c.category)}</Badge> },
      { key: 'chapter', header: 'Chapter', hideOnMobile: true, render: (c) => <span className="text-sm">{c.chapterName ?? 'No chapter'}</span> },
      { key: 'amount', header: 'Amount', render: (c) => <span className="text-sm">{formatAmount(c.amountCents, c.currency)}</span> },
      {
        key: 'actions',
        header: '',
        width: '100px',
        render: (c) =>
          editable ? (
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => remove(c.id).catch(() => undefined)}>
                Delete
              </Button>
            </div>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editable],
  );

  const save = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!description.trim() || !Number.isFinite(cents) || cents < 1 || !incurredOn) {
      return setFormError('A description, an amount and a date are required.');
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await add({
        category: category as CreateEventCostDto['category'],
        chapterId: chapterId || null,
        description: description.trim(),
        amountCents: cents,
        incurredOn,
      });
      setAdding(false);
      setDescription('');
      setAmount('');
    } catch (err) {
      setFormError(apiMessage(err, 'The cost could not be saved.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {error && <Alert variant="error">{error}</Alert>}

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">By chapter</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Revenue goes to the chapter each household belonged to when it registered; a cost to the
          chapter it is recorded against.
        </p>
        <DataTable
          columns={summaryColumns}
          data={summary?.chapters ?? []}
          rowKey={(l) => l.chapterId ?? 'none'}
          loading={loading}
          emptyState="No revenue or costs yet."
        />
        {summary && (
          <p className="text-sm text-gray-900 dark:text-gray-100">
            Received {formatAmount(summary.revenueCents, event.currency)} of{' '}
            {formatAmount(summary.billedCents, event.currency)} billed · costs{' '}
            {formatAmount(summary.costCents, event.currency)} ·{' '}
            <span className="font-semibold">net {formatAmount(summary.netCents, event.currency)}</span>
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Costs</h3>
          {editable && <Button onClick={() => setAdding(true)}>Record a cost</Button>}
        </div>
        <DataTable columns={costColumns} data={costs} rowKey={(c) => c.id} loading={loading} emptyState="No costs recorded." />
      </section>

      <Modal
        open={adding}
        onClose={submitting ? () => {} : () => setAdding(false)}
        title="Record a cost"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={save} loading={submitting}>
              Save
            </Button>
          </>
        }
      >
        {formError && <Alert variant="error" className="mb-3">{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="Description" value={description} disabled={submitting} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cost-category" className={fieldLabel}>Category</label>
            <Select id="cost-category" value={category} disabled={submitting} options={COST_CATEGORIES} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cost-chapter" className={fieldLabel}>Chapter</label>
            <Select
              id="cost-chapter"
              value={chapterId}
              disabled={submitting}
              placeholder="No chapter (national)"
              options={chapters.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(e) => setChapterId(e.target.value)}
            />
          </div>
          <FormField label="Amount" inputMode="decimal" value={amount} disabled={submitting} onChange={(e) => setAmount(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cost-date" className={fieldLabel}>Date</label>
            <DateField id="cost-date" value={incurredOn} disabled={submitting} onChange={(e) => setIncurredOn(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
