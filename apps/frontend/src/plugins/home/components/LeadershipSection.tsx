import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { DescriptionList, SectionHeading } from '@helix-x/web/design-system';
import { useUser } from '@helix-x/web';

export type LeadershipSectionProps = { className?: string };

/**
 * The offices of the Executive Committee.
 *
 * Deliberately the **roles**, not a roster of named people with photographs.
 * The office-holders are real individuals; publishing names and portraits is
 * theirs to authorise, and inventing placeholders would put fabricated claims
 * about real people on the front page. The names belong in the directory, where
 * they are entered by the people themselves and sit behind the login wall — so
 * this section points there instead.
 */
const OFFICES = [
  { term: 'President', description: 'Governance, and the final word on escalations.' },
  { term: 'General Secretary', description: 'Minutes, announcements, events and community communications.' },
  { term: 'Finance Secretary', description: 'Dues, donations, funds and the annual accounts.' },
  { term: 'Membership Secretary', description: 'Vetting applications, and the member records themselves.' },
  { term: 'Chapter Leads', description: 'Each US region — its members, its events, its finances.' },
  { term: 'Patrons', description: 'Elders whose guidance and standing anchor the samaj.' },
];

export const LeadershipSection = forwardRef<HTMLElement, LeadershipSectionProps>(
  ({ className = '' }, ref) => {
    const user = useUser();

    return (
      <section
        ref={ref}
        aria-labelledby="leadership-heading"
        className={['bg-gray-50 py-16 dark:bg-gray-900 sm:py-20', className].join(' ')}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            id="leadership-heading"
            title="Who runs the samaj"
            description="The RRA is run by an elected Executive Committee, guided by its patrons and past presidents."
          />

          <DescriptionList
            items={OFFICES}
            variant="label"
            className="mt-12 gap-y-6"
            accentClassName="text-amber-800 dark:text-amber-300"
          />

          <p className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
            {user !== null ? (
              <>
                Current office-holders are listed in the{' '}
                <Link
                  to="/members"
                  className="text-amber-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-amber-300 dark:focus-visible:ring-amber-400"
                >
                  member directory
                </Link>
                .
              </>
            ) : (
              'Current office-holders are listed in the member directory, which opens once your membership is active.'
            )}
          </p>
        </div>
      </section>
    );
  },
);

LeadershipSection.displayName = 'LeadershipSection';
