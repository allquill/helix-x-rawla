import type { AuthenticatedUser } from '@helix-x/backend';
import type { Member } from '../entities/member.entity';
import { PORTAL_PERMISSIONS } from '../constants';
import { ProfileVisibilityService } from './profile-visibility.service';

/**
 * Household visibility (MP-17 / MP-18).
 *
 * Spouse and children ride on the member detail payload, but only the owner and
 * reviewers may see them. Anyone else must not receive the keys at all — an
 * empty value would still confirm that a household exists.
 */
describe('ProfileVisibilityService.toDetail — household', () => {
  const member = {
    id: 'mem-1',
    userId: 7,
    firstName: 'Arjun',
    lastName: 'Singh',
    directoryOptIn: true,
    fieldVisibility: null,
    socialLinksApproved: false,
  } as unknown as Member;

  const extras = {
    spouse: { firstName: 'Meera', lastName: 'Singh' },
    children: [
      { id: 'c-1', sequence: 1, firstName: 'Dev', lastName: 'Singh', dateOfBirth: '2015-08-03', membershipTier: 'youth' },
    ],
  };

  const viewer = (id: number, permissions: string[] = []): AuthenticatedUser => ({
    id,
    email: `user${id}@example.com`,
    roles: [],
    permissions,
  });

  const service = new ProfileVisibilityService();

  it('shows the household to its owner', () => {
    const detail = service.toDetail(member, 'a@example.com', viewer(7), extras);
    expect(detail.spouse?.firstName).toBe('Meera');
    expect(detail.children).toHaveLength(1);
  });

  it('shows the household to a reviewer', () => {
    const detail = service.toDetail(
      member,
      'a@example.com',
      viewer(99, [PORTAL_PERMISSIONS.MEMBERS_READ, PORTAL_PERMISSIONS.REGISTRATION_READ]),
      extras,
    );
    expect(detail.spouse).toBeDefined();
    expect(detail.children).toHaveLength(1);
  });

  it('omits the household keys entirely for another member', () => {
    const detail = service.toDetail(
      member,
      'a@example.com',
      viewer(42, [PORTAL_PERMISSIONS.MEMBERS_READ]),
      extras,
    );
    expect('spouse' in detail).toBe(false);
    expect('children' in detail).toBe(false);
  });
});
