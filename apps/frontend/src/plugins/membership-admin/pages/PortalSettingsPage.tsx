import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardBody, CardHeader, FormField, Switch } from '@helix-x/web/design-system';
import { PortalAdminLayout } from '../../../shared/PortalAdminLayout';
import { usePortalSettings } from '../hooks/usePortalSettings';

/** Human labels for the keys, so the screen is not a raw key/value dump. */
const GROUPS: Array<{ title: string; description: string; keys: string[] }> = [
  {
    title: 'Activation',
    description: 'Who may join, and what it takes to become active.',
    keys: [
      'registration.minimum_age',
      'registration.payment_required',
      'registration.awaiting_payment_reminder_days',
      'registration.unverified_purge_days',
      'registration.consent_version',
    ],
  },
  {
    title: 'Credential links',
    description:
      'Lifetimes and resend limits for verification, password setup and reset. Links already sent keep the settings they were issued under.',
    keys: [
      'credential.ttl_minutes.email_verification',
      'credential.ttl_minutes.credential_setup',
      'credential.ttl_minutes.password_reset',
      'credential.resend_cooldown_seconds',
      'credential.resend_hourly_cap',
    ],
  },
];

const LABELS: Record<string, string> = {
  'registration.minimum_age': 'Minimum age to hold an account',
  'registration.payment_required': 'Require membership dues',
  'registration.awaiting_payment_reminder_days': 'Days before an unpaid member is reminded',
  'registration.unverified_purge_days': 'Days before an unverified application is purged',
  'registration.consent_version': 'Current consent document version',
  'credential.ttl_minutes.email_verification': 'Verification link lifetime (minutes)',
  'credential.ttl_minutes.credential_setup': 'Password-setup link lifetime (minutes)',
  'credential.ttl_minutes.password_reset': 'Password-reset link lifetime (minutes)',
  'credential.resend_cooldown_seconds': 'Seconds between resends',
  'credential.resend_hourly_cap': 'Resends allowed per hour',
};

export function PortalSettingsPage() {
  const { settings, loading, error, save } = usePortalSettings();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(Object.fromEntries(settings.map((s) => [s.key, s.value])));
  }, [settings]);

  const dirty = settings.some((s) => draft[s.key] !== undefined && draft[s.key] !== s.value);

  const submit = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      // Only settings the operator actually edited. `draft[key]` is
      // `string | undefined` — a key never touched has no draft entry — and
      // filtering on `!== s.value` alone would have sent those through as
      // `undefined`, blanking a setting nobody meant to change.
      const changed: Record<string, string> = {};
      for (const setting of settings) {
        const value = draft[setting.key];
        if (value !== undefined && value !== setting.value) changed[setting.key] = value;
      }
      await save(changed);
      setSaved(true);
    } catch (err) {
      const body = (err as { body?: { message?: string } }).body;
      setSaveError(body?.message ?? 'The settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const byKey = new Map(settings.map((s) => [s.key, s]));

  return (
    <PortalAdminLayout
      title="Portal settings"
      description="Every change here is audited and takes effect on the next use — never retroactively."
      actions={
        <Button onClick={submit} loading={saving} disabled={!dirty}>
          Save changes
        </Button>
      }
    >
      {loading && <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">Loading…</p>}
      {error && <Alert variant="error">{error}</Alert>}
      {saveError && <Alert variant="error" className="mb-4">{saveError}</Alert>}
      {saved && !dirty && <Alert variant="success" className="mb-4">Settings saved.</Alert>}

      <div className="flex flex-col gap-4">
        {GROUPS.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {group.title}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{group.description}</p>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col gap-4">
                {group.keys.filter((key) => byKey.has(key)).map((key) => {
                  const setting = byKey.get(key)!;
                  if (setting.valueType === 'boolean') {
                    return (
                      <div key={key} className="flex items-start justify-between gap-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {LABELS[key] ?? key}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {setting.description}
                          </span>
                        </div>
                        <Switch
                          checked={draft[key] === 'true'}
                          aria-label={LABELS[key] ?? key}
                          onCheckedChange={(next) =>
                            setDraft((d) => ({ ...d, [key]: next ? 'true' : 'false' }))
                          }
                        />
                      </div>
                    );
                  }
                  return (
                    <FormField
                      key={key}
                      label={LABELS[key] ?? key}
                      helperText={setting.description ?? undefined}
                      type={setting.valueType === 'number' ? 'number' : 'text'}
                      value={draft[key] ?? ''}
                      onChange={(event) => setDraft((d) => ({ ...d, [key]: event.target.value }))}
                    />
                  );
                })}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </PortalAdminLayout>
  );
}
