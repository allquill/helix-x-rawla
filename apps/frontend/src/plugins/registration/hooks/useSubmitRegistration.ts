import { useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PortalRegistrationService,
  RegistrationChildDto,
  SubmitRegistrationDto,
} from '@helix-x-rawla/client-sdk';

const E164 = /^\+[1-9]\d{6,14}$/;

/**
 * Optional text: `''` is what an untouched input holds, so it has to pass. The
 * payload turns it back into `undefined` — the API's `@IsEmail` and E.164
 * checks reject an empty string.
 */
const optionalText = z.string().optional();

const spouseSchema = z.object({
  firstName: z.string().min(1, "Spouse's first name is required."),
  middleName: optionalText,
  lastName: z.string().min(1, "Spouse's last name is required."),
  caste: optionalText,
  gotra: optionalText,
  thikana: optionalText,
  nanihal: optionalText,
  email: z.string().email('Enter a valid email address.').optional().or(z.literal('')),
  phone: z.string().regex(E164, 'Use the international format.').optional().or(z.literal('')),
  dateOfBirth: optionalText,
  industry: optionalText,
  education: optionalText,
});

const childSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  middleName: optionalText,
  lastName: z.string().min(1, 'Last name is required.'),
  gender: z.enum(RegistrationChildDto.gender).optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required.'),
  educationLevel: optionalText,
  achievements: optionalText,
});

/** The join form's cap (`Child!D9`). More can be added from My Profile. */
export const MAX_CHILDREN_AT_JOIN = 3;

