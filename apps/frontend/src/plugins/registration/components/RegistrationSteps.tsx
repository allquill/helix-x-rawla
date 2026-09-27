import { forwardRef } from 'react';
import {
  Button,
  Checkbox,
  DateField,
  FormField,
  MultiSelect,
  RadioGroup,
  Select,
  Textarea,
} from '@helix-x/design-system';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { MAX_CHILDREN_AT_JOIN, type RegistrationFields } from '../hooks/useSubmitRegistration';

type Option = { value: string; label: string };

export type RegistrationStepProps = {
  form: UseFormReturn<RegistrationFields>;
  options: (key: string) => Option[];
  maxDateOfBirth?: string;
  languages: string[];
  setLanguages: (value: string[]) => void;
  volunteerInterests: string[];
  setVolunteerInterests: (value: string[]) => void;
  className?: string;
};

const Fieldset = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col gap-4">{children}</div>
);

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
);

/** Step 1 — legal name, honorific, gender and date of birth. */
export const AboutYouStep = forwardRef<HTMLDivElement, RegistrationStepProps>(
  ({ form, options, maxDateOfBirth, className = '' }, ref) => {
    const { register, formState: { errors }, setValue, watch } = form;
    return (
      <div ref={ref} className={className}>
        <Fieldset>
          <Row>
            <FormField label="First name" errorMessage={errors.firstName?.message} {...register('firstName')} />
            <FormField label="Middle name" helperText="Optional" errorMessage={errors.middleName?.message} {...register('middleName')} />
          </Row>
          <Row>
            <FormField label="Last name" errorMessage={errors.lastName?.message} {...register('lastName')} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="honorific" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Honorific
              </label>
              <Select
                id="honorific"
                options={options('honorific')}
                placeholder="Optional"
                defaultValue=""
                {...register('honorific')}
              />
            </div>
          </Row>

          <div className="flex flex-col gap-1.5">
            <span id="gender-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Gender
            </span>
            <RadioGroup
              name="gender"
              aria-labelledby="gender-label"
              inline
              error={Boolean(errors.gender)}
              value={watch('gender')}
              onValueChange={(value) =>
                setValue('gender', value as RegistrationFields['gender'], { shouldValidate: true })
              }
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ]}
            />
            {errors.gender && (
              <p role="alert" className="text-xs text-red-500 dark:text-red-400">
                {errors.gender.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="dob" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Date of birth
            </label>
            <DateField
              id="dob"
              max={maxDateOfBirth}
              error={Boolean(errors.dateOfBirth)}
              aria-describedby="dob-help"
              {...register('dateOfBirth')}
            />
            <p
              id="dob-help"
              role={errors.dateOfBirth ? 'alert' : undefined}
              className={[
                'text-xs',
                errors.dateOfBirth ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
              ].join(' ')}
            >
              {errors.dateOfBirth?.message ?? 'You must meet the minimum age to hold an account.'}
            </p>
          </div>
        </Fieldset>
      </div>
    );
  },
);
AboutYouStep.displayName = 'AboutYouStep';

/** Step 2 — email, phone and the address that decides the chapter. */
export const ContactStep = forwardRef<HTMLDivElement, RegistrationStepProps>(
  ({ form, className = '' }, ref) => {
    const { register, formState: { errors } } = form;
    return (
      <div ref={ref} className={className}>
        <Fieldset>
          <FormField
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            helperText="This is your sign-in name. We will email a link to confirm it."
            errorMessage={errors.email?.message}
            {...register('email')}
          />
          <Row>
            <FormField label="Phone" placeholder="+14155550123" errorMessage={errors.phone?.message} {...register('phone')} />
            <FormField label="WhatsApp" placeholder="+14155550123" helperText="Optional" errorMessage={errors.whatsappPhone?.message} {...register('whatsappPhone')} />
          </Row>
          <FormField label="Street address" errorMessage={errors.addressLine1?.message} {...register('addressLine1')} />
          <FormField label="Apartment, suite" helperText="Optional" errorMessage={errors.addressLine2?.message} {...register('addressLine2')} />
          <Row>
            <FormField label="City" errorMessage={errors.city?.message} {...register('city')} />
            <FormField
              label="State"
              placeholder="TX"
              maxLength={2}
              helperText="Two-letter code — this assigns your chapter."
              errorMessage={errors.stateCode?.message}
              {...register('stateCode')}
            />
          </Row>
          <FormField label="ZIP code" errorMessage={errors.postalCode?.message} {...register('postalCode')} />
        </Fieldset>
      </div>
    );
  },
);
ContactStep.displayName = 'ContactStep';

/** Step 3 — the cultural record the community exists to keep. */
export const LineageStep = forwardRef<HTMLDivElement, RegistrationStepProps>(
  ({ form, options, languages, setLanguages, className = '' }, ref) => {
    const { register, formState: { errors } } = form;
    const gotras = options('gotra');
    const castes = options('caste');
    const thikanas = options('thikana');

    return (
      <div ref={ref} className={className}>
        <Fieldset>
          {/* Gotra and Thikana ship un-curated, so fall back to free text until
              an administrator populates the list. */}
          {thikanas.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="thikana" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ancestral village / Thikana
              </label>
              <Select id="thikana" options={thikanas} placeholder="Select…" defaultValue="" error={Boolean(errors.thikana)} {...register('thikana')} />
            </div>
          ) : (
            <FormField label="Ancestral village / Thikana" errorMessage={errors.thikana?.message} {...register('thikana')} />
          )}

          {gotras.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gotra" className="text-sm font-medium text-gray-700 dark:text-gray-300">Gotra</label>
              <Select id="gotra" options={gotras} placeholder="Select…" defaultValue="" error={Boolean(errors.gotra)} {...register('gotra')} />
            </div>
          ) : (
            <FormField label="Gotra" errorMessage={errors.gotra?.message} {...register('gotra')} />
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="caste" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Rajput caste / sub-clan
            </label>
            <Select id="caste" options={castes} placeholder="Select…" defaultValue="" error={Boolean(errors.caste)} {...register('caste')} />
            {errors.caste && <p role="alert" className="text-xs text-red-500 dark:text-red-400">{errors.caste.message}</p>}
          </div>

          <Row>
            <FormField label="Sasural" helperText="Spouse's ancestral thikana, if married" {...register('sasural')} />
            <FormField label="Nanihal" helperText="Mother's ancestral place" {...register('nanihal')} />
          </Row>

          <div className="flex flex-col gap-1.5">
            <span id="languages-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">Languages</span>
            <MultiSelect
              aria-labelledby="languages-label"
              options={options('language')}
              value={languages}
              onChange={setLanguages}
              emptyState="No languages configured yet."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="familyHistory" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Family history
            </label>
            <Textarea id="familyHistory" rows={4} placeholder="Anything you would like recorded about your lineage." {...register('familyHistory')} />
          </div>
        </Fieldset>
      </div>
    );
  },
);
LineageStep.displayName = 'LineageStep';

/**
 * Step 4 — spouse and children (MP-17 / MP-18).
 *
 * Every field here is optional. An applicant who would rather not list their
 * family now can add or change it from My Profile after signing in, so this
 * step never stands between them and submitting.
 */
export const FamilyStep = forwardRef<HTMLDivElement, RegistrationStepProps>(
  ({ form, options, className = '' }, ref) => {
    const { register, formState: { errors }, setValue, unregister, watch, control } = form;
    const { fields, append, remove } = useFieldArray({ control, name: 'children' });
    const hasSpouse = watch('spouse') !== undefined;
    const gotras = options('gotra');
    const thikanas = options('thikana');

    const toggleSpouse = (checked: boolean) => {
      if (checked) setValue('spouse', { firstName: '', lastName: '' });
      else unregister('spouse');
    };

    return (
      <div ref={ref} className={className}>
        <Fieldset>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Optional. You can skip this step and add your spouse and children
            from <strong>My profile</strong> once you have signed in.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="weddingDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Wedding date
            </label>
            <DateField id="weddingDate" {...register('weddingDate')} />
          </div>

          <Checkbox
            label="Add my spouse"
            checked={hasSpouse}
            onChange={(event) => toggleSpouse(event.target.checked)}
          />

          {hasSpouse && (
            <div className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <Row>
                <FormField label="First name" errorMessage={errors.spouse?.firstName?.message} {...register('spouse.firstName')} />
                <FormField label="Middle name" helperText="Optional" {...register('spouse.middleName')} />
              </Row>
              <Row>
                <FormField label="Last name" errorMessage={errors.spouse?.lastName?.message} {...register('spouse.lastName')} />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="spouseCaste" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Caste / sub-clan
                  </label>
                  <Select id="spouseCaste" options={options('caste')} placeholder="Optional" defaultValue="" {...register('spouse.caste')} />
                </div>
              </Row>
              <Row>
                {gotras.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="spouseGotra" className="text-sm font-medium text-gray-700 dark:text-gray-300">Gotra</label>
                    <Select id="spouseGotra" options={gotras} placeholder="Optional" defaultValue="" {...register('spouse.gotra')} />
                  </div>
                ) : (
                  <FormField label="Gotra" helperText="Optional" {...register('spouse.gotra')} />
                )}
                {thikanas.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="spouseThikana" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Ancestral village / Thikana
                    </label>
                    <Select id="spouseThikana" options={thikanas} placeholder="Optional" defaultValue="" {...register('spouse.thikana')} />
                  </div>
                ) : (
                  <FormField label="Ancestral village / Thikana" helperText="Optional" {...register('spouse.thikana')} />
                )}
              </Row>
              <Row>
                <FormField label="Nanihal" helperText="Optional" {...register('spouse.nanihal')} />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="spouseDob" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date of birth
                  </label>
                  <DateField id="spouseDob" {...register('spouse.dateOfBirth')} />
                </div>
              </Row>
              <Row>
                <FormField label="Email" type="email" helperText="Optional" errorMessage={errors.spouse?.email?.message} {...register('spouse.email')} />
                <FormField label="Phone" placeholder="+14155550123" helperText="Optional" errorMessage={errors.spouse?.phone?.message} {...register('spouse.phone')} />
              </Row>
              <Row>
                <FormField label="Industry" helperText="Optional" {...register('spouse.industry')} />
                <FormField label="Education" helperText="Optional" {...register('spouse.education')} />
              </Row>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Children</span>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Child {index + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                    Remove
                  </Button>
                </div>
                <Row>
                  <FormField label="First name" errorMessage={errors.children?.[index]?.firstName?.message} {...register(`children.${index}.firstName`)} />
                  <FormField label="Last name" errorMessage={errors.children?.[index]?.lastName?.message} {...register(`children.${index}.lastName`)} />
                </Row>
                <Row>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`childDob${index}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Date of birth
                    </label>
                    <DateField
                      id={`childDob${index}`}
                      error={Boolean(errors.children?.[index]?.dateOfBirth)}
                      {...register(`children.${index}.dateOfBirth`)}
                    />
                    {errors.children?.[index]?.dateOfBirth && (
                      <p role="alert" className="text-xs text-red-500 dark:text-red-400">
                        {errors.children[index]?.dateOfBirth?.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span id={`childGender${index}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Gender
                    </span>
                    <RadioGroup
                      name={`children.${index}.gender`}
                      aria-labelledby={`childGender${index}`}
                      inline
                      value={watch(`children.${index}.gender`)}
                      onValueChange={(value) =>
                        setValue(`children.${index}.gender`, value as RegistrationFields['children'][number]['gender'])
                      }
                      options={[
                        { value: 'male', label: 'Male' },
                        { value: 'female', label: 'Female' },
                      ]}
                    />
                  </div>
                </Row>
                <Row>
                  <FormField label="Education level / grade" helperText="Optional" {...register(`children.${index}.educationLevel`)} />
                  <FormField label="Achievements" helperText="Optional" {...register(`children.${index}.achievements`)} />
                </Row>
              </div>
            ))}
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={fields.length >= MAX_CHILDREN_AT_JOIN}
                onClick={() => append({ firstName: '', lastName: watch('lastName') ?? '', dateOfBirth: '' })}
              >
                Add a child
              </Button>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Up to {MAX_CHILDREN_AT_JOIN} here. You can add more from My profile.
              </p>
            </div>
          </div>
        </Fieldset>
      </div>
    );
  },
);
FamilyStep.displayName = 'FamilyStep';

