import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Switch,
} from '@helix-x/design-system';
import { useMyProfile } from '../hooks/useMembers';

/** Fields a member may hide from the directory (MP-19, §3.2). */
const HIDEABLE = [
  { key: 'phone', label: 'Phone number' },
  { key: 'whatsappPhone', label: 'WhatsApp number' },
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'weddingDate', label: 'Wedding anniversary' },
  { key: 'jobTitle', label: 'Job title' },
  { key: 'industry', label: 'Industry' },
  { key: 'education', label: 'Education and achievements' },
  { key: 'familyHistory', label: 'Family history' },
  { key: 'linkedinUrl', label: 'LinkedIn profile' },
  { key: 'facebookUrl', label: 'Facebook profile' },
];

/**
 * Directory visibility, global and per field (MP-19).
 *
 * The switches are enforced server-side: a hidden field is left out of the
 * serialised member entirely, so opting out removes the data from the response
 * rather than merely from this UI.
 */
export function PrivacySettingsPage() {
  const { member, loading, error, savePrivacy } = useMyProfile();
  const [optIn, setOptIn] = useState(true);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;
    const raw = (member as unknown as { fieldVisibility?: Record<string, string> })
      .fieldVisibility;
    setHidden(
      Object.fromEntries(HIDEABLE.map(({ key }) => [key, raw?.[key] === 'hidden'])),
    );
    const optedIn = (member as unknown as { directoryOptIn?: boolean }).directoryOptIn;
    setOptIn(optedIn !== false);
  }, [member]);

  const submit = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await savePrivacy({
        directoryOptIn: optIn,
        fieldVisibility: Object.fromEntries(
          HIDEABLE.map(({ key }) => [key, hidden[key] ? 'hidden' : 'visible']),
        ),
      });
      setSaved(true);
    } catch {
      setSaveError('Your privacy settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          title="Privacy"
          description="Nothing here is ever public — the directory sits entirely behind the login wall. These settings control what other signed-in members see."
        />

        {loading && <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">Loading…</p>}
        {error && <Alert variant="error">{error}</Alert>}
        {saveError && <Alert variant="error" className="mb-4">{saveError}</Alert>}
        {saved && <Alert variant="success" className="mb-4">Privacy settings saved.</Alert>}

        {member && (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Directory listing
                </h2>
              </CardHeader>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      List me in the member directory
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Turning this off hides your whole record from other members.
                      Administrators can still see it.
                    </span>
                  </div>
                  <Switch checked={optIn} onCheckedChange={setOptIn} aria-label="List me in the directory" />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Individual fields
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Hide single fields while staying in the directory.
                </p>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col gap-3">
                  {HIDEABLE.map((field) => (
                    <div key={field.key} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-900 dark:text-gray-100">{field.label}</span>
                      <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        Hidden
                        <Switch
                          checked={Boolean(hidden[field.key])}
                          onCheckedChange={(next) =>
                            setHidden((h) => ({ ...h, [field.key]: next }))
                          }
                          aria-label={`Hide ${field.label}`}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <div className="flex justify-end">
              <Button onClick={submit} loading={saving}>
                Save privacy settings
              </Button>
            </div>
          </div>
        )}
      </div>
  );
}
