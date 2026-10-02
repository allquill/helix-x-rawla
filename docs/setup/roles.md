# Roles and permissions

A person's roles decide what they can see and do. Each role holds a set of
permissions; screens and API calls check the permission, never the role name.
Roles are given in **Administration → Users** (`/admin/users`).

After changing someone's roles, they must sign out and back in.

## The roles

| Role | Who it is for |
|---|---|
| `super_admin` | Platform administrator. Holds everything. |
| `admin` | Portal administrator. Holds nearly everything — see the two limits below. |
| `president` | Read access across membership, approvals and the audit log. |
| `general_secretary` | Events, announcements, communications. |
| `finance_secretary` | Money: payment overrides, event finances, financial member data. |
| `membership_secretary` | Vetting: approves and rejects applications, edits members, maintains reference lists. |
| `chapter_lead` | One chapter only: its members, its applications, its events. |
| `mentor` | Reads the directory. |
| `member` | An active member: own profile, directory, events, files. |
| `youth_member` | Own profile and events. |
| `applicant` | Someone who has applied and is not yet approved. No permissions. |

The first eight are *staff* roles: their holders can sign in without being a
member. Staff who are not members cannot register for events.

## Membership

| Can… | Roles |
|---|---|
| See members and the directory | everyone except `youth_member` and `applicant` |
| Edit any member | `admin`, `super_admin`, `membership_secretary` |
| See the application queue | all staff except `mentor` |
| Approve or reject an application | `admin`, `super_admin`, `president`, `membership_secretary` |
| Override the dues gate | `admin`, `super_admin`, `president`, `finance_secretary`, `membership_secretary` |
| Manage chapters | `admin`, `super_admin`, `president`, `membership_secretary` |
| Edit reference lists | `admin`, `super_admin`, `membership_secretary` |
| Change portal settings | `admin`, `super_admin`, `president` |
| Read the audit log | `admin`, `super_admin`, `president`, `finance_secretary`, `membership_secretary` |

A Chapter Lead who holds no wider role sees only their own chapter's members,
applications and events. Another chapter's records answer "not found".

## Events and volunteers

| Can… | Roles |
|---|---|
| See events, participants and Top Volunteers | every signed-in role |
| Register their household | `member` and all staff roles (staff must also be a member) |
| **Create an event** | `general_secretary`, `membership_secretary`, `finance_secretary`, `super_admin` |
| Edit and publish events, tickets and time slots | `admin`, `super_admin`, the three Secretaries |
| See registrations, with amounts | the above, plus `president` and `chapter_lead` (own chapter) |
| Record a Zelle or other offline payment | `admin`, `super_admin` |
| Remove a household from an event | `admin`, `super_admin` |
| Attach and delete event documents | `admin`, `super_admin` |
| Post the photos link | `admin`, `super_admin` |
| Enter volunteer hours, close an event | `admin`, `super_admin`, the three Secretaries |
| Record donated goods, write waivers | `admin`, `super_admin`, the three Secretaries |
| See costs and the chapter split | `admin`, `super_admin`, `general_secretary`, `finance_secretary`, `chapter_lead` (own chapter) |
| Record costs | `admin`, `super_admin`, `general_secretary`, `finance_secretary` |
| Upload a certificate to a profile | `admin`, `super_admin`, the three Secretaries |

### Two things `admin` deliberately cannot do

- **Create an event.** Only the three Secretaries create events. An
  administrator can run an event once it exists, but the "New event" button is
  not offered to them. `super_admin` can, as a break-glass account.
- **Open a closed event's statements and bills.** While an event is open its
  documents are visible to Admins and all Secretaries. Once it is closed they
  are visible only to the Finance Secretary, the General Secretary and
  `super_admin`.

Both are the organisation's rule, not an oversight.

## Files

`member` and the staff roles can keep private files, organise them in folders
and share them. `admin` and `super_admin` can also list and delete anyone's
files — but not read their contents.

## Where this is defined

The permissions and every grant are rows in the database, created by the
migrations: the app's `0001` (membership), `0003` (files) and `0004` (events
and volunteers). Changing who holds what is a role edit in
**Administration → Roles**, or a new migration if it should apply to every
installation.
