# Administering membership

The screens under **Administration → Membership**. Which tabs you see depends
on your [role](/setup/roles.md).

## Applications

`/admin/registrations` — the queue of people who have applied.

An application appears here only after the applicant has confirmed their email
address. Open one to review it: the applicant's details, household, and the two
references they named.

| Action | What happens |
|---|---|
| **Approve** | Closes the approval gate. The applicant becomes active as soon as their dues are also settled, and is given a Member ID and the `member` role. |
| **Request information** | Sends your question to the applicant and parks the application until they reply. |
| **Reject** | Needs a reason, which is emailed to the applicant. A rejected applicant can no longer sign in. |

Every decision is recorded in the audit log with your name and the reason.

### Overrides

Two gates can be closed by an officer on the applicant's behalf, each with a
mandatory reason:

- **Dues** — when someone has paid outside the portal, or dues are waived.
- **Email** — when someone cannot receive the confirmation email.

Use them sparingly; both are audited.

## Members

`/members` is the directory; opening a member shows their full record to staff.
Staff who can edit members can correct a member's tier, chapter and details.
What a member can change themselves is described in the User Guide under
[Your profile and household](/guide/profile.md).

## Chapters

`/admin/chapters` — the regional chapters and the states each covers.

A new member's chapter is decided by the state in their address, using the
**State to chapter** table on this screen. A state with no entry leaves the
member unassigned, for an officer to place by hand. Each chapter can carry a
contact email — these ship empty and should be filled in.

## Reference data

`/admin/reference-data` — the dropdown lists used across the portal: gotra,
caste, thikana, honorifics, languages, industries, skills, membership tiers
(with each tier's dues), and for events the food preferences and T-shirt
sizes.

Once a list has any value, only its listed values are accepted. Retire a value
by making it inactive rather than deleting it: existing records keep it.

## Portal settings

`/admin/portal-settings` — the organisation's own levers:

| Setting | Meaning |
|---|---|
| Minimum age | The youngest age at which someone may create an account |
| Payment required | Turn off to treat the dues gate as satisfied for everyone |
| Link lifetimes and resend limits | How long emailed links stay valid, and how often they can be re-sent |
| `events.reminder_offsets_days` | Days before an event that registrants are reminded (default `7,1`) |
| `events.default_timezone` | The time zone a new event starts in |
| `events.broadcast_batch_size` | Invitation emails sent per pass |
| `volunteers.youth_max_age` | The oldest age counted as a youth volunteer (default 17) |
| `volunteers.leaderboard_size` | How many people Top Volunteers shows |

## Audit log

`/admin/audit` — every decision and change made by an officer or by the system:
who, what, when, and the reason where one was required. It cannot be edited or
deleted, by anyone, from anywhere in the portal.

## Users, roles and navigation

`/admin/users`, `/admin/roles`, `/admin/permissions` and `/admin/navigation`
are the framework's own administration screens: create a staff account, give
someone a role, and rearrange or hide menu entries.
