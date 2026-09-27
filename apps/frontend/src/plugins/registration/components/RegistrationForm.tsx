import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, CardBody, Stepper } from '@helix-x/design-system';
import { useRegistrationConfig } from '../hooks/useRegistrationConfig';
import { STEP_FIELDS, stepOf, useSubmitRegistration } from '../hooks/useSubmitRegistration';
import {
  AboutYouStep,
  ContactStep,
  FamilyStep,
  LineageStep,
  MembershipStep,
  VettingStep,
} from './RegistrationSteps';

/** Index of the Contact step, where an already-registered email is caught early. */
const CONTACT_STEP = 1;

const STEPS = [
  { id: 'about', label: 'About you' },
  { id: 'contact', label: 'Contact' },
  { id: 'lineage', label: 'Lineage' },
  { id: 'family', label: 'Family' },
  { id: 'membership', label: 'Membership' },
  { id: 'vetting', label: 'References' },
];

export type RegistrationFormProps = { className?: string };

/**
 * The public membership application (REG-01).
 *
 * Multi-step because the field set is long, and validated a step at a time so
 * an applicant is corrected where the mistake was made rather than at the end.
 * There is deliberately no password field: IAM-01 requires credentials to be
 * created through an emailed link, once control of the address is proven.
 */
export const RegistrationForm = forwardRef<HTMLFormElement, RegistrationFormProps>(
  ({ className = '' }, ref) => {
    const [step, setStep] = useState(0);
    const { config, loading, error, maxDateOfBirth, options } = useRegistrationConfig();
    const [checkingEmail, setCheckingEmail] = useState(false);
    const {
      form,
      onSubmit,
      submitted,
      serverError,
      clearServerError,
      checkEmailAvailable,
      languages,
      setLanguages,
      volunteerInterests,
      setVolunteerInterests,
    } = useSubmitRegistration({
      // A refusal usually belongs to a field on an earlier step. Show that
      // step, then focus the field once its inputs have mounted.
      onFieldError: (field) => {
        setStep(stepOf(field));
        setTimeout(() => form.setFocus(field), 0);
      },
    });

    if (submitted) {
      return (
        <Card className={className}>
          <CardBody>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Check your inbox
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              We have sent a link to <strong>{submitted.email}</strong>. Open it to
              confirm your address and choose a password — your application reaches
              the Membership Secretary once that is done.
            </p>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              The link is valid for 24 hours. Nothing arrived?{' '}
              <Link to="/verify-email" className="text-blue-600 hover:underline dark:text-blue-400">
                Request another
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      );
    }

    if (loading) {
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
          Loading the application form…
        </p>
      );
    }

    if (error || !config) {
      return <Alert variant="error">{error ?? 'The form is unavailable.'}</Alert>;
    }

    const stepProps = {
      form,
      options,
      maxDateOfBirth,
      languages,
      setLanguages,
      volunteerInterests,
      setVolunteerInterests,
    };
    const isLast = step === STEPS.length - 1;

    /* Validate only this step's fields — a later step's emptiness is not yet an
       error, and marking it as one is how multi-step forms become unusable. */
    const next = async () => {
      clearServerError();
      const valid = await form.trigger(STEP_FIELDS[step]);
      if (!valid) return;
      if (step === CONTACT_STEP) {
        setCheckingEmail(true);
        const available = await checkEmailAvailable();
        setCheckingEmail(false);
        if (!available) return;
      }
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    };

    const back = () => {
      clearServerError();
      setStep((s) => Math.max(0, s - 1));
    };

    return (
      <form
        ref={ref}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (isLast) void onSubmit(event);
        }}
        className={['flex flex-col gap-6', className].join(' ')}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Apply for membership
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Rajputana Rawla of America
          </p>
        </div>

        <Stepper steps={STEPS} current={step} onStepClick={setStep} />

        {serverError && (
          <Alert variant="error">
            <span className="block">{serverError.message}</span>
            {serverError.remediation && (
              <span className="mt-2 flex flex-wrap gap-4">
                <Link to="/login" className="font-medium underline">
                  Sign in
                </Link>
                <Link to={serverError.remediation.href} className="font-medium underline">
                  Reset password
                </Link>
              </span>
            )}
          </Alert>
        )}

        <Card>
          <CardBody>
            {step === 0 && <AboutYouStep {...stepProps} />}
            {step === 1 && <ContactStep {...stepProps} />}
            {step === 2 && <LineageStep {...stepProps} />}
            {step === 3 && <FamilyStep {...stepProps} />}
            {step === 4 && <MembershipStep {...stepProps} />}
            {step === 5 && <VettingStep {...stepProps} />}
          </CardBody>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={back}
            disabled={step === 0 || form.formState.isSubmitting}
          >
            Back
          </Button>

          {isLast ? (
            <Button type="submit" loading={form.formState.isSubmitting}>
              Submit application
            </Button>
          ) : (
            <Button type="button" onClick={next} loading={checkingEmail}>
              Continue
            </Button>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Already a member?{' '}
          <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400">
            Sign in
          </Link>
        </p>
      </form>
    );
  },
);

RegistrationForm.displayName = 'RegistrationForm';
