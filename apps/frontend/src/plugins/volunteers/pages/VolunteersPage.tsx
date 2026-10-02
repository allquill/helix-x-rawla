import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  DataTable,
  PageHeader,
  Select,
  Tabs,
  type DataTableColumn,
} from '@helix-x/design-system';
import type { TopVolunteerDto } from '@helix-x-rawla/client-sdk';
import { useTopVolunteers, type VolunteerGroup, type VolunteerMetric } from '../hooks/useTopVolunteers';

const hours = (minutes: number) => {
  const value = minutes / 60;
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, '');
};

/**
 * Top Volunteers (VOL-06 / VOL-13).
 *
 * Hours count once the event that earned them has been closed. A member who
 * is not in the directory keeps their place and their hours but is not named.
 */
export function VolunteersPage() {
  const [metric, setMetric] = useState<VolunteerMetric>('hours');
  const [group, setGroup] = useState<VolunteerGroup>('all');
  const [chapterId, setChapterId] = useState('');
  const { items, chapters, loading, error } = useTopVolunteers(metric, group, chapterId);

  const columns = useMemo<DataTableColumn<TopVolunteerDto>[]>(
    () => [
      { key: 'rank', header: '#', width: '56px', render: (v) => <span className="font-mono text-sm">{v.rank}</span> },
      {
        key: 'name',
        header: 'Volunteer',
        render: (v) => (
          <span className={v.isPrivate ? 'italic text-gray-500 dark:text-gray-400' : 'font-medium'}>
            {v.displayName}
            {v.isYouth && <Badge className="ml-2">Youth</Badge>}
          </span>
        ),
      },
      {
        key: 'chapter',
        header: 'Chapter',
        hideOnMobile: true,
        render: (v) => <span className="text-sm">{v.chapterName ?? '—'}</span>,
      },
      { key: 'hours', header: 'Hours', width: '100px', render: (v) => <span className="text-sm">{hours(v.minutes)}</span> },
      { key: 'events', header: 'Events', width: '100px', render: (v) => <span className="text-sm">{v.eventCount}</span> },
    ],
    [],
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Top volunteers"
        description="With thanks to everyone who gives their time. Hours are added when an event is closed."
      />

      <Tabs
        aria-label="Rank by"
        className="mb-4"
        value={metric}
        onChange={(id) => setMetric(id as VolunteerMetric)}
        items={[
          { id: 'hours', label: 'By hours served' },
          { id: 'events', label: 'By events' },
        ]}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="volunteer-chapter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Chapter
          </label>
          <Select
            id="volunteer-chapter"
            value={chapterId}
            placeholder="All chapters"
            options={chapters.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(e) => setChapterId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="volunteer-group" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Show
          </label>
          <Select
            id="volunteer-group"
            value={group}
            options={[
              { value: 'all', label: 'Everyone' },
              { value: 'youth', label: 'Youth' },
              { value: 'adult', label: 'Adults' },
            ]}
            onChange={(e) => setGroup(e.target.value as VolunteerGroup)}
          />
        </div>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <DataTable
        columns={columns}
        data={items}
        rowKey={(v) => v.rank}
        loading={loading}
        emptyState="No volunteer hours recorded yet. They appear here once an event has been closed."
      />
    </div>
  );
}
