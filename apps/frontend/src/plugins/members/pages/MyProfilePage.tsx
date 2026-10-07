import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  DescriptionList,
  FormField,
  PageHeader,
  Textarea,
} from '@helix-x/web/design-system';
import type { MemberDetailDto, UpdateMemberDto } from '@helix-x-rawla/client-sdk';
import { CertificatesSection } from '../components/CertificatesSection';
import { HouseholdSection } from '../components/HouseholdSection';
import { EditDialog, Label, ProfileSection, orDash } from '../components/ProfileEditing';
import { useMyProfile } from '../hooks/useMembers';

type EditableKey =
  | 'phone'
  | 'whatsappPhone'
  | 'industry'
  | 'jobTitle'
  | 'education'
  | 'linkedinUrl'
  | 'facebookUrl'
  | 'familyHistory';

type FieldSpec = { key: EditableKey; label: string; placeholder?: string };

const CONTACT: FieldSpec[] = [
  { key: 'phone', label: 'Phone', placeholder: '+14155550123' },
  { key: 'whatsappPhone', label: 'WhatsApp', placeholder: '+14155550123' },
];

const WORK: FieldSpec[] = [
  { key: 'industry', label: 'Industry' },
  { key: 'jobTitle', label: 'Job title' },
  { key: 'education', label: 'Education and achievements' },
  { key: 'linkedinUrl', label: 'LinkedIn URL' },
  { key: 'facebookUrl', label: 'Facebook URL' },
];

// Module-level so the dialog's seeding effect sees a stable array.
const FAMILY_HISTORY: FieldSpec[] = [{ key: 'familyHistory', label: 'Family history' }];

type Section = 'contact' | 'work' | 'familyHistory';

/** A field's saved value, or undefined when the server did not send it. */
const valueOf = (member: MemberDetailDto, key: EditableKey) =>
  (member as unknown as Record<EditableKey, string | null | undefined>)[key];

const draftFor = (member: MemberDetailDto, fields: FieldSpec[]) =>
  Object.fromEntries(fields.map(({ key }) => [key, valueOf(member, key) ?? '']));

/**
 * One section's edit dialog: its fields, seeded from the member when it opens.
 *
 * Only non-empty values are sent, as before — the API validates phone numbers
 * as E.164, so an empty string would be refused rather than clear the field.
 */
function FieldsDialog(props: {
  open: boolean;
  title: string;
  member: MemberDetailDto;
  fields: FieldSpec[];
  onClose: () => void;
  onSave: (patch: UpdateMemberDto) => Promise<void>;
}) {
  const { open, title, member, fields, onClose, onSave } = props;
  const [draft, setDraft] = useState<Record<string, string>>({});

  // Seed on open, so Cancel discards and the next Edit starts from what is saved.
  useEffect(() => {
    if (open) setDraft(draftFor(member, fields));
  }, [open, member, fields]);

  const submit = () =>
    onSave(Object.fromEntries(Object.entries(draft).filter(([, value]) => value.trim() !== '')));

  return (
    <EditDialog open={open} title={title} onClose={onClose} onSubmit={submit} size="md">
      {fields.map((field) =>
        field.key === 'familyHistory' ? (
          <div key={field.key} className="flex flex-col gap-1.5">
            <Label htmlFor="familyHistory">{field.label}</Label>
            <Textarea
              id="familyHistory"
              rows={6}
              value={draft.familyHistory ?? ''}
              onChange={(event) => setDraft((d) => ({ ...d, familyHistory: event.target.value }))}
            />
          </div>
        ) : (
          <FormField
            key={field.key}
            label={field.label}
            placeholder={field.placeholder}
            value={draft[field.key] ?? ''}
            onChange={(event) => setDraft((d) => ({ ...d, [field.key]: event.target.value }))}
          />
        ),
      )}
    </EditDialog>
  );
}

/**
 * Self-service profile editing (MP-14).
 *
 * Every section follows one pattern: read-only by default, with an Edit button
 * that opens a dialog — the same as the household below it. Reachable while
 * the account is still gated, so a member waiting on approval can still
 * correct their own details. Administrative fields (tier, chapter, reviewer
 * notes) are stripped server-side on this route regardless of what is sent.
 */
export function MyProfilePage() {
  const { member, loading, error, save, saveSpouse, removeSpouse, saveChild, removeChild } =
    useMyProfile();
  const [editing, setEditing] = useState<Section | null>(null);

  const edit = (section: Section) => (
    <Button size="sm" variant="secondary" onClick={() => setEditing(section)}>
      Edit
    </Button>
  );

  const summary = (fields: FieldSpec[]) => (
    <DescriptionList
      variant="field"
      columns={fields.length > 2 ? 3 : 2}
      items={fields.map(({ key, label }) => ({ term: label, description: orDash(member && valueOf(member, key)) }))}
    />
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="My profile" />

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">Loading…</p>}
      {error && <Alert variant="error">{error}</Alert>}

      {member && (
        <div className="flex flex-col gap-6">
          <ProfileSection
            title={`${member.firstName} ${member.lastName}`}
            description="Your name, lineage and tier are maintained by the Membership Secretary. Contact them to change those."
          >
            <DescriptionList
              variant="field"
              columns={3}
              items={[
                { term: 'Member ID', description: orDash(member.publicMemberId) },
                { term: 'Membership tier', description: orDash(member.membershipTier) },
                { term: 'Chapter', description: member.chapterId ?? 'Unassigned' },
                { term: 'Gotra', description: orDash(member.gotra) },
                { term: 'Caste', description: orDash(member.caste) },
                { term: 'Thikana', description: orDash(member.thikana) },
              ]}
            />
          </ProfileSection>

          <ProfileSection title="Contact" actions={edit('contact')}>
            {summary(CONTACT)}
          </ProfileSection>

          <ProfileSection title="Work and education" actions={edit('work')}>
            {summary(WORK)}
          </ProfileSection>

          <ProfileSection title="Family history" actions={edit('familyHistory')}>
            <p className="whitespace-pre-line text-sm text-gray-900 dark:text-gray-100">
              {member.familyHistory || (
                <span className="text-gray-500 dark:text-gray-400">Nothing recorded yet.</span>
              )}
            </p>
          </ProfileSection>

          <HouseholdSection
            member={member}
            onSaveSpouse={saveSpouse}
            onRemoveSpouse={removeSpouse}
            onSaveChild={saveChild}
            onRemoveChild={removeChild}
          />

          <CertificatesSection />

          <FieldsDialog
            open={editing === 'contact'}
            title="Edit contact details"
            member={member}
            fields={CONTACT}
            onClose={() => setEditing(null)}
            onSave={save}
          />
          <FieldsDialog
            open={editing === 'work'}
            title="Edit work and education"
            member={member}
            fields={WORK}
            onClose={() => setEditing(null)}
            onSave={save}
          />
          <FieldsDialog
            open={editing === 'familyHistory'}
            title="Edit family history"
            member={member}
            fields={FAMILY_HISTORY}
            onClose={() => setEditing(null)}
            onSave={save}
          />
        </div>
      )}
    </div>
  );
}

