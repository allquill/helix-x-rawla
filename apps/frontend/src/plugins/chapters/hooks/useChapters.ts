import { useCallback, useEffect, useState } from 'react';
import {
  PortalAdministrationService,
  type ChapterDto,
  type StateChapterMappingDto,
  type UpsertChapterDto,
} from '@helix-x/client-sdk';

/** Chapters and the state map that drives auto-assignment (CHP-01 / CHP-02). */
export function useChapters() {
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [stateMap, setStateMap] = useState<StateChapterMappingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, map] = await Promise.all([
        PortalAdministrationService.listPortalChapters(),
        PortalAdministrationService.getStateChapterMap(),
      ]);
      setChapters(list);
      setStateMap(map);
    } catch {
      setError('Could not load the chapters.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (body: UpsertChapterDto) => {
      await PortalAdministrationService.createPortalChapter({ requestBody: body });
      await refresh();
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, body: UpsertChapterDto) => {
      await PortalAdministrationService.updatePortalChapter({ id, requestBody: body });
      await refresh();
    },
    [refresh],
  );

  const mapState = useCallback(
    async (stateCode: string, chapterId: string) => {
      await PortalAdministrationService.updateStateChapterMap({
        requestBody: { stateCode: stateCode.toUpperCase(), chapterId },
      });
      await refresh();
    },
    [refresh],
  );

  return { chapters, stateMap, loading, error, refresh, create, update, mapState };
}
