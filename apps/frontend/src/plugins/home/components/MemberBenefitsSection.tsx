import { forwardRef } from 'react';
import { DescriptionList, MaskedAsset, SectionHeading } from '@helix-x/design-system';

export type MemberBenefitsSectionProps = { className?: string };

/**
 * What the portal actually gives a member.
 *
 * Every entry maps to something that exists — the directory, household records,
 * chapters, the privacy controls. Nothing is promised that the portal cannot
 * yet do, which is why events and giving history are absent for now.
 */
const BENEFITS = [
  {
    term: 'A directory of the samaj',
    description:
      'Find families by chapter, gotra, caste, ancestral village, profession or the skills they offer. Everything sits behind the login wall — nothing is public.',
  },
  {
    term: 'Your household, on record',
    description:
      'One household record holds your spouse and children, your address of record, and the anniversaries and birthdays the community celebrates with you.',
  },
  {
    term: 'Your chapter',
    description:
      'Members are placed into a regional chapter from their home state, so the people nearest to you are the easiest to find.',
  },
  {
    term: 'Privacy you control',
    description:
      'Hide individual fields, or step out of the directory entirely, whenever you like. No member ever sees another member’s financial information.',
  },
  {
    term: 'Mentorship and introductions',
    description:
      'Professional profiles and skills make it possible to ask the community for help — and to offer it to the GenNext.',
  },
  {
    term: 'Seva and charity',
    description:
      'The samaj’s charitable work, most visibly education funds for underprivileged Rajput girls, is coordinated through the community.',
  },
];

export const MemberBenefitsSection = forwardRef<HTMLElement, MemberBenefitsSectionProps>(
  ({ className = '' }, ref) => (
    <section
      ref={ref}
      aria-labelledby="benefits-heading"
      className={['bg-white py-16 dark:bg-gray-950 sm:py-20', className].join(' ')}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="benefits-heading"
          mark={
            <MaskedAsset
              src="/extension/surya-motif.svg"
              className="h-10 w-10 text-amber-700 dark:text-amber-400"
            />
          }
          title="What membership opens up"
        />

        <DescriptionList
          items={BENEFITS}
          variant="rule"
          className="mt-12"
          accentClassName="border-amber-200 dark:border-amber-800"
        />
      </div>
    </section>
  ),
);

MemberBenefitsSection.displayName = 'MemberBenefitsSection';