/** Step 5 — tier and professional details. */
export const MembershipStep = forwardRef<HTMLDivElement, RegistrationStepProps>(
  ({ form, options, volunteerInterests, setVolunteerInterests, className = '' }, ref) => {
    const { register, formState: { errors }, setValue, watch } = form;
    const tiers = options('membership_tier');

    return (
      <div ref={ref} className={className}>
        <Fieldset>
          <div className="flex flex-col gap-1.5">
            <span id="tier-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Membership tier
            </span>
            <RadioGroup
              name="membershipTier"
              aria-labelledby="tier-label"
              error={Boolean(errors.membershipTier)}
              value={watch('membershipTier')}
              onValueChange={(value) => setValue('membershipTier', value, { shouldValidate: true })}
              options={tiers.map((tier) => ({ value: tier.value, label: tier.label }))}
            />
            {errors.membershipTier && (
              <p role="alert" className="text-xs text-red-500 dark:text-red-400">{errors.membershipTier.message}</p>
            )}
          </div>

          <Row>
            <FormField label="Industry" helperText="Optional" {...register('industry')} />
            <FormField label="Job title" helperText="Optional" {...register('jobTitle')} />
          </Row>

          <div className="flex flex-col gap-1.5">
            <span id="volunteer-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Volunteer interests
            </span>
            <MultiSelect
              aria-labelledby="volunteer-label"
              options={options('volunteer_interest')}
              value={volunteerInterests}
              onChange={setVolunteerInterests}
              emptyState="No volunteer roles configured yet."
            />
          </div>
        </Fieldset>
      </div>
    );
  },
);
MembershipStep.displayName = 'MembershipStep';

