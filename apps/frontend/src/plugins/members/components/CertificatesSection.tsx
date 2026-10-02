import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, FileDropzone, FormField, Modal, Select } from '@helix-x/design-system';
import { useUser } from '@helix-x/web';
import { PortalCertificatesService, type CertificateDto } from '@helix-x-rawla/client-sdk';
import { downloadPortalFile } from '../lib/files';
import { ProfileSection } from './ProfileEditing';

export type CertificatesSectionProps = {
  /**
   * Whose certificates. Omit on My profile: the member's own and their
   * children's. Set on a member's page, where staff who may upload see that
   * member's and can add to them.
   */
  memberId?: string;
  /** The member's children, for filing a certificate under one (staff upload only). */
  childProfiles?: Array<{ id: string; firstName: string; lastName: string }>;
};

/**
 * Certificates on a profile (REC-07 / REC-08).
 *
 * They are prepared outside the portal and uploaded by an Admin or Secretary;
 * the member — or the parent, for a child's — downloads and prints them. On a
 * member's page the section is shown only to someone who may upload: nobody
 * else can read another member's certificates, and the API says so with 403.
 */
export function CertificatesSection({ memberId, childProfiles = [] }: CertificatesSectionProps) {
  const user = useUser();
  const canUpload = user?.permissions?.includes('certificates:upload') === true;
  const staffView = memberId !== undefined;

  const [certificates, setCertificates] = useState<CertificateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCertificates(
        staffView
          ? await PortalCertificatesService.listMemberCertificates({ memberId: memberId! })
          : await PortalCertificatesService.listMyCertificates(),
      );
    } catch {
      setError('Could not load the certificates.');
    } finally {
      setLoading(false);
    }
  }, [staffView, memberId]);

  useEffect(() => {
    if (staffView && !canUpload) return;
    refresh();
  }, [refresh, staffView, canUpload]);

  if (staffView && !canUpload) return null;

  const run = async (work: () => Promise<void>, failed: string) => {
    setError(null);
    try {
      await work();
    } catch {
      setError(failed);
    }
  };

  return (
    <ProfileSection
      title="Certificates"
      description={
        staffView
          ? 'Certificates prepared outside the portal. The member, or the parent for a child, can download them.'
          : 'Volunteer and appreciation certificates, to download and print — for school or college applications, for example.'
      }
      actions={
        staffView ? (
          <Button size="sm" variant="secondary" onClick={() => setUploading(true)}>
            Upload certificate
          </Button>
        ) : undefined
      }
    >
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      {loading && <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">Loading…</p>}
      {!loading && certificates.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No certificates yet.</p>
      )}
      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {certificates.map((certificate) => (
          <li key={certificate.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{certificate.title}</p>
              <p className="text-gray-500 dark:text-gray-400">
                {[
                  certificate.childName ? `For ${certificate.childName}` : null,
                  certificate.eventTitle,
                  new Date(certificate.createdAt).toLocaleDateString(),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon="download"
                onClick={() =>
                  run(
                    () => downloadPortalFile(`/api/certificates/${certificate.id}/content`, certificate.fileName),
                    'The certificate could not be downloaded.',
                  )
                }
              >
                Download
              </Button>
              {staffView && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    run(async () => {
                      await PortalCertificatesService.deleteMemberCertificate({ certificateId: certificate.id });
                      await refresh();
                    }, 'The certificate could not be deleted.')
                  }
                >
                  Delete
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {staffView && (
        <UploadDialog
          open={uploading}
          memberId={memberId!}
          childProfiles={childProfiles}
          onClose={() => setUploading(false)}
          onUploaded={refresh}
        />
      )}
    </ProfileSection>
  );
}

function UploadDialog({
  open,
  memberId,
  childProfiles,
  onClose,
  onUploaded,
}: {
  open: boolean;
  memberId: string;
  childProfiles: Array<{ id: string; firstName: string; lastName: string }>;
  onClose: () => void;
  onUploaded: () => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [childProfileId, setChildProfileId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setChildProfileId('');
    setFile(null);
    setError(null);
  }, [open]);

  const save = async () => {
    if (title.trim().length < 2 || !file) {
      setError('A title and a file are both required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await PortalCertificatesService.uploadMemberCertificate({
        memberId,
        formData: { file, title: title.trim(), ...(childProfileId ? { childProfileId } : {}) },
      });
      await onUploaded();
      onClose();
    } catch (err) {
      const message = (err as { body?: { message?: string } }).body?.message;
      setError(message ?? 'The certificate could not be uploaded.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title="Upload a certificate"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={save} loading={submitting}>
            Upload
          </Button>
        </>
      }
    >
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <div className="flex flex-col gap-4">
        <FormField
          label="Title"
          placeholder="Volunteer certificate — Holi Milan 2027"
          value={title}
          disabled={submitting}
          onChange={(e) => setTitle(e.target.value)}
        />
        {childProfiles.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="certificate-child" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              For
            </label>
            <Select
              id="certificate-child"
              value={childProfileId}
              disabled={submitting}
              placeholder="The member"
              options={childProfiles.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName} (child)` }))}
              onChange={(e) => setChildProfileId(e.target.value)}
            />
          </div>
        )}
        <FileDropzone
          accept="application/pdf,image/*"
          disabled={submitting}
          label={file ? file.name : 'Choose the certificate'}
          hint="A PDF or an image."
          onFilesSelected={(files) => setFile(files[0] ?? null)}
        />
      </div>
    </Modal>
  );
}
