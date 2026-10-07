import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { RouteViewProps } from '@helix-x/web';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
} from '@helix-x/web/design-system';
import { PortalAdminLayout } from '../../../shared/PortalAdminLayout';
import { GateBadges } from '../components/GateBadges';
import { ReasonDialog } from '../components/ReasonDialog';
import { useRegistrationReview } from '../hooks/useRegistrationReview';

type DialogKind = 'reject' | 'info' | 'payment_on' | 'payment_off' | 'email' | null;

/** One application, with the four decisions REG-09 and REG-16 allow. */
export function RegistrationReviewPage({ params }: RouteViewProps) {
  const id = params?.id;
  const review = useRegistrationReview(id);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const member = review.member;

  const approve = async () => {
    setActionError(null);
    setApproving(true);
    try {
      await review.approve();
    } catch (err) {
      const body = (err as { body?: { message?: string } }).body;
      setActionError(body?.message ?? 'The application could not be approved.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <PortalAdminLayout
      title={member ? `${member.firstName} ${member.lastName}` : 'Application'}
      description={member?.email}
      actions={
        <Link to="/admin/registrations">
          <Button variant="secondary">Back to queue</Button>
        </Link>
      }
    >
      {review.loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">Loading…</p>
      )}
      {review.error && <Alert variant="error">{review.error}</Alert>}
      {actionError && <Alert variant="error" className="mb-4">{actionError}</Alert>}

      {member && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Activation gates
                </h2>
                <Badge variant="default">{member.status.replace(/_/g, ' ')}</Badge>
              </div>
            </CardHeader>
            <CardBody>
              <GateBadges
                isEmailVerified={member.isEmailVerified}
                isApproved={member.isApproved}
                isPaymentMade={member.isPaymentMade}
                isActive={member.isActive}
              />

              {!member.isEmailVerified && (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                  This applicant has not confirmed their email address, so the
                  application is not ready for a decision.
                </p>
              )}
              {member.isEmailVerified && !member.passwordSetAt && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Address confirmed, but no password has been set yet.
                </p>
              )}
              {member.paymentOverrideReason && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Last dues change: {member.paymentOverrideReason}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  onClick={approve}
                  loading={approving}
                  disabled={member.isApproved || !member.isEmailVerified}
                >
                  {member.isApproved ? 'Approved' : 'Approve'}
                </Button>
                <Button variant="secondary" onClick={() => setDialog('info')}>
                  Request more information
                </Button>
                <Button variant="ghost" onClick={() => setDialog('reject')}>
                  Reject
                </Button>
                {member.isPaymentMade ? (
                  <Button variant="ghost" onClick={() => setDialog('payment_off')}>
                    Clear dues
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setDialog('payment_on')}>
                    Record dues received
                  </Button>
                )}
                {!member.isEmailVerified && (
                  <Button variant="ghost" onClick={() => setDialog('email')}>
                    Mark email verified
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Applicant</h2>
            </CardHeader>
            <CardBody>
              <DescriptionList
                variant="field"
                columns={3}
                items={[
                  { term: 'Member ID', description: member.publicMemberId },
                  { term: 'Tier', description: member.membershipTier },
                  { term: 'Date of birth', description: member.dateOfBirth },
                  { term: 'Gotra', description: member.gotra },
                  { term: 'Caste', description: member.caste },
                  { term: 'Thikana', description: member.thikana },
                  { term: 'Phone', description: member.phone },
                  { term: 'Chapter', description: member.chapterId ?? 'Unassigned' },
                  { term: 'Household', description: member.householdId },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Household</h2>
            </CardHeader>
            <CardBody>
              {member.weddingDate && (
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  Wedding date: {member.weddingDate}
                </p>
              )}
              {!member.spouse && !member.children?.length ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No spouse or children on file. Both are optional, and the
                  applicant can add them after signing in.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {member.spouse && (
                    <DescriptionList
                      variant="field"
                      columns={3}
                      items={[
                        { term: 'Spouse', description: `${member.spouse.firstName} ${member.spouse.lastName}` },
                        { term: 'Date of birth', description: member.spouse.dateOfBirth },
                        { term: 'Caste', description: member.spouse.caste },
                        { term: 'Gotra', description: member.spouse.gotra },
                        { term: 'Thikana', description: member.spouse.thikana },
                        { term: 'Email', description: member.spouse.email },
                      ]}
                    />
                  )}
                  {member.children && member.children.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {member.children.map((child) => (
                        <li key={child.id} className="text-sm text-gray-900 dark:text-gray-100">
                          {child.sequence}. {child.firstName} {child.lastName}{' '}
                          <span className="text-gray-500 dark:text-gray-400">
                            · born {child.dateOfBirth}
                            {child.gender ? ` · ${child.gender}` : ''} · {child.membershipTier}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                References
              </h2>
            </CardHeader>
            <CardBody>
              {member.offlineVerification ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  The applicant asked to supply references offline.
                </p>
              ) : member.references && member.references.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {member.references.map((reference) => (
                    <li key={reference.sequence} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {reference.name}{' '}
                        <span className="text-gray-500 dark:text-gray-400">{reference.phone}</span>
                      </span>
                      <Badge variant={reference.isVerified ? 'success' : 'default'}>
                        {reference.isVerified ? 'Checked' : 'Not checked'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No references on file.</p>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      <ReasonDialog
        open={dialog === 'reject'}
        title="Reject this application"
        description="The reason is emailed to the applicant and written to the audit log."
        confirmLabel="Reject"
        destructive
        placeholder="e.g. References could not be confirmed."
        onClose={() => setDialog(null)}
        onConfirm={(reason) => review.reject(reason).then(() => undefined)}
      />
      <ReasonDialog
        open={dialog === 'info'}
        title="Request more information"
        description="Emailed to the applicant, who can then resubmit."
        confirmLabel="Send request"
        placeholder="e.g. Please provide a second reference."
        onClose={() => setDialog(null)}
        onConfirm={(message) => review.requestInfo(message).then(() => undefined)}
      />
      <ReasonDialog
        open={dialog === 'payment_on'}
        title="Record dues received"
        description="For cheque, Zelle, cash, waived, honorary and complimentary memberships."
        confirmLabel="Record payment"
        placeholder="e.g. Cheque #1042 received 2026-09-02."
        onClose={() => setDialog(null)}
        onConfirm={(reason) => review.setPaymentStatus(true, reason).then(() => undefined)}
      />
      <ReasonDialog
        open={dialog === 'payment_off'}
        title="Clear the dues gate"
        description="This deactivates the member immediately, on their next request."
        confirmLabel="Clear dues"
        destructive
        placeholder="e.g. Chargeback from the issuing bank."
        onClose={() => setDialog(null)}
        onConfirm={(reason) => review.setPaymentStatus(false, reason).then(() => undefined)}
      />
      <ReasonDialog
        open={dialog === 'email'}
        title="Mark the email address verified"
        description="For members onboarded in person, or behind a mail filter that strips links."
        confirmLabel="Mark verified"
        placeholder="e.g. Onboarded in person at the Austin chapter meet."
        onClose={() => setDialog(null)}
        onConfirm={(reason) => review.overrideEmail(reason).then(() => undefined)}
      />
    </PortalAdminLayout>
  );
}
