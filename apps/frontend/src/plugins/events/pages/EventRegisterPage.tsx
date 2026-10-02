import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { RouteViewProps } from '@helix-x/web';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  FormField,
  Select,
  Stepper,
  TextareaField,
} from '@helix-x/design-system';
import type { RegistrationOptionsDto, RegistrationPersonDto } from '@helix-x-rawla/client-sdk';
import { useRegistrationOptions } from '../hooks/useEvents';
import { apiMessage, formatAmount, formatMoney, formatTime, formatWhen } from '../lib/format';

type PersonDetails = {
  dietaryPref: string;
  dietaryNotes: string;
  tshirtSize: string;
  hotelDetails: string;
  isVolunteer: boolean;
  slotIds: string[];
};

const emptyDetails: PersonDetails = {
  dietaryPref: '',
  dietaryNotes: '',
  tshirtSize: '',
  hotelDetails: '',
  isVolunteer: false,
  slotIds: [],
};

const heading = 'text-base font-semibold text-gray-900 dark:text-gray-100';

/**
 * Register the household for an event, in one go (EVT-01).
 *
 * The steps are: who is coming; each person's details and whether they will
 * volunteer (EVT-04, VOL-10); the waiver, if the event has one (EVT-05); time
 * slots, if it has any (EVT-03); then review and pay. Everything shown — the
 * people, the ticket and price each gets, the places left — comes from the
 * server, which checks all of it again when the form is submitted.
 */
