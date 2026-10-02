import { useEffect, useState } from 'react';
import {
  PortalAdministrationService,
  PortalVolunteersService,
  type ChapterDto,
  type TopVolunteerDto,
} from '@helix-x-rawla/client-sdk';

export type VolunteerMetric = 'hours' | 'events';
export type VolunteerGroup = 'all' | 'youth' | 'adult';

/** Top Volunteers, ranked server-side (VOL-06). */
export function useTopVolunteers(metric: VolunteerMetric, group: VolunteerGroup, chapterId: string) {
  const [items, setItems] = useState<TopVolunteerDto[]>([]);
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // The chapter filter is a convenience; without the list the page still works.
    PortalAdministrationService.listPortalChapters()
      .then((list) => !cancelled && setChapters(list.filter((c) => c.isActive)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    PortalVolunteersService.listTopVolunteers({ metric, group, chapterId: chapterId || undefined })
      .then((result) => !cancelled && setItems(result.items))
      .catch(() => !cancelled && setError('Could not load the volunteers.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [metric, group, chapterId]);

  return { items, chapters, loading, error };
}
