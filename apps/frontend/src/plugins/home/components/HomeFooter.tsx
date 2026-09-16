import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { MaskedAsset, SiteFooter } from '@helix-x/design-system';

export type HomeFooterProps = { className?: string };

const LINKS = [
  { to: '/join', label: 'Apply' },
  { to: '/join/status', label: 'My membership' },
  { to: '/login', label: 'Sign in' },
];

/**
 * Wraps the design system's `SiteFooter` with this community's identity.
 *
 * The links are passed as a slot rather than as hrefs, which is what lets them
 * be router `<Link>`s — the design system deliberately does not decide between
 * an anchor and a router link.
 */
export const HomeFooter = forwardRef<HTMLElement, HomeFooterProps>(
  ({ className = '' }, ref) => (
    <SiteFooter
      ref={ref}
      className={className}
      mark={
        <MaskedAsset
          src="/extension/rra-crest.svg"
          className="h-10 w-9 shrink-0 text-amber-800 dark:text-amber-300"
        />
      }
      name="Rajputana Rawla of America"
      tagline="Stay connected to your roots."
      links={LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="text-sm text-gray-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-gray-400 dark:focus-visible:ring-amber-400"
        >
          {link.label}
        </Link>
      ))}
      legal={`© ${new Date().getFullYear()} Rajputana Rawla of America. Member information is visible only to signed-in members.`}
    />
  ),
);

HomeFooter.displayName = 'HomeFooter';
