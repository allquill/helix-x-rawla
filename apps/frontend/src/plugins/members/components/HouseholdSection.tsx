import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  DateField,
  DescriptionList,
  FormField,
  Modal,
  RadioGroup,
  Select,
} from '@helix-x/design-system';
import {
  PortalRegistrationService,
  UpsertChildDto,
  type MemberChildDto,
  type MemberDetailDto,
  type MemberSpouseDto,
  type RegistrationSpouseDto,
} from '@helix-x-rawla/client-sdk';

type Option = { value: string; label: string };

/**
 * The same admin-maintained lists the join form uses, so a spouse's caste is
 * stored as the same code whether it was entered at joining or afterwards.
 * The public config is readable by an applicant whose gates are still closed,
 * which the admin reference-data endpoint is not.
 */
function useReferenceOptions() {
  const [lists, setLists] = useState<Record<string, Option[]>>({});
  useEffect(() => {
    PortalRegistrationService.getPublicRegistrationConfig()
      .then((config) => setLists((config.referenceLists ?? {}) as Record<string, Option[]>))
      .catch(() => setLists({}));
  }, []);
  return (key: string): Option[] => lists[key] ?? [];
}

const apiMessage = (err: unknown, fallback: string): string => {
  const message = (err as { body?: { message?: string | string[] } }).body?.message;
  return Array.isArray(message) ? message.join(', ') : message ?? fallback;
};

/** `''` → `undefined`, so the API's email and E.164 checks see an omitted field. */
const withoutBlanks = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).map(([key, v]) => [key, typeof v === 'string' && v.trim() === '' ? undefined : v]),
  ) as T;

const fullName = (p: { firstName: string; middleName?: string | null; lastName: string }) =>
  [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');

const Label = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 dark:text-gray-300">
    {children}
  </label>
);

/** A select when the list is curated, free text until an administrator fills it. */
function ListOrText(props: {
  id: string;
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { id, label, options, value, onChange } = props;
  return options.length > 0 ? (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} options={options} placeholder="Optional" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  ) : (
    <FormField label={label} helperText="Optional" value={value} onChange={(e) => onChange(e.target.value)} />
  );
}

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
);

type SpouseDraft = Record<keyof RegistrationSpouseDto, string>;

const spouseDraft = (spouse?: MemberSpouseDto | null): SpouseDraft => ({
  firstName: spouse?.firstName ?? '',
  middleName: spouse?.middleName ?? '',
  lastName: spouse?.lastName ?? '',
  caste: spouse?.caste ?? '',
  gotra: spouse?.gotra ?? '',
  thikana: spouse?.thikana ?? '',
  nanihal: spouse?.nanihal ?? '',
  email: spouse?.email ?? '',
  phone: spouse?.phone ?? '',
  dateOfBirth: spouse?.dateOfBirth ?? '',
  industry: spouse?.industry ?? '',
  education: spouse?.education ?? '',
});