export const registrationSchema = z.object({
  // Step 1 — about you
  firstName: z.string().min(1, 'First name is required.'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required.'),
  honorific: z.string().optional(),
  // Derived from the generated enum rather than repeating its members, so the
  // form cannot offer a value the API would reject — and adding one server-side
  // is a regeneration, not a second edit here.
  gender: z.enum(SubmitRegistrationDto.gender, { message: 'Select a gender.' }),
  dateOfBirth: z.string().min(1, 'Date of birth is required.'),

  // Step 2 — contact
  email: z.string().min(1, 'Email address is required.').email('Enter a valid email address.'),
  phone: z.string().regex(E164, 'Use the international format, e.g. +14155550123.'),
  whatsappPhone: z.string().regex(E164, 'Use the international format.').optional().or(z.literal('')),
  addressLine1: z.string().min(1, 'Street address is required.'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required.'),
  stateCode: z.string().length(2, 'Use the two-letter state code.'),
  postalCode: z.string().min(3, 'ZIP code is required.'),

  // Step 3 — lineage
  thikana: z.string().min(1, 'Ancestral village is required.'),
  gotra: z.string().min(1, 'Gotra is required.'),
  caste: z.string().min(1, 'Caste is required.'),
  sasural: z.string().optional(),
  nanihal: z.string().optional(),
  familyHistory: z.string().optional(),

  // Step 4 — family. Entirely optional: all of it can be added after sign-in.
  weddingDate: optionalText,
  // Present only while "add my spouse" is ticked — unticking unregisters it,
  // so an abandoned half-filled spouse never blocks the step.
  spouse: spouseSchema.optional(),
  children: z.array(childSchema).max(MAX_CHILDREN_AT_JOIN, `Add at most ${MAX_CHILDREN_AT_JOIN} children here.`),

  // Step 5 — membership
  membershipTier: z.string().min(1, 'Choose a membership tier.'),
  industry: z.string().optional(),
  jobTitle: z.string().optional(),

  // Step 6 — vetting and consent
  offlineVerification: z.boolean(),
  referenceName1: z.string().optional(),
  referencePhone1: z.string().optional(),
  referenceName2: z.string().optional(),
  referencePhone2: z.string().optional(),
  acceptCommunityGuidelines: z.literal(true, {
    message: 'You must accept the Community Guidelines.',
  }),
  acceptPrivacyPolicy: z.literal(true, {
    message: 'You must accept the Privacy Policy.',
  }),
});

export type RegistrationFields = z.infer<typeof registrationSchema>;

/** Fields validated before each step may be left. */
export const STEP_FIELDS: Array<Array<keyof RegistrationFields>> = [
  ['firstName', 'middleName', 'lastName', 'honorific', 'gender', 'dateOfBirth'],
  ['email', 'phone', 'whatsappPhone', 'addressLine1', 'addressLine2', 'city', 'stateCode', 'postalCode'],
  ['thikana', 'gotra', 'caste', 'sasural', 'nanihal', 'familyHistory'],
  ['weddingDate', 'spouse', 'children'],
  ['membershipTier', 'industry', 'jobTitle'],
  ['offlineVerification', 'referenceName1', 'referencePhone1', 'referenceName2', 'referencePhone2', 'acceptCommunityGuidelines', 'acceptPrivacyPolicy'],
];

/**
 * Every required text field defaults to `''` rather than undefined. Left
 * undefined, zod reports `invalid_type` ("expected string, received
 * undefined") and the authored message below it never runs — so the first
 * Continue on an untouched step would show library prose instead of "First
 * name is required.". The optional fields stay undefined on purpose, so an
 * untouched one is omitted from the payload rather than sent as `''`.
 */
export const REGISTRATION_DEFAULTS = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  email: '',
  phone: '',
  addressLine1: '',
  city: '',
  stateCode: '',
  postalCode: '',
  thikana: '',
  gotra: '',
  caste: '',
  membershipTier: '',
  children: [],
  offlineVerification: false,
  acceptCommunityGuidelines: false as unknown as true,
  acceptPrivacyPolicy: false as unknown as true,
} satisfies Partial<RegistrationFields>;

/**
 * Which step holds a field. Nested names (`children.0.dateOfBirth`) resolve by
 * their top-level key, which is what `STEP_FIELDS` lists.
 */
export function stepOf(field: string): number {
  const key = field.split('.')[0] as keyof RegistrationFields;
  const index = STEP_FIELDS.findIndex((fields) => fields.includes(key));
  return index === -1 ? 0 : index;
}

/** A refusal shown at the top of the form, whichever step is open. */
export type RegistrationServerError = {
  message: string;
  /** Where the applicant can fix it, as the server said (`/forgot-password`). */
  remediation?: { action?: string; href: string };
};

type ErrorBody = {
  code?: string;
  message?: string | string[];
  remediation?: { action?: string; href: string };
};

/**
 * Server refusals that belong to one field. The form is submitted from the last
 * step, so the field is usually not on screen: setting the error there alone
 * shows nothing. Each of these is also raised at the top of the form, and the
 * form moves to the step that holds the field.
 */
const FIELD_FOR_CODE: Record<string, keyof RegistrationFields> = {
  EMAIL_ALREADY_REGISTERED: 'email',
  UNDER_MINIMUM_AGE: 'dateOfBirth',
  INVALID_DATE_OF_BIRTH: 'dateOfBirth',
  REFERENCES_REQUIRED: 'referenceName1',
  CONSENT_REQUIRED: 'acceptCommunityGuidelines',
};

/** First erroring field, in the order the steps present them. */
function firstErrorField(errors: FieldErrors<RegistrationFields>): keyof RegistrationFields | null {
  for (const fields of STEP_FIELDS) {
    const hit = fields.find((field) => errors[field] !== undefined);
    if (hit) return hit;
  }
  return null;
}

/** `''` → `undefined`, so optional nested fields are omitted rather than sent empty. */
function withoutBlanks<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).map(([key, v]) => [key, v === '' ? undefined : v]),
  ) as T;
}

export type UseSubmitRegistrationOptions = {
  /** Called with the field a refusal belongs to, so the form can show its step. */
  onFieldError?: (field: keyof RegistrationFields) => void;
};