/** Step 6 — the two vouching members, and the consent that is recorded. */
export const VettingStep = forwardRef<HTMLDivElement, RegistrationStepProps>(
  ({ form, className = '' }, ref) => {
    const { register, formState: { errors }, watch } = form;
    const offline = watch('offlineVerification');

    return (
      <div ref={ref} className={className}>
        <Fieldset>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Membership is vouched for by two existing Rawla members. If you would
            rather give their details to the Membership Secretary directly, tick
            the box below.
          </p>

          <Checkbox label="References will be supplied offline" {...register('offlineVerification')} />

          {!offline && (
            <>
              <Row>
                <FormField label="Reference 1 — name" errorMessage={errors.referenceName1?.message} {...register('referenceName1')} />
                <FormField label="Reference 1 — phone" placeholder="+14155550123" errorMessage={errors.referencePhone1?.message} {...register('referencePhone1')} />
              </Row>
              <Row>
                <FormField label="Reference 2 — name" errorMessage={errors.referenceName2?.message} {...register('referenceName2')} />
                <FormField label="Reference 2 — phone" placeholder="+14155550123" errorMessage={errors.referencePhone2?.message} {...register('referencePhone2')} />
              </Row>
            </>
          )}

          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <Checkbox label="I accept the Community Guidelines" {...register('acceptCommunityGuidelines')} />
            {errors.acceptCommunityGuidelines && (
              <p role="alert" className="text-xs text-red-500 dark:text-red-400">{errors.acceptCommunityGuidelines.message}</p>
            )}
            <Checkbox label="I accept the Privacy Policy" {...register('acceptPrivacyPolicy')} />
            {errors.acceptPrivacyPolicy && (
              <p role="alert" className="text-xs text-red-500 dark:text-red-400">{errors.acceptPrivacyPolicy.message}</p>
            )}
          </div>
        </Fieldset>
      </div>
    );
  },
);
VettingStep.displayName = 'VettingStep';
