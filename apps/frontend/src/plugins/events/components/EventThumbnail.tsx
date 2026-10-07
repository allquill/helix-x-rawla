import { useEffect, useRef, useState } from 'react';
import { MaskedAsset } from '@helix-x/web/design-system';
import { fetchPortalBlob } from '../lib/files';
import { CATEGORY_LABELS } from '../lib/format';

export type EventThumbnailProps = {
  eventId: string;
  category: string;
  /** The flyer's type, or null when the event has none. */
  flyerMimeType?: string | null;
};

/** The frame every thumbnail and placeholder shares, so the gallery's rows line up. */
export const THUMBNAIL_FRAME = 'aspect-[16/10] w-full overflow-hidden';

/**
 * An event's flyer as a gallery thumbnail, or a placeholder.
 *
 * The flyer is behind the login wall, so it is fetched with the session rather
 * than linked, and only once the card scrolls near the viewport — a long Past
 * list does not pull every flyer at once. A PDF flyer, a failed load and no
 * flyer at all get the same placeholder: the crest on the landing page's amber.
 *
 * Decorative (`alt=""`): the event's title, right below, is the card's name.
 */
export function EventThumbnail({ eventId, category, flyerMimeType }: EventThumbnailProps) {
  const isImage = flyerMimeType?.startsWith('image/') === true;
  const frame = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const node = frame.current;
    if (!isImage || !node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isImage]);

  useEffect(() => {
    if (!isImage || !near) return;
    let url: string | null = null;
    let cancelled = false;
    fetchPortalBlob(`/api/events/${eventId}/flyer`)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      // Leaves the placeholder in place.
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [eventId, isImage, near]);

  return (
    <div ref={frame} className={`${THUMBNAIL_FRAME} bg-amber-50 dark:bg-gray-800`}>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-2">
          <MaskedAsset
            src="/extension/jharokha-pattern.svg"
            tile={{ width: 240, height: 280 }}
            className="absolute inset-0 text-amber-900/[0.07] dark:text-amber-200/[0.06]"
          />
          <MaskedAsset
            src="/extension/rra-crest.svg"
            className="relative h-14 w-14 text-amber-800/70 dark:text-amber-300/70"
          />
          <span className="relative text-xs font-semibold uppercase tracking-wider text-amber-900/70 dark:text-amber-200/70">
            {CATEGORY_LABELS[category] ?? 'Event'}
          </span>
        </div>
      )}
    </div>
  );
}