export function useSubmitRegistration({ onFieldError }: UseSubmitRegistrationOptions = {}) {
  const [languages, setLanguages] = useState<string[]>([]);
  const [volunteerInterests, setVolunteerInterests] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<{ email: string } | null>(null);
  const [acknowledgeDuplicatePhone, setAcknowledgeDuplicatePhone] = useState(false);
  const [serverError, setServerError] = useState<RegistrationServerError | null>(null);

  const form = useForm<RegistrationFields>({
    resolver: zodResolver(registrationSchema),
    mode: 'onTouched',
    defaultValues: REGISTRATION_DEFAULTS,
  });

  const raise = (field: keyof RegistrationFields | null, error: RegistrationServerError) => {
    if (field) form.setError(field, { type: 'server', message: error.message });
    setServerError(error);
    if (field) onFieldError?.(field);
  };

  /**
   * Catch an already-registered email when the applicant leaves the Contact
   * step, rather than after they have filled in four more. The submit-time
   * check stays the authority: if this probe fails, let them continue.
   */
  const checkEmailAvailable = async (): Promise<boolean> => {
    const { email, phone } = form.getValues();
    try {
      const probe = await PortalRegistrationService.checkRegistrationDuplicate({
        requestBody: { email, phone },
      });
      if (probe.emailTaken) {
        raise('email', {
          message: 'This email address is already registered. Sign in, or reset your password if you have forgotten it.',
          remediation: { action: 'recover', href: '/forgot-password' },
        });
        return false;
      }
      // A shared phone is only a warning (households share numbers), and the
      // submit answers it with its own prompt — nothing to do here.
      return true;
    } catch {
      return true;
    }
  };

  const onValid = async (data: RegistrationFields) => {
    setServerError(null);
    try {
      await PortalRegistrationService.submitMemberRegistration({
        requestBody: {
          ...data,
          whatsappPhone: data.whatsappPhone || undefined,
          weddingDate: data.weddingDate || undefined,
          spouse: data.spouse ? withoutBlanks(data.spouse) : undefined,
          children: data.children.length
            ? data.children.map((child, index) => ({
                ...withoutBlanks(child),
                sequence: index + 1,
              }))
            : undefined,
          languages,
          volunteerInterests,
          acknowledgeDuplicatePhone,
          references:
            data.offlineVerification || !data.referenceName1
              ? undefined
              : [
                  { name: data.referenceName1!, phone: data.referencePhone1! },
                  ...(data.referenceName2 && data.referencePhone2
                    ? [{ name: data.referenceName2, phone: data.referencePhone2 }]
                    : []),
                ],
        },
      });
      setSubmitted({ email: data.email });
    } catch (error) {
      // The server owns these rules — the age gate and duplicate checks are
      // re-run there even when the form has already passed them, so surface
      // whatever it says rather than a generic failure.
      const body = (error as { body?: ErrorBody }).body;
      const message = Array.isArray(body?.message)
        ? body.message.join('; ')
        : body?.message ?? 'Something went wrong. Please try again.';
      const field = body?.code ? FIELD_FOR_CODE[body.code] ?? null : null;

      if (body?.code === 'POSSIBLE_DUPLICATE') {
        // A warning, answered by submitting again — so stay on this step
        // rather than moving the applicant away from the submit button.
        setAcknowledgeDuplicatePhone(true);
        setServerError({ message: `${message} Submit again to continue.` });
        return;
      }
      raise(field, { message, remediation: body?.remediation });
    }
  };

  /** Client-side failures on the final submit — a step skipped via the stepper. */
  const onInvalid = (errors: FieldErrors<RegistrationFields>) => {
    raise(null, { message: 'Please check the highlighted details.' });
    const field = firstErrorField(errors);
    if (field) onFieldError?.(field);
  };

  const onSubmit = form.handleSubmit(onValid, onInvalid);

  return {
    form,
    onSubmit,
    submitted,
    serverError,
    clearServerError: () => setServerError(null),
    checkEmailAvailable,
    languages,
    setLanguages,
    volunteerInterests,
    setVolunteerInterests,
  };
}
