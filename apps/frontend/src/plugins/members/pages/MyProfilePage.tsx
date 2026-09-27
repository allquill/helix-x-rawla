import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormField,
  PageHeader,
  Textarea,
} from '@helix-x/design-system';
import { HouseholdSection } from '../components/HouseholdSection';
import { useMyProfile } from '../hooks/useMembers';

const EDITABLE = [
  { key: 'phone', label: 'Phone', placeholder: '+14155550123' },
  { key: 'whatsappPhone', label: 'WhatsApp', placeholder: '+14155550123' },
  { key: 'industry', label: 'Industry' },
  { key: 'jobTitle', label: 'Job title' },
  { key: 'education', label: 'Education and achievements' },
  { key: 'linkedinUrl', label: 'LinkedIn URL' },
  { key: 'facebookUrl', label: 'Facebook URL' },
] as const;

/**
 * Self-service profile editing (MP-14).
 *
 * Reachable while the account is still gated — a member waiting on approval can
 * still correct their own details. Administrative fields (tier, chapter,
 * reviewer notes) are stripped server-side on this route regardless of what is
 * sent.
 */
export function MyProfilePage() {
  const { member, loading, error, save, saveSpouse, removeSpouse, saveChild, removeChild } =
    useMyProfile();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;
    setDraft(
      Object.fromEntries(
        EDITABLE.map(({ key }) => [key, (member as Record<string, unknown>)[key] as string ?? '']),
      ),
    );
  }, [member]);

  const submit = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await save(
        Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== '')),
      );
      setSaved(true);
    } catch (err) {
      const message = (err as { body?: { message?: string | string[] } }).body?.message;
      setSaveError(
        Array.isArray(message) ? message.join(', ') : message ?? 'Your profile could not be saved.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title="My profile" />

        {loading && <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">Loading…</p>}
        {error && <Alert variant="error">{error}</Alert>}
        {saveError && <Alert variant="error" className="mb-4">{saveError}</Alert>}
        {saved && <Alert variant="success" className="mb-4">Profile saved.</Alert>}

        {member && (
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {member.firstName} {member.lastName}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your name, lineage and tier are maintained by the Membership
                Secretary. Contact them to change those.
              </p>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col gap-4">
                {EDITABLE.map((field) => (
                  <FormField
                    key={field.key}
                    label={field.label}
                    placeholder={'placeholder' in field ? field.placeholder : undefined}
                    value={draft[field.key] ?? ''}
                    disabled={saving}
                    onChange={(event) =>
                      setDraft((d) => ({ ...d, [field.key]: event.target.value }))
                    }
                  />
                ))}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="familyHistory" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Family history
                  </label>
                  <Textarea
                    id="familyHistory"
                    rows={4}
                    value={draft.familyHistory ?? member.familyHistory ?? ''}
                    disabled={saving}
                    onChange={(event) =>
                      setDraft((d) => ({ ...d, familyHistory: event.target.value }))
                    }
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={submit} loading={saving}>
                    Save changes
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {member && (
          <HouseholdSection
            member={member}
            onSaveSpouse={saveSpouse}
            onRemoveSpouse={removeSpouse}
            onSaveChild={saveChild}
            onRemoveChild={removeChild}
          />
        )}
      </div>
  );
}
