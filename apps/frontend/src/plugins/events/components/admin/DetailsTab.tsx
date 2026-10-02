import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  FileDropzone,
  FormField,
} from '@helix-x/design-system';
import type { AdminEventDto, UpdateEventDto } from '@helix-x-rawla/client-sdk';
import { useEventNotifications } from '../../hooks/useEventAdmin';
import { apiMessage } from '../../lib/format';
import { EventFlyer } from '../EventFlyer';
import { EventForm } from '../EventForm';

const heading = 'text-base font-semibold text-gray-900 dark:text-gray-100';

export type DetailsTabProps = {
  event: AdminEventDto;
  readOnly: boolean;
  canWrite: boolean;
  canPostPhotos: boolean;
  onUpdate: (body: UpdateEventDto) => Promise<unknown>;
  onUploadFlyer: (file: File) => Promise<unknown>;
  onSetPhotosLink: (url: string | null) => Promise<unknown>;
};

/** The event's own fields, its flyer (EVT-17), the photos link (EVT-25) and what has been sent. */
export function DetailsTab({
  event,
  readOnly,
  canWrite,
  canPostPhotos,
  onUpdate,
  onUploadFlyer,
  onSetPhotosLink,
}: DetailsTabProps) {
  const [saved, setSaved] = useState(false);
  const [flyerError, setFlyerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photosUrl, setPhotosUrl] = useState(event.photosUrl ?? '');
  const [photosError, setPhotosError] = useState<string | null>(null);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const { status } = useEventNotifications(canWrite ? event.id : undefined);

  useEffect(() => setPhotosUrl(event.photosUrl ?? ''), [event.photosUrl]);

  const uploadFlyer = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setFlyerError(null);
    try {
      await onUploadFlyer(file);
    } catch (err) {
      setFlyerError(apiMessage(err, 'The flyer could not be uploaded.'));
    } finally {
      setUploading(false);
    }
  };

  const savePhotos = async () => {
    setSavingPhotos(true);
    setPhotosError(null);
    try {
      await onSetPhotosLink(photosUrl.trim() || null);
    } catch (err) {
      setPhotosError(apiMessage(err, 'The link could not be saved. It must be a full web address.'));
    } finally {
      setSavingPhotos(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <h2 className={heading}>Event</h2>
        </CardHeader>
        <CardBody>
          {saved && <Alert variant="success" className="mb-4">Saved.</Alert>}
          <EventForm
            // Remount on a server change so the fields show what was stored.
            key={`${event.id}:${event.status}`}
            event={event}
            disabled={readOnly || !canWrite}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              setSaved(false);
              await onUpdate(values as UpdateEventDto);
              setSaved(true);
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className={heading}>Flyer</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Every signed-in member can see it. Optional for smaller events.
          </p>
        </CardHeader>
        <CardBody>
          {flyerError && <Alert variant="error" className="mb-3">{flyerError}</Alert>}
          {event.hasFlyer && event.flyerName && event.flyerMimeType && (
            <div className="mb-4">
              <EventFlyer
                key={event.flyerName}
                eventId={event.id}
                name={event.flyerName}
                mimeType={event.flyerMimeType}
                adminPreview={event.status === 'draft'}
              />
            </div>
          )}
          {!readOnly && canWrite && (
            <FileDropzone
              accept="image/*,application/pdf"
              disabled={uploading}
              label={uploading ? 'Uploading…' : event.hasFlyer ? 'Replace the flyer' : 'Add a flyer'}
              hint="An image or a PDF."
              onFilesSelected={(files) => uploadFlyer(files[0])}
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className={heading}>Photos</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Once the event is over, post the link to the photos. It must be done before the event is closed.
          </p>
        </CardHeader>
        <CardBody>
          {photosError && <Alert variant="error" className="mb-3">{photosError}</Alert>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <FormField
                label="Link to the photos"
                placeholder="https://…"
                value={photosUrl}
                disabled={readOnly || !canPostPhotos || savingPhotos}
                onChange={(e) => setPhotosUrl(e.target.value)}
              />
            </div>
            {!readOnly && canPostPhotos && (
              <Button onClick={savePhotos} loading={savingPhotos}>
                Save link
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {canWrite && status && (
        <Card>
          <CardHeader>
            <h2 className={heading}>Invitation and reminders</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {event.status === 'draft'
                ? 'The invitation is emailed to every member when the event is published.'
                : status.invitationCompletedAt
                  ? `The invitation went out on ${new Date(status.invitationCompletedAt).toLocaleString()}.`
                  : 'The invitation is being sent.'}
            </p>
          </CardHeader>
          {status.passes.length > 0 && (
            <CardBody>
              <ul className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
                {status.passes.map((pass) => (
                  <li key={`${pass.kind}:${pass.scheduleKey}`} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="text-gray-900 dark:text-gray-100">
                      {pass.kind === 'invitation'
                        ? 'Invitation'
                        : `Reminder, ${pass.scheduleKey.replace(/^d/, '')} day(s) before`}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {[
                        `${pass.sent} sent`,
                        pass.skippedOptOut && `${pass.skippedOptOut} opted out`,
                        pass.failed && `${pass.failed} failed`,
                        pass.claimed && `${pass.claimed} unconfirmed`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          )}
        </Card>
      )}
    </div>
  );
}
