import { forwardRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, MaskedAsset, PageHero } from '@helix-x/web/design-system';
import { useUser } from '@helix-x/web';
import { PortalMembersService } from '@helix-x-rawla/client-sdk';

/**
 * Whether the signed-in account is a member still working through activation.
 *
 * Sign-in is allowed from the moment the address is verified, so a signed-in
 * visitor is not necessarily an active member — and for one who is not, the
 * directory would only answer 403. Staff hold no member record (404) and read
 * as "not pending", as does any failure: the hero should never block on this.
 */
function useMembershipPending(signedIn: boolean): boolean {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!signedIn) {
      setPending(false);
      return;
    }
    let cancelled = false;
    PortalMembersService.getMyMembershipStatus()
      .then((status) => !cancelled && setPending(!status.isActive))
      .catch(() => !cancelled && setPending(false));
    return () => {
      cancelled = true;
    };
  }, [signedIn]);
  return pending;
}

export type HeroSectionProps = { className?: string };

/**
 * The first thing a visitor sees.
 *
 * Leads with **Khamaghanisa** — the Rajput greeting the community actually uses
 * — rather than a generic welcome, because the point of the portal is that it
 * feels like the samaj rather than like software.
 *
 * Signed-in members get their name and a route onward instead of a sign-up
 * pitch — onward to `/join/status` while their membership is still activating: showing "Join us" to somebody who joined years ago is the fastest way
 * to make a community site feel like a brochure.
 *
 * Layout, rhythm and the responsive action row come from `PageHero`; this
 * component supplies only the surface colour, the artwork and the words.
 */
export const HeroSection = forwardRef<HTMLElement, HeroSectionProps>(
  ({ className = '' }, ref) => {
    const user = useUser();
    const firstName = user?.name?.split(' ')[0];
    const pending = useMembershipPending(user !== null);

    return (
      <PageHero
        ref={ref}
        className={['bg-amber-50 dark:bg-gray-900', className].join(' ')}
        backdrop={
          <>
            {/* Assets live under /extension/ — see .claude/rules/ui-component.md. */}
            <MaskedAsset
              src="/extension/jharokha-pattern.svg"
              tile={{ width: 240, height: 280 }}
              className="absolute inset-0 text-amber-900/[0.07] dark:text-amber-200/[0.06]"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-amber-50 dark:to-gray-900" />
          </>
        }
        mark={
          <MaskedAsset
            src="/extension/rra-crest.svg"
            className="h-20 w-20 text-amber-800 dark:text-amber-300"
          />
        }
        eyebrow={<span className="text-amber-800 dark:text-amber-300">Khamaghanisa</span>}
        title={
          firstName ? (
            <>
              Welcome back,{' '}
              <span className="text-amber-800 dark:text-amber-300">{firstName}</span>
            </>
          ) : (
            <>
              Rajputana Rawla
              <span className="block text-amber-800 dark:text-amber-300">of America</span>
            </>
          )
        }
        description={
          firstName && pending
            ? 'Your membership is nearly there. Finish the remaining steps to open up the directory, your household and your chapter.'
            : firstName
            ? 'Your samaj, your household, your chapter — all in one place.'
            : 'Stay connected to your roots. A home in America for the Rajputs of historical Rajputana — to cherish a shared culture and pass it on to the next generation.'
        }
        actions={
          user !== null && pending ? (
            <Link to="/join/status">
              <Button size="lg">Complete your membership</Button>
            </Link>
          ) : user !== null ? (
            <>
              <Link to="/members">
                <Button size="lg">Browse the directory</Button>
              </Link>
              <Link to="/join/status">
                <Button size="lg" variant="secondary">
                  My membership
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/join">
                <Button size="lg">Apply for membership</Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="secondary">
                  Sign in
                </Button>
              </Link>
            </>
          )
        }
        footnote="Descended from the thirty-six royal clans — one platform, one brotherhood."
      />
    );
  },
);

HeroSection.displayName = 'HeroSection';
