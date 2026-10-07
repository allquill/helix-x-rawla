import { useEffect, useState } from 'react';
import { Button } from '@helix-x/web/design-system';
import { downloadPortalFile, fetchPortalBlob } from '../lib/files';

export type EventFlyerProps = {
  eventId: string;
  name: string;
  mimeType: string;
  /**
   * The event is still a draft. Members cannot open a draft's flyer — the
   * route answers 404 — so the admin screen shows only that one is attached.
   */
  adminPreview?: boolean;
};

/**
 * The event flyer (EVT-17): shown inline when it is an image, offered as a
 * download otherwise. The bytes are behind the login wall, so they are fetched
 * with the session rather than linked.
 */
export function EventFlyer({ eventId, name, mimeType, adminPreview = false }: EventFlyerProps) {
  const path = `/api/events/${eventId}/flyer`;
  const isImage = mimeType.startsWith('image/') && !adminPreview;
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isImage) return;
    let url: string | null = null;
    let cancelled = false;
    fetchPortalBlob(path)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, isImage]);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadPortalFile(path, name);
    } catch {
      setFailed(true);
    } finally {
      setDownloading(false);
    }
  };

  if (adminPreview) {
    return (
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Attached: <span className="font-medium">{name}</span>. It can be previewed once the event is
        published.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {isImage && src && (
        <img
          src={src}
          alt={`Flyer for the event: ${name}`}
          className="max-h-[32rem] w-full rounded-lg border border-gray-200 object-contain dark:border-gray-800"
        />
      )}
      {failed && <p className="text-sm text-gray-500 dark:text-gray-400">The flyer could not be loaded.</p>}
      <div>
        <Button variant="secondary" size="sm" icon="download" onClick={download} loading={downloading}>
          Download flyer
        </Button>
      </div>
    </div>
  );
}
