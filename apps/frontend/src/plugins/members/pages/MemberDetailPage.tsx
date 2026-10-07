import { Link } from 'react-router-dom';
import type { RouteViewProps } from '@helix-x/web';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
} from '@helix-x/web/design-system';
import { CertificatesSection } from '../components/CertificatesSection';
import { MemberProfileFields } from '../components/MemberProfileFields';
import { useMember } from '../hooks/useMembers';

/**
 * One member, tier-filtered by the server (MP-03, MP-15, MP-16).
 *
 * `id` arrives as a prop, not from `useParams()`. Routes here are declared in
 * the manifest and rendered by `<RouterOutlet>`, so there is no `<Route>`
 * element for `useParams` to read a match from — it would return `{}`.
 */
export function MemberDetailPage({ params }: RouteViewProps) {
  const id = params?.id;
  const { member, loading, error } = useMember(id);

  return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {member ? `${member.firstName} ${member.lastName}` : 'Member'}
            </h1>
            {member && (
              <p className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                {member.email}
                <Badge variant={member.isActive ? 'success' : 'default'}>
                  {member.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </p>
            )}
          </div>
          <Link to="/members">
            <Button variant="secondary">Back to members</Button>
          </Link>
        </div>

        {loading && <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">Loading…</p>}
        {error && <Alert variant="error">{error}</Alert>}

        {member && (
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Profile</h2>
              </CardHeader>
              <CardBody>
                <MemberProfileFields member={member} />
              </CardBody>
            </Card>
            {/* REC-07. Renders only for someone who may upload certificates. */}
            <CertificatesSection memberId={member.id} childProfiles={member.children ?? []} />
          </div>
        )}
      </div>
  );
}
