import { forwardRef, type ReactNode } from 'react';
import { cn, Icon, PageHeader } from '@helix-x/web/design-system';
import { useNavAction, useNavItems } from '@helix-x/web';

export type PortalAdminLayoutProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Section shell for the portal administration screens — every page behind a
 * `portal.sectionnav` tab renders through it, whichever plugin owns the page
 * (`membership-admin`, `chapters`, `events`), so the rail and the title sit in
 * the same place on all of them. It lives outside `plugins/` because plugins
 * do not import each other.
 *
 * The rail's links come from `useNavItems('portal.sectionnav')` rather than a
 * local array, so it cannot drift from the routes it links to — and a plugin
 * gets a tab simply by contributing to the slot `membership-admin` defines.
 *
 * Access filtering is already applied: `useNavItems` drops items whose `when`
 * clause is false, and that is the same clause gating the route. So a Chapter
 * Lead sees the applications queue but not the portal settings that would let
 * them change the rules it runs on — and the tab for a screen they cannot open
 * never renders.
 *
 * There is no shell markup here any more. The route declares `layout: 'app'`
 * and the shell draws the header, sidebar, status bar and content gutter
 * around this — a page must not add its own outer padding or max width, or
 * the rail moves between tabs. Constrain the body inside `children` instead.
 */
export const PortalAdminLayout = forwardRef<HTMLDivElement, PortalAdminLayoutProps>(
  ({ title, description, actions, children, className = '' }, ref) => {
    const items = useNavItems('portal.sectionnav');
    const run = useNavAction();

    return (
      <div ref={ref} className={cn('mx-auto flex w-full flex-col gap-6', className)}>
        {items.length > 1 ? (
          <nav
            aria-label="Portal administration sections"
            className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800"
          >
            {items.map(({ item, active }) => (
              <button
                key={item.id}
                type="button"
                onClick={() => run(item)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600',
                  'dark:focus-visible:ring-offset-gray-900',
                  active
                    ? 'border-amber-700 text-amber-800 dark:border-amber-400 dark:text-amber-300'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
                )}
              >
                {item.icon ? <Icon name={item.icon} size={16} aria-hidden="true" /> : null}
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}

        <PageHeader title={title} description={description} actions={actions} />

        {children}
      </div>
    );
  },
);

PortalAdminLayout.displayName = 'PortalAdminLayout';
