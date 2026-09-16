import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Button, SectionHeading, StepList } from '@helix-x/design-system';

export type JoinPathSectionProps = { className?: string };

/**
 * The three activation gates, told as a story rather than as a status table.
 *
 * These are the gates the backend genuinely enforces — email verification, the
 * Membership Secretary's approval, settled dues — so an applicant is never
 * surprised later by a step nobody mentioned. Saying the vetting step out loud
 * is deliberate: this is a vouched community, and that is a feature.
 *
 * Uses `StepList`, not `Stepper`: this describes the process to somebody who
 * has not started it, rather than tracking where they are inside a form.
 */
const STEPS = [
  {
    title: 'Tell us about your family',
    description:
      'Your name and lineage — gotra, caste and ancestral thikana — along with your household, spouse and children.',
  },
  {
    title: 'Confirm your email',
    description:
      'We send a single link. Opening it confirms the address and lets you choose a password, in one step.',
  },
  {
    title: 'Vetting and welcome',
    description:
      'The Membership Secretary reviews your application with two vouching members. Once approved and your dues are settled, the directory opens to you.',
  },
];

export const JoinPathSection = forwardRef<HTMLElement, JoinPathSectionProps>(
  ({ className = '' }, ref) => (
    <section
      ref={ref}
      aria-labelledby="join-heading"
      className={['bg-gray-50 py-16 dark:bg-gray-900 sm:py-20', className].join(' ')}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="join-heading"
          title="Becoming a member"
          description="Membership is by application and vouched for by two existing members — which is what keeps the directory something you can trust."
        />

        <StepList
          items={STEPS}
          className="mt-12"
          markerClassName="border-amber-700 text-amber-800 dark:border-amber-400 dark:text-amber-300"
        />

        <div className="mt-12 text-center">
          <Link to="/join">
            <Button size="lg">Start your application</Button>
          </Link>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Already applied?{' '}
            <Link
              to="/join/status"
              className="text-amber-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-amber-300 dark:focus-visible:ring-amber-400"
            >
              Check your status
            </Link>
          </p>
        </div>
      </div>
    </section>
  ),
);

JoinPathSection.displayName = 'JoinPathSection';
