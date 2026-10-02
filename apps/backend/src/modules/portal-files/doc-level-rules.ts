/**
 * The document security levels of §20.4 (DOC-06), as one pure decision.
 *
 * The portal's download routes enforce this server-side whatever any storage
 * folder's sharing says. Level 3 (donation records) has no document in the
 * portal yet, so it is not modelled here.
 *
 * | Level | Who                                                            |
 * |-------|----------------------------------------------------------------|
 * | 1     | every signed-in member, and staff                              |
 * | 2     | the member it belongs to (a parent, for a child), and staff who |
 * |       | upload them: Admins and the Secretaries                        |
 * | 4     | Admins and all Secretaries                                     |
 * | 5     | the Finance and General Secretaries, and `super_admin`          |
 *
 * `admin` is deliberately absent from level 5: closed-event bills are for the
 * two Secretaries (FIN-01), with `super_admin` as the break-glass account.
 */
export type DocLevel = 1 | 2 | 4 | 5;

export interface DocViewer {
  roles: readonly string[];
  /** The document is filed under the viewer's own profile (a child's is the parent's). */
  isOwner?: boolean;
}

const ADMIN_ROLES = ['admin', 'super_admin'];
const SECRETARY_ROLES = ['general_secretary', 'finance_secretary', 'membership_secretary'];
const LEADERSHIP_ROLES = [...ADMIN_ROLES, ...SECRETARY_ROLES];
const FINANCE_RESTRICTED_ROLES = ['finance_secretary', 'general_secretary', 'super_admin'];

const holdsAny = (roles: readonly string[], allowed: readonly string[]): boolean =>
  roles.some((role) => allowed.includes(role));

export function canViewLevel(level: DocLevel, viewer: DocViewer): boolean {
  switch (level) {
    case 1:
      return true;
    case 2:
      return viewer.isOwner === true || holdsAny(viewer.roles, LEADERSHIP_ROLES);
    case 4:
      return holdsAny(viewer.roles, LEADERSHIP_ROLES);
    case 5:
      return holdsAny(viewer.roles, FINANCE_RESTRICTED_ROLES);
  }
}

/**
 * An event's statements and bills are level 4 while it is open and level 5
 * once it is closed (EVT-24 / FIN-04). Nothing is moved or rewritten at close:
 * the level is read from the event's status, so it cannot fall out of step.
 */
export function eventDocumentLevel(event: { status: string }): DocLevel {
  return event.status === 'closed' ? 5 : 4;
}