export function EventRegisterPage({ params }: RouteViewProps) {
  const id = params?.id;
  const navigate = useNavigate();
  const { options, loading, error, register, checkout } = useRegistrationOptions(id);

  const [selected, setSelected] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, PersonDetails>>({});
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Start with the member who is registering ticked.
  useEffect(() => {
    const first = options?.people.find((p) => p.personType === 'member' && p.ticketTypeId);
    if (first) setSelected((current) => (current.length ? current : [first.personKey]));
  }, [options]);

  const steps = useMemo(() => {
    const list = [
      { id: 'who', label: 'Who is coming' },
      { id: 'details', label: 'Details' },
    ];
    if (options?.waiver) list.push({ id: 'waiver', label: 'Waiver' });
    if (options?.slots.length) list.push({ id: 'slots', label: 'Time slots' });
    list.push({ id: 'review', label: 'Review and pay' });
    return list;
  }, [options]);

  if (loading) {
    return <Shell><p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">Loading…</p></Shell>;
  }
  if (error || !options) {
    return <Shell><Alert variant="error">{error ?? 'Could not load the registration form.'}</Alert></Shell>;
  }

  const { event } = options;
  const back = (
    <Link to={`/events/${event.id}`}>
      <Button variant="secondary">Back to the event</Button>
    </Link>
  );

  if (options.existingRegistrationId) {
    return (
      <Shell title={event.title} actions={back}>
        <Alert variant="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Your household is already registered for this event.</span>
            <Link to={`/events/${event.id}/registration`}>
              <Button size="sm">View my registration</Button>
            </Link>
          </div>
        </Alert>
      </Shell>
    );
  }
  if (!options.registrationOpen) {
    return (
      <Shell title={event.title} actions={back}>
        <Alert variant="warning">{options.registrationClosedMessage ?? 'Registration is not open.'}</Alert>
      </Shell>
    );
  }

  const people = options.people.filter((p) => selected.includes(p.personKey));
  const total = people.reduce((sum, p) => sum + (p.unitPriceCents ?? 0), 0);
  const remaining = options.remainingCapacity;
  const detailsOf = (key: string) => details[key] ?? emptyDetails;
  const patch = (key: string, change: Partial<PersonDetails>) =>
    setDetails((current) => ({ ...current, [key]: { ...detailsOf(key), ...change } }));
  const current = steps[step]?.id ?? 'who';

  const validate = (): string | null => {
    if (current === 'who') {
      if (people.length === 0) return 'Choose at least one person.';
      if (remaining !== null && remaining !== undefined && people.length > remaining) {
        return `Only ${remaining} ${remaining === 1 ? 'place is' : 'places are'} left.`;
      }
    }
    if (current === 'waiver') {
      if (!waiverAccepted) return 'Please confirm that you accept the waiver.';
      if (signedName.trim().length < 2) return 'Please type your full name to sign.';
    }
    return null;
  };

  const next = () => {
    const problem = validate();
    setStepError(problem);
    if (!problem) setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const submit = async () => {
    setSubmitting(true);
    setStepError(null);
    let created = false;
    try {
      const registration = await register({
        attendees: people.map((p) => {
          const d = detailsOf(p.personKey);
          return {
            personKey: p.personKey,
            dietaryPref: d.dietaryPref || null,
            dietaryNotes: d.dietaryNotes.trim() || null,
            tshirtSize: d.tshirtSize || null,
            hotelDetails: d.hotelDetails.trim() || null,
            isVolunteer: d.isVolunteer,
            slotIds: d.slotIds,
          };
        }),
        ...(options.waiver ? { waiverAccepted, waiverSignedName: signedName.trim() } : {}),
      });
      created = true;
      if (registration.balanceCents > 0) await checkout();
      else navigate(`/events/${event.id}/registration`);
    } catch (err) {
      // Registered but the checkout would not open: the registration page has "Pay now".
      if (created) navigate(`/events/${event.id}/registration`);
      else setStepError(apiMessage(err, 'Your registration could not be completed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell title={`Register — ${event.title}`} description={formatWhen(event)} actions={back}>
      <Stepper steps={steps} current={step} className="mb-6" />
      {stepError && <Alert variant="error" className="mb-4">{stepError}</Alert>}

      {current === 'who' && (
        <Card>
          <CardHeader>
            <h2 className={heading}>Who is coming?</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Everyone in your household. Each person gets the ticket for their age on the day
              {remaining !== null && remaining !== undefined ? ` — ${remaining} places left.` : '.'}
            </p>
          </CardHeader>
          <CardBody>
            <ul className="flex flex-col gap-3">
              {options.people.map((person) => (
                <li key={person.personKey} className="flex flex-wrap items-center justify-between gap-3">
                  <Checkbox
                    checked={selected.includes(person.personKey)}
                    disabled={!person.ticketTypeId}
                    onChange={(event) =>
                      setSelected((keys) =>
                        event.target.checked
                          ? [...keys, person.personKey]
                          : keys.filter((key) => key !== person.personKey),
                      )
                    }
                    label={person.fullName}
                  />
                  <PersonPrice person={person} currency={event.currency} />
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-gray-200 pt-4 text-sm font-medium text-gray-900 dark:border-gray-800 dark:text-gray-100">
              Total: {formatAmount(total, event.currency)}
            </p>
          </CardBody>
        </Card>
      )}

      {current === 'details' && (
        <div className="flex flex-col gap-4">
          {people.map((person) => {
            const d = detailsOf(person.personKey);
            return (
              <Card key={person.personKey}>
                <CardHeader>
                  <h2 className={heading}>{person.fullName}</h2>
                </CardHeader>
                <CardBody>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <LabelledSelect
                      id={`diet-${person.personKey}`}
                      label="Food preference"
                      value={d.dietaryPref}
                      options={options.dietaryOptions}
                      onChange={(value) => patch(person.personKey, { dietaryPref: value })}
                    />
                    <FormField
                      label="Allergies or other needs"
                      value={d.dietaryNotes}
                      maxLength={500}
                      onChange={(e) => patch(person.personKey, { dietaryNotes: e.target.value })}
                    />
                    {event.collectTshirt && (
                      <LabelledSelect
                        id={`shirt-${person.personKey}`}
                        label="T-shirt size"
                        value={d.tshirtSize}
                        options={options.tshirtOptions}
                        onChange={(value) => patch(person.personKey, { tshirtSize: value })}
                      />
                    )}
                    {event.collectHotel && (
                      <TextareaField
                        label="Hotel details"
                        rows={2}
                        value={d.hotelDetails}
                        maxLength={1000}
                        onChange={(e) => patch(person.personKey, { hotelDetails: e.target.value })}
                      />
                    )}
                  </div>
                  <div className="mt-4">
                    <Checkbox
                      checked={d.isVolunteer}
                      onChange={(e) => patch(person.personKey, { isVolunteer: e.target.checked })}
                      label={`${person.fullName.split(' ')[0]} will volunteer at this event`}
                    />
                    <p className="ml-7 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Activities are assigned later and the organisers will be in touch. Hours served
                      are recorded after the event.
                    </p>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {current === 'waiver' && options.waiver && (
        <Card>
          <CardHeader>
            <h2 className={heading}>{options.waiver.title}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Version {options.waiver.version}</p>
          </CardHeader>
          <CardBody>
            <div
              tabIndex={0}
              className="max-h-72 overflow-y-auto whitespace-pre-line rounded-lg border border-gray-200 p-4 text-sm leading-6 text-gray-700 dark:border-gray-800 dark:text-gray-300"
            >
              {options.waiver.body}
            </div>
            <div className="mt-4 flex flex-col gap-4">
              <Checkbox
                checked={waiverAccepted}
                onChange={(e) => setWaiverAccepted(e.target.checked)}
                label={`I accept this waiver for ${people.map((p) => p.fullName).join(', ')}`}
              />
              <FormField
                label="Type your full name to sign"
                helperText="You sign for yourself and, as parent or guardian, for any children registered."
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
              />
            </div>
          </CardBody>
        </Card>
      )}

      {current === 'slots' && (
        <Card>
          <CardHeader>
            <h2 className={heading}>Time slots</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Optional. Book a slot for anyone who wants one.
            </p>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-5">
              {people.map((person) => (
                <fieldset key={person.personKey}>
                  <legend className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {person.fullName}
                  </legend>
                  <div className="flex flex-col gap-2">
                    {options.slots.map((slot) => {
                      const mine = detailsOf(person.personKey).slotIds.includes(slot.id);
                      // Places this household has already picked in this form count too.
                      const picked = people.filter((p) => detailsOf(p.personKey).slotIds.includes(slot.id)).length;
                      const full = !mine && slot.remaining - picked <= 0;
                      return (
                        <Checkbox
                          key={slot.id}
                          checked={mine}
                          disabled={full}
                          onChange={(e) => {
                            const ids = detailsOf(person.personKey).slotIds;
                            patch(person.personKey, {
                              slotIds: e.target.checked ? [...ids, slot.id] : ids.filter((s) => s !== slot.id),
                            });
                          }}
                          label={`${slot.activity} · ${formatTime(slot.startsAt, event.timezone)}–${formatTime(
                            slot.endsAt,
                            event.timezone,
                          )} · ${full ? 'full' : `${Math.max(0, slot.remaining - picked + (mine ? 1 : 0))} left`}`}
                        />
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {current === 'review' && (
        <Card>
          <CardHeader>
            <h2 className={heading}>Review</h2>
          </CardHeader>
          <CardBody>
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {people.map((person) => {
                const d = detailsOf(person.personKey);
                const slots = options.slots.filter((s) => d.slotIds.includes(s.id)).map((s) => s.activity);
                return (
                  <li key={person.personKey} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {person.fullName}
                        {d.isVolunteer && <Badge variant="brand" className="ml-2">Volunteer</Badge>}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {[
                          person.ticketTypeName,
                          labelOf(options, 'diet', d.dietaryPref),
                          labelOf(options, 'shirt', d.tshirtSize),
                          ...slots,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <PersonPrice person={person} currency={event.currency} />
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 border-t border-gray-200 pt-4 text-base font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
              Total: {formatAmount(total, event.currency)}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {total > 0
                ? 'You will be taken to a secure page to pay. Once you have paid, the registration cannot be cancelled in the portal.'
                : 'There is nothing to pay — your places are confirmed straight away.'}
            </p>
          </CardBody>
        </Card>
      )}

      <div className="mt-6 flex justify-between gap-3">
        <Button
          variant="secondary"
          disabled={step === 0 || submitting}
          onClick={() => {
            setStepError(null);
            setStep((s) => Math.max(0, s - 1));
          }}
        >
          Back
        </Button>
        {current === 'review' ? (
          <Button onClick={submit} loading={submitting}>
            {total > 0 ? `Register and pay ${formatAmount(total, event.currency)}` : 'Register'}
          </Button>
        ) : (
          <Button onClick={next}>Continue</Button>
        )}
      </div>
    </Shell>
  );
}

function Shell({
  title = 'Register',
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function PersonPrice({ person, currency }: { person: RegistrationPersonDto; currency: string }) {
  if (!person.ticketTypeId) {
    return <span className="text-sm text-gray-500 dark:text-gray-400">No ticket for this age</span>;
  }
  return (
    <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
      {person.ticketTypeName}
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {formatMoney(person.unitPriceCents, currency)}
      </span>
      {person.pricingTier === 'early_bird' && <Badge variant="success">Early bird</Badge>}
    </span>
  );
}

function LabelledSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <Select
        id={id}
        placeholder="No preference"
        value={value}
        options={options}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function labelOf(options: RegistrationOptionsDto, list: 'diet' | 'shirt', value: string): string | undefined {
  const source = list === 'diet' ? options.dietaryOptions : options.tshirtOptions;
  return source.find((option) => option.value === value)?.label;
}