function SpouseDialog(props: {
  open: boolean;
  spouse?: MemberSpouseDto | null;
  options: (key: string) => Option[];
  onClose: () => void;
  onSave: (spouse: RegistrationSpouseDto) => Promise<void>;
}) {
  const { open, spouse, options, onClose, onSave } = props;
  const [draft, setDraft] = useState<SpouseDraft>(spouseDraft(spouse));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(spouseDraft(spouse));
      setError(null);
    }
  }, [open, spouse]);

  const set = (key: keyof SpouseDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = async () => {
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      setError("Your spouse's first and last name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(withoutBlanks(draft) as RegistrationSpouseDto);
      onClose();
    } catch (err) {
      setError(apiMessage(err, 'The spouse record could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={spouse ? 'Edit spouse' : 'Add spouse'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}
        <Row>
          <FormField label="First name" value={draft.firstName} onChange={(e) => set('firstName')(e.target.value)} />
          <FormField label="Middle name" helperText="Optional" value={draft.middleName} onChange={(e) => set('middleName')(e.target.value)} />
        </Row>
        <Row>
          <FormField label="Last name" value={draft.lastName} onChange={(e) => set('lastName')(e.target.value)} />
          <ListOrText id="spouseCaste" label="Caste / sub-clan" options={options('caste')} value={draft.caste} onChange={set('caste')} />
        </Row>
        <Row>
          <ListOrText id="spouseGotra" label="Gotra" options={options('gotra')} value={draft.gotra} onChange={set('gotra')} />
          <ListOrText id="spouseThikana" label="Ancestral village / Thikana" options={options('thikana')} value={draft.thikana} onChange={set('thikana')} />
        </Row>
        <Row>
          <FormField label="Nanihal" helperText="Optional" value={draft.nanihal} onChange={(e) => set('nanihal')(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="spouseDob">Date of birth</Label>
            <DateField id="spouseDob" value={draft.dateOfBirth} onChange={(e) => set('dateOfBirth')(e.target.value)} />
          </div>
        </Row>
        <Row>
          <FormField label="Email" type="email" helperText="Optional" value={draft.email} onChange={(e) => set('email')(e.target.value)} />
          <FormField label="Phone" placeholder="+14155550123" helperText="Optional" value={draft.phone} onChange={(e) => set('phone')(e.target.value)} />
        </Row>
        <Row>
          <FormField label="Industry" helperText="Optional" value={draft.industry} onChange={(e) => set('industry')(e.target.value)} />
          <FormField label="Education" helperText="Optional" value={draft.education} onChange={(e) => set('education')(e.target.value)} />
        </Row>
      </div>
    </Modal>
  );
}

type ChildDraft = Record<Exclude<keyof UpsertChildDto, 'gender'>, string> & { gender?: UpsertChildDto.gender };

const childDraft = (child?: MemberChildDto, lastName = ''): ChildDraft => ({
  firstName: child?.firstName ?? '',
  middleName: child?.middleName ?? '',
  lastName: child?.lastName ?? lastName,
  gender: (child?.gender as UpsertChildDto.gender | undefined) ?? undefined,
  dateOfBirth: child?.dateOfBirth ?? '',
  educationLevel: child?.educationLevel ?? '',
  achievements: child?.achievements ?? '',
});

function ChildDialog(props: {
  open: boolean;
  child?: MemberChildDto;
  defaultLastName: string;
  onClose: () => void;
  onSave: (child: UpsertChildDto) => Promise<void>;
}) {
  const { open, child, defaultLastName, onClose, onSave } = props;
  const [draft, setDraft] = useState<ChildDraft>(childDraft(child, defaultLastName));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(childDraft(child, defaultLastName));
      setError(null);
    }
  }, [open, child, defaultLastName]);

  const set = (key: keyof ChildDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = async () => {
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.dateOfBirth) {
      setError('First name, last name and date of birth are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(withoutBlanks(draft) as UpsertChildDto);
      onClose();
    } catch (err) {
      setError(apiMessage(err, 'The child record could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={child ? 'Edit child' : 'Add a child'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}
        <Row>
          <FormField label="First name" value={draft.firstName} onChange={(e) => set('firstName')(e.target.value)} />
          <FormField label="Middle name" helperText="Optional" value={draft.middleName} onChange={(e) => set('middleName')(e.target.value)} />
        </Row>
        <Row>
          <FormField label="Last name" value={draft.lastName} onChange={(e) => set('lastName')(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="childDob">Date of birth</Label>
            <DateField id="childDob" value={draft.dateOfBirth} onChange={(e) => set('dateOfBirth')(e.target.value)} />
          </div>
        </Row>
        <div className="flex flex-col gap-1.5">
          <span id="childGender" className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender</span>
          <RadioGroup
            name="childGender"
            aria-labelledby="childGender"
            inline
            value={draft.gender}
            onValueChange={(value) => setDraft((d) => ({ ...d, gender: value as UpsertChildDto.gender }))}
            options={[
              { value: UpsertChildDto.gender.MALE, label: 'Male' },
              { value: UpsertChildDto.gender.FEMALE, label: 'Female' },
            ]}
          />
        </div>
        <Row>
          <FormField label="Education level / grade" helperText="Optional" value={draft.educationLevel} onChange={(e) => set('educationLevel')(e.target.value)} />
          <FormField label="Achievements" helperText="Optional" value={draft.achievements} onChange={(e) => set('achievements')(e.target.value)} />
        </Row>
      </div>
    </Modal>
  );
}

export type HouseholdSectionProps = {
  member: MemberDetailDto;
  onSaveSpouse: (spouse: RegistrationSpouseDto) => Promise<void>;
  onRemoveSpouse: () => Promise<void>;
  onSaveChild: (child: UpsertChildDto, childId?: string) => Promise<void>;
  onRemoveChild: (childId: string) => Promise<void>;
};

/**
 * The signed-in member's spouse and children (MP-17 / MP-18).
 *
 * Both are optional at joining, so this is where most households are filled
 * in. Reachable while the account is still gated, like the rest of My Profile.
 */
export function HouseholdSection(props: HouseholdSectionProps) {
  const { member, onSaveSpouse, onRemoveSpouse, onSaveChild, onRemoveChild } = props;
  const options = useReferenceOptions();
  const [dialog, setDialog] = useState<'spouse' | 'child' | null>(null);
  const [editingChild, setEditingChild] = useState<MemberChildDto | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const spouse = member.spouse ?? null;
  const children = member.children ?? [];

  const confirmRemove = async (what: string, action: () => Promise<void>) => {
    if (!window.confirm(`Remove ${what} from your household?`)) return;
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(apiMessage(err, 'That change could not be saved.'));
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Household</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your spouse and children. Visible only to you and the Membership Secretary.
        </p>
      </CardHeader>
      <CardBody>
        <div className="flex flex-col gap-6">
          {error && <Alert variant="error">{error}</Alert>}

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Spouse</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setDialog('spouse')}>
                  {spouse ? 'Edit' : 'Add spouse'}
                </Button>
                {spouse && (
                  <Button size="sm" variant="ghost" onClick={() => confirmRemove('your spouse', onRemoveSpouse)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
            {spouse ? (
              <DescriptionList
                variant="field"
                columns={3}
                items={[
                  { term: 'Name', description: fullName(spouse) },
                  { term: 'Date of birth', description: spouse.dateOfBirth },
                  { term: 'Caste', description: spouse.caste },
                  { term: 'Gotra', description: spouse.gotra },
                  { term: 'Thikana', description: spouse.thikana },
                  { term: 'Email', description: spouse.email },
                  { term: 'Phone', description: spouse.phone },
                ]}
              />
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No spouse on file.</p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Children</h3>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditingChild(undefined);
                  setDialog('child');
                }}
              >
                Add a child
              </Button>
            </div>
            {children.length > 0 ? (
              <ul className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700">
                {children.map((child) => (
                  <li key={child.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {fullName(child)}{' '}
                      <span className="text-gray-500 dark:text-gray-400">
                        · born {child.dateOfBirth} · {child.membershipTier}
                      </span>
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingChild(child);
                          setDialog('child');
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => confirmRemove(child.firstName, () => onRemoveChild(child.id))}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No children on file.</p>
            )}
          </section>
        </div>
      </CardBody>

      <SpouseDialog
        open={dialog === 'spouse'}
        spouse={spouse}
        options={options}
        onClose={() => setDialog(null)}
        onSave={onSaveSpouse}
      />
      <ChildDialog
        open={dialog === 'child'}
        child={editingChild}
        defaultLastName={member.lastName}
        onClose={() => setDialog(null)}
        onSave={(child) => onSaveChild(child, editingChild?.id)}
      />
    </Card>
  );
}
