import { describe, expect, test } from 'vitest';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  REGISTRATION_DEFAULTS,
  registrationSchema,
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
