import { describe, expect, test } from 'vitest';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  REGISTRATION_DEFAULTS,
  registrationSchema,
  stepOf,
} from '../src/plugins/registration/hooks/useSubmitRegistration';

const resolve = (values: Record<string, unknown>) =>
  zodResolver(registrationSchema)(values, undefined, {
    fields: {},
    shouldUseNativeValidation: false,
    criteriaMode: 'firstError',
  });

/**
 * Pins the `@hookform/resolvers` ↔ `zod` pairing, which fails silently in
 * typecheck and loudly at runtime.
 *
 * Resolvers v3 detects a validation failure with `Array.isArray(err.errors)`.
 * zod v4 renamed that property to `issues`, so the check missed and the
 * resolver rethrew — every `form.trigger()` on the /join form rejected with an
 * uncaught `ZodError` and no field ever showed a message. Nothing in the type
 * system objects to that combination, so assert the behaviour instead: the
 * resolver reports errors, it does not throw them.
 */
describe('the registration resolver reports errors rather than throwing', () => {
  test('an untouched form resolves to per-field messages', async () => {
    const { errors, values } = await resolve(REGISTRATION_DEFAULTS);

    expect(values).toEqual({});
    expect(errors.firstName?.message).toBe('First name is required.');
    expect(errors.gender?.message).toBe('Select a gender.');
    expect(errors.acceptPrivacyPolicy?.message).toBe('You must accept the Privacy Policy.');
  });

  test('a required field missing from the defaults loses its authored message', async () => {
    // The reason REGISTRATION_DEFAULTS exists: zod answers undefined with its
    // own `invalid_type` prose, and the authored message never runs. Anything
    // required and absent from the defaults reads like this in the UI.
    const { firstName: _omitted, ...withoutFirstName } = REGISTRATION_DEFAULTS;
    const { errors } = await resolve(withoutFirstName);

    expect(errors.firstName?.type).toBe('invalid_type');
    expect(errors.phone?.message).toBe('Use the international format, e.g. +14155550123.');
    expect(errors.stateCode?.message).toBe('Use the two-letter state code.');
  });

  test('a complete application passes', async () => {
    const { errors, values } = await resolve({
      ...REGISTRATION_DEFAULTS,
      firstName: 'Arjun',
      lastName: 'Rathore',
      gender: 'male',
      dateOfBirth: '1990-04-02',
      email: 'arjun@example.com',
      phone: '+14155550123',
      addressLine1: '1 Market St',
      city: 'San Francisco',
      stateCode: 'CA',
      postalCode: '94105',
      thikana: 'Bikaner',
      gotra: 'Kashyap',
      caste: 'Rajput',
      membershipTier: 'annual',
      offlineVerification: false,
      acceptCommunityGuidelines: true,
      acceptPrivacyPolicy: true,
    });

    expect(errors).toEqual({});
    expect(values).toMatchObject({ email: 'arjun@example.com' });
  });
});

/**
 * The form is submitted from its last step, so a server refusal about the
 * email or date of birth concerns a field that is not on screen. The form shows
 * it by moving to the step that holds the field — which is only right if this
 * mapping is.
 */
describe('stepOf finds the step that holds a field', () => {
  test('top-level fields map to their own step', () => {
    expect(stepOf('dateOfBirth')).toBe(0);
    expect(stepOf('email')).toBe(1);
    expect(stepOf('referenceName1')).toBe(5);
    expect(stepOf('acceptCommunityGuidelines')).toBe(5);
  });

  test('nested field names resolve by their top-level key', () => {
    expect(stepOf('children.0.dateOfBirth')).toBe(3);
    expect(stepOf('spouse.email')).toBe(3);
  });
});
