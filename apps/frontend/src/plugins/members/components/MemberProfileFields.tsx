import { forwardRef } from 'react';
import { DescriptionList, type DescriptionListItem } from '@helix-x/design-system';
import type { MemberDetailDto } from '@helix-x-rawla/client-sdk';

export type MemberProfileFieldsProps = {
  member: MemberDetailDto;
  className?: string;
};

const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

/**
 * Read-only view of a member record.
 *
 * Builds the field list from what the server **actually returned**. Fields the
 * viewer may not see are absent from the payload rather than blanked, so the
 * `undefined` checks below are the privacy tiers showing through — there is
 * nothing here to hide, because it never arrived.
 */
export const MemberProfileFields = forwardRef<HTMLDListElement, MemberProfileFieldsProps>(
  ({ member, className = '' }, ref) => {
    const items: DescriptionListItem[] = [
      { term: 'Member ID', description: member.publicMemberId },
      { term: 'Membership tier', description: member.membershipTier },
      { term: 'Chapter', description: member.chapterId ?? 'Unassigned' },
      { term: 'Gotra', description: member.gotra },
      { term: 'Caste', description: member.caste },
      { term: 'Thikana', description: member.thikana },
    ];

    const optional: Array<[unknown, string, React.ReactNode]> = [
      [member.sasural, 'Sasural', member.sasural],
      [member.nanihal, 'Nanihal', member.nanihal],
      [member.dateOfBirth, 'Date of birth', member.dateOfBirth],
      [member.phone, 'Phone', member.phone],
      [member.industry, 'Industry', member.industry],
      [member.jobTitle, 'Job title', member.jobTitle],
      [member.languages, 'Languages', member.languages?.join(', ')],
      [member.skills, 'Skills', member.skills?.join(', ')],
      [member.education, 'Education', member.education],
      [
        member.totalDonationsCents,
        'Total giving',
        member.totalDonationsCents === undefined ? null : money(member.totalDonationsCents),
      ],
    ];

    for (const [present, term, description] of optional) {
      if (present !== undefined) items.push({ term, description });
    }

    return (
      <div className={className || undefined}>
        <DescriptionList ref={ref} items={items} variant="field" columns={3} />
        {member.familyHistory !== undefined && (
          <div className="mt-6">
            <DescriptionList
              items={[{ term: 'Family history', description: member.familyHistory }]}
              variant="field"
              columns={1}
            />
          </div>
        )}
      </div>
    );
  },
);

MemberProfileFields.displayName = 'MemberProfileFields';
