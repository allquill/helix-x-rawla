import { forwardRef } from 'react';
import type { RouteViewProps } from '@helix-x/web';
import { HeroSection } from '../components/HeroSection';
import { HomeFooter } from '../components/HomeFooter';
import { JoinPathSection } from '../components/JoinPathSection';
import { LeadershipSection } from '../components/LeadershipSection';
import { MemberBenefitsSection } from '../components/MemberBenefitsSection';
import { PillarsSection } from '../components/PillarsSection';

export type HomePageProps = RouteViewProps & { className?: string };

/**
 * The community's front door.
 *
 * A thin composer: every section is its own component, and the page owns only
 * the shell and the order. The order is the argument it makes — who we are,
 * what we stand for, how you join, what you get, who runs it.
 */
export const HomePage = forwardRef<HTMLDivElement, HomePageProps>(
  ({ className = '' }, ref) => (
    <div ref={ref} className={className || undefined}>
        <main>
          <HeroSection />
          <PillarsSection />
          <JoinPathSection />
          <MemberBenefitsSection />
          <LeadershipSection />
        </main>
        <HomeFooter />
    </div>
  ),
);

HomePage.displayName = 'HomePage';
