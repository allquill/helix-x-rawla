import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  FormField,
  Modal,
  PageHeader,
  Select,
  Switch,
  type DataTableColumn,
} from '@helix-x/design-system';
import type { ChapterDto, StateChapterMappingDto } from '@helix-x-rawla/client-sdk';
import { useChapters } from '../hooks/useChapters';

/**
 * The chapter registry and the state→chapter map (CHP-01 / CHP-02).
 *
 * The map is what makes MP-08 deterministic: a Texas address becomes the Texas
 * chapter at save time. A state with no mapping leaves the member unassigned
 * rather than guessing — visible and fixable, where a wrong guess is neither.
 */
export function ChaptersAdminPage() {
  const { chapters, stateMap, loading, error, create, update, mapState } = useChapters();
  const [editing, setEditing] = useState<ChapterDto | 'new' | null>(null);
  const [stateCode, setStateCode] = useState('');
  const [mapChapterId, setMapChapterId] = useState('');
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapping, setMapping] = useState(false);

  const chapterName = useMemo(
    () => new Map(chapters.map((c) => [c.id, c.name])),
    [chapters],
  );

  const chapterColumns = useMemo<DataTableColumn<ChapterDto>[]>(
    () => [
      { key: 'name', header: 'Chapter', render: (c) => <span className="font-medium">{c.name}</span> },
      {
        key: 'code',
        header: 'Code',
        render: (c) => <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{c.code}</span>,
      },
      {
        key: 'states',
        header: 'States',
        hideOnMobile: true,
        render: (c) => {
          const codes = stateMap.filter((m) => m.chapterId === c.id).map((m) => m.stateCode);
          return (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {codes.length ? codes.join(', ') : '—'}
            </span>
          );
        },
      },
      {
        key: 'active',
        header: 'Status',
        width: '110px',
        render: (c) => (
          <Badge variant={c.isActive ? 'success' : 'default'}>
            {c.isActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '100px',
        render: (c) => (
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>
              Edit
            </Button>
          </div>
        ),
      },
    ],
    [stateMap],
  );

  const mapColumns = useMemo<DataTableColumn<StateChapterMappingDto>[]>(
    () => [
      { key: 'state', header: 'State', render: (m) => <span className="font-mono">{m.stateCode}</span> },
      {
        key: 'chapter',
        header: 'Chapter',
        render: (m) => (
          <span className="text-sm">{chapterName.get(m.chapterId) ?? m.chapterId}</span>
        ),
      },
    ],
    [chapterName],
  );

  const addMapping = async () => {
    if (stateCode.trim().length !== 2 || !mapChapterId) {
      setMapError('Enter a two-letter state code and choose a chapter.');
      return;
    }
    setMapping(true);
    setMapError(null);
    try {
      await mapState(stateCode.trim(), mapChapterId);
      setStateCode('');
    } catch {
      setMapError('The mapping could not be saved.');
    } finally {
      setMapping(false);
    }
  };

  return (
      <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          title="Chapters"
          description="US regions, and the states each one covers."
          actions={<Button onClick={() => setEditing('new')}>New chapter</Button>}
        />

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <div className="flex flex-col gap-6">
          <DataTable
            columns={chapterColumns}
            data={chapters}
            rowKey={(c) => c.id}
            loading={loading}
            emptyState="No chapters yet. Add the first one to start assigning members."
          />

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                State to chapter
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                A new member's state decides their chapter. States left unmapped
                leave the member unassigned for an administrator to place.
              </p>
            </CardHeader>
            <CardBody>
              {mapError && <Alert variant="error" className="mb-3">{mapError}</Alert>}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="sm:w-32">
                  <FormField
                    label="State"
                    placeholder="TX"
                    maxLength={2}
                    value={stateCode}
                    disabled={mapping}
                    onChange={(event) => setStateCode(event.target.value.toUpperCase())}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="map-chapter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Chapter
                  </label>
                  <Select
                    id="map-chapter"
                    placeholder="Select a chapter…"
                    value={mapChapterId}
                    disabled={mapping || chapters.length === 0}
                    onChange={(event) => setMapChapterId(event.target.value)}
                    options={chapters.map((c) => ({ value: c.id, label: c.name }))}
                  />
                </div>
                <Button onClick={addMapping} loading={mapping} disabled={chapters.length === 0}>
                  Map state
                </Button>
              </div>

              <DataTable
                columns={mapColumns}
                data={stateMap}
                rowKey={(m) => m.stateCode}
                loading={loading}
                emptyState="No states mapped yet."
              />
            </CardBody>
          </Card>
        </div>

        <ChapterDialog
          open={editing !== null}
          chapter={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            if (editing && editing !== 'new') await update(editing.id, body);
            else await create(body);
          }}
        />
      </div>
  );
}

function ChapterDialog({
  open,
  chapter,
  onClose,
  onSave,
}: {
  open: boolean;
  chapter: ChapterDto | null;
  onClose: () => void;
  onSave: (body: { name: string; code: string; description?: string; isActive?: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(chapter?.name ?? '');
    setCode(chapter?.code ?? '');
    setDescription(chapter?.description ?? '');
    setIsActive(chapter?.isActive ?? true);
    setError(null);
  }, [open, chapter]);

  const save = async () => {
    if (!name.trim() || !code.trim()) {
      setError('A name and a code are both required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        isActive,
      });
      onClose();
    } catch (err) {
      const message = (err as { body?: { message?: string } }).body?.message;
      setError(message ?? 'The chapter could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={chapter ? `Edit ${chapter.name}` : 'New chapter'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={save} loading={submitting}>
            {chapter ? 'Save changes' : 'Create chapter'}
          </Button>
        </>
      }
    >
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <div className="flex flex-col gap-4">
        <FormField label="Name" placeholder="Texas" value={name} disabled={submitting} onChange={(e) => setName(e.target.value)} />
        <FormField label="Code" placeholder="TX" value={code} disabled={submitting} onChange={(e) => setCode(e.target.value)} />
        <FormField label="Description" value={description} disabled={submitting} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
          <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Chapter is active" />
        </div>
      </div>
    </Modal>
  );
}
