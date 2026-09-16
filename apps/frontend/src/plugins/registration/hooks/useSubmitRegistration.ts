import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PortalRegistrationService, SubmitRegistrationDto } from '@helix-x/client-sdk';

const E164 = /^\+[1-9]\d{6,14}$/;

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

  // Step 4 — membership
  membershipTier: z.string().min(1, 'Choose a membership tier.'),
  industry: z.string().optional(),
  jobTitle: z.string().optional(),

  // Step 5 — vetting and consent
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
  ['membershipTier', 'industry', 'jobTitle'],
  ['offlineVerification', 'referenceName1', 'referencePhone1', 'referenceName2', 'referencePhone2', 'acceptCommunityGuidelines', 'acceptPrivacyPolicy'],
];

export function useSubmitRegistration() {
  const [languages, setLanguages] = useState<string[]>([]);
  const [volunteerInterests, setVolunteerInterests] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<{ email: string } | null>(null);
  const [acknowledgeDuplicatePhone, setAcknowledgeDuplicatePhone] = useState(false);

  const form = useForm<RegistrationFields>({
    resolver: zodResolver(registrationSchema),
    mode: 'onTouched',
    defaultValues: {
      offlineVerification: false,
      acceptCommunityGuidelines: false as unknown as true,
      acceptPrivacyPolicy: false as unknown as true,
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await PortalRegistrationService.submitMemberRegistration({
        requestBody: {
          ...data,
          whatsappPhone: data.whatsappPhone || undefined,
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
      const body = (error as { body?: { code?: string; message?: string } }).body;
      // The server owns these rules — the age gate and duplicate checks are
      // re-run there even when the form has already passed them, so surface
      // whatever it says rather than a generic failure.
      if (body?.code === 'POSSIBLE_DUPLICATE') {
        setAcknowledgeDuplicatePhone(true);
        form.setError('root', {
          message: `${body.message} Submit again to continue.`,
        });
        return;
      }
      if (body?.code === 'EMAIL_ALREADY_REGISTERED') {
        form.setError('email', { message: body.message });
        return;
      }
      if (body?.code === 'UNDER_MINIMUM_AGE') {
        form.setError('dateOfBirth', { message: body.message });
        return;
      }
      form.setError('root', {
        message: body?.message ?? 'Something went wrong. Please try again.',
      });
    }
  });

  return {
    form,
    onSubmit,
    submitted,
    languages,
    setLanguages,
    volunteerInterests,
    setVolunteerInterests,
  };
}
