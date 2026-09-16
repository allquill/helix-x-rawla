import { forwardRef } from 'react';
import type { RouteViewProps } from '@helix-x/web';
import { RegistrationForm } from '../components/RegistrationForm';

export type JoinPageProps = RouteViewProps & { className?: string };

/**
 * The public application page — reachable without signing in (REG-01).
 *
 * The route declares `layout: 'app.bare'`, so the shell draws the header
 * (branding, theme toggle) but no sidebar: there is nothing to navigate to
 * before you have an account.
 */
export const JoinPage = forwardRef<HTMLDivElement, JoinPageProps>(
  ({ className = '' }, ref) => {
    return (
      <div ref={ref} className={['min-h-screen bg-gray-50 dark:bg-gray-950', className].join(' ')}>
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <RegistrationForm />
        </div>
      </div>
    );
  },
);

JoinPage.displayName = 'JoinPage';
