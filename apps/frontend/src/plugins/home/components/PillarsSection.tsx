import { forwardRef } from 'react';
import { FeatureCard, SectionHeading } from '@helix-x/design-system';

export type PillarsSectionProps = { className?: string };

const CultureIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="h-7 w-7">
    <path d="M12 3 4 7v6c0 5 3.5 7.5 8 8.5 4.5-1 8-3.5 8-8.5V7l-8-4Z" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const CommunityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="h-7 w-7">
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="10" r="2.5" />
    <path d="M3 20a6 6 0 0 1 12 0M15.5 20a5 5 0 0 1 5.5-4.7" strokeLinecap="round" />
  </svg>
);
const CamaraderieIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="h-7 w-7">
    <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z" strokeLinejoin="round" />
  </svg>
);
const CharityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="h-7 w-7">
    <path d="M12 21c-1-4-4-6-4-9a4 4 0 0 1 8 0c0 3-3 5-4 9Z" strokeLinejoin="round" />
    <path d="M5 5.5 6.5 7M19 5.5 17.5 7" strokeLinecap="round" />
  </svg>
);

/** The organisation's own framing of what it is for — not a generic feature grid. */
const PILLARS = [
  {
    icon: <CultureIcon />,
    title: 'Culture',
    body: 'Come together to celebrate the centuries-old royal culture of Rajputana, and carry its regal magnificence into a new country.',
  },
  {
    icon: <CommunityIcon />,
    title: 'Community',
    body: 'Descended from thirty-six royal clans, still meeting on a single platform to build stronger ties between families.',
  },
  {
    icon: <CamaraderieIcon />,
    title: 'Camaraderie',
    body: 'Thousands of miles from our motherland, a brotherhood of friendship and affection that spans the chapters.',
  },
  {
    icon: <CharityIcon />,
    title: 'Charity',
    body: 'Seva at the heart of the samaj — most visibly in education funds for underprivileged Rajput girls.',
  },
];

const AMBER_TILE = 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';

export const PillarsSection = forwardRef<HTMLElement, PillarsSectionProps>(
  ({ className = '' }, ref) => (
    <section
      ref={ref}
      aria-labelledby="pillars-heading"
      className={['bg-white py-16 dark:bg-gray-950 sm:py-20', className].join(' ')}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="pillars-heading"
          title="What brings us together"
          description="The RRA was formed to create a platform in America for the Rajputs of historical Rajputana — to cherish a rich culture and pass it on to the GenNext."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <FeatureCard
              key={pillar.title}
              hoverable
              icon={pillar.icon}
              iconClassName={AMBER_TILE}
              title={pillar.title}
              description={pillar.body}
            />
          ))}
        </div>
      </div>
    </section>
  ),
);

PillarsSection.displayName = 'PillarsSection';
