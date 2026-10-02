# Rawla Portal — Module-wise Detailed Requirements

**Source:** `docs/requirements/Rawla_Portal_High_level_Requirements_updated_SEP_02_2026.xlsx` (10 tabs, dated 02-Sep-2026)
**Organisation:** Rajputana Rawla of America (RROA / RRA) — a US-based regional community body with geographic chapters
**Second source (Rev 9):** `requirements/RROA_Donations_Events_Volunteers_Requirements.docx` — *RROA Member Portal Requirements: Donations, Events, Volunteers and Finance*, updated 28-Sep-2026. Cited as **`RROA-DEV!<id>`** (for example `RROA-DEV!D5`), using that document's own item IDs: M = member registration and profile, D = donations, E = events, V = volunteers, H = home page, F = finance module, S = document storage.
**Document status:** Derived analysis — every requirement below is traced to a source cell; anything marked **[NEW]** is an inferred gap not present in the workbook, or a later customer instruction.
**Revision 9 (30-Sep-2026):** reconciled with RROA-DEV. Every one of its 58 items is mapped to a module and a requirement ID in **§26**, with a disposition (Covered, Refines, New or Conflicts) and a build status. Items with no existing home are added as **[NEW — Rev 9]** rows: MP-25…27, DON-14…18, TAX-08…09, EVT-16…26, VOL-10…13 and REC-07…08. There are also two new modules, **FIN — Finance Module** (§17A) and **HOM — Member Home Page** (§18A), and one new shared service, **DOC — Document Storage & Security Levels** (§20.4). **No existing requirement was removed or reworded.** Where RROA-DEV narrows or excludes something this document keeps (funds, refunds, QR check-in, badges, automatic certificates, volunteer shifts, non-member tickets, tiers other than Lifetime), the existing row stands. The difference is recorded in **§26.3** and raised as an open question in §23 (#33–#46). §25 was re-verified at commit `4f7dba8`.
**Revision 8 (27-Sep-2026):** added **§25 — implementation status and gap register**, reviewed against the code at commit `a90ecd6`. Every requirement ID now has a build status with evidence. The §2 module map was corrected to where the code actually lives (one `community-core` backend module plus app-local frontend plugins, not `packages/extension/*`). §23 gained questions #25–#32, raised by the build. *Correction, same day:* the first draft said the join form captured spouse and children. It did not: the API accepted them, but `/join` never sent them. The join form now has an optional **Family** step, and members can add, edit or remove spouse and children from **My profile** after signing in. MP-17 and MP-18 moved to ✅ and #30 is answered.
**Revision 7 (05-Sep-2026):** reverted to **emailed verification links** for every credential flow — registration verification, first-password setup and password reset. The 6-digit code is withdrawn; `verification_token` replaces `verification_code`. IAM-06 returns to the workbook's own wording (`Reg!B12`). Link-specific hardening added: prefetch safety, referrer suppression and token-stripping. See IAM-01/05/06/18, REG-21/22, ADM-12, §5.5 and §6.2.
**Revision 6 (05-Sep-2026):** added **§5.5 — five flow diagrams** covering the account-creation path end to end: validation and age gate, the code mechanism across all three purposes, vetting, payment, the blocked-login precedence ladder, and every route out of active status.
**Revision 5 (05-Sep-2026) — superseded by Revision 7:** customer-confirmed — **initial credential setup also moves to the 6-digit code** (`purpose = credential_setup`), retiring the emailed setup link, and **redeeming a password-reset code sets `is_email_verified`**. Links are now gone from every credential flow. See IAM-01 and REG-12 (rewritten), §6.2.
**Revision 4 (05-Sep-2026) — superseded by Revision 7:** password reset now uses the **same 6-digit code mechanism** as email verification, served by one purpose-scoped `verification_code` service. Reset links are replaced by codes. See IAM-05/IAM-06 (rewritten), IAM-18…IAM-20, §6.2, ADM-12.
**Revision 3 (05-Sep-2026):** account creation now **requires an email address**, which must be verified by an emailed link (a 6-digit code in Revisions 3–6) (`is_email_verified`). Verification is the third activation gate, and every blocked login/API call must name the reason. See MP-24, REG-20…REG-23, IAM-16/IAM-17, ADM-12.
**Revision 2 (05-Sep-2026):** account activation now requires **both** admin approval and a settled membership payment (`is_active = is_approved && is_payment_made`), the payment flag is admin-overridable with a mandatory reason, and account creation is blocked below a configurable minimum age (default 18). See MP-22/MP-23, REG-15…REG-19, IAM-14/IAM-15, ADM-09…ADM-11.
**Target platform:** the `helix-x` monorepo (pnpm + Turborepo; NestJS backend, React/Vite frontend, `packages/{framework,extension}/ui/*` feature-module packages).

---

## 1. Purpose and reading guide

The workbook states seven high-level categories (`High level requirements` tab):

| # | Category | High-level statement |
|---|---|---|
| 1 | Member Profile | Manage all aspects of member profiles |
| 2 | Registration | Registration approval and security of members |
| 3 | Donations & Charity Management | Donation management and charity-related requirements |
| 4 | Events & Volunteer Management | Events (cultural and charity) and volunteer management |
| 5 | Communications | 1-1 and mass communications, EC updates |
| 6 | Administration | Administration of the portal |
| 7 | Non Functional | One application serving mobile + desktop, plus an app-wrapped solution |

Those seven categories are **capability areas**, not deliverable modules. This document decomposes them into **16 implementable modules** (plus 3 cross-cutting platform services), each with its own data model, functional requirements, API surface, screens, RBAC rules and acceptance criteria.

**Requirement ID scheme:** `<MODULE-CODE>-<nn>`. The **Source** column cites the workbook tab and row, e.g. `Donations!B11` — so every line is auditable back to the customer's sheet.

**Priority** values are carried over from the workbook (`High` / `Med` / `Low`) where the sheet supplied one; otherwise they are proposed and marked with `*`.

**Revision 9 — the second source.** RROA-DEV is a plain-language document the customer wrote after reviewing the workbook. It covers donations, events, volunteers, the home page, a new Finance module and document storage, plus four enhancements to member profiles. It states three ground rules that apply to everything it adds:

- Registration, login, passwords and profile setup are treated as complete. Only the enhancements M1–M4 are new.
- **Only logged-in, approved members** use these features. Nothing is for non-members or the public.
- Its §9 lists what is **not included for now**. This document does not delete anything on that basis. See §26.3.

Where RROA-DEV gives no priority, the new row says `Not given`, as RROA-DEV does. **§26 is the crosswalk.** Start there to find where any RROA-DEV item landed.

---

## 2. Module map

| Code | Module | Covers source tabs | Backend home (actual) | Frontend home (actual) | Feature flag (actual) | Phase | Build status (§25) |
|---|---|---|---|---|---|---|---|
| **MP** | Member Profile & Household | Member profile, Spouse profile, Child profile | `apps/backend/src/modules/community-core` | `apps/frontend/src/plugins/members` | `VITE_FEATURE_MEMBERS` | 1 | 🟡 Partial |
| **REG** | Registration & Onboarding Workflow | Member Registration process (Intake, Approval) | `apps/backend/src/modules/community-core` | `apps/frontend/src/plugins/registration`, `plugins/membership-admin` | `VITE_FEATURE_REGISTRATION`, `VITE_FEATURE_MEMBERSHIP_ADMIN` | 1 | 🟡 Mostly built |
| **IAM** | Identity, Security & Access | Member Registration process (Security, Recovery), Administration (Access, Security) | `framework/helix-x-backend/packages/authentication` + `community-core` auth hooks | `@helix-x/plugin-auth`, `@helix-x/plugin-admin` (framework) | always on | 1 | 🟡 Partial |
| **CHP** | Chapters & Multi-Tenancy | Administration, Member profile, Events (Finance) | `apps/backend/src/modules/community-core` | `apps/frontend/src/plugins/chapters` | `VITE_FEATURE_CHAPTERS` | 1 | 🟡 Partial |
| **DIR** | Member Directory & Networking | Communications (P2P), Member profile | `community-core` (member list) | `apps/frontend/src/plugins/members` (`/members`) | `VITE_FEATURE_MEMBERS` | 2 | 🟡 Early |
| **DON** | Donations & Fundraising | Donations and Charity Management (Intake, Fund Mgmt) | `community-core` (dues rail only) | `plugins/registration` (dues checkout only) | — | 2 | 🟡 Dues rail only |
| **TAX** | Receipting, Tax & Financial Compliance | Donations (Tax/Legal, Analytics) | — | — | — | 2 | ❌ Not started |
| **EVT** | Events & Ticketing | Events & Volunteer Mgmt (Ticketing, Scheduling, Logistics, On-Site) | `apps/backend/src/modules/events` | `apps/frontend/src/plugins/events` | `VITE_FEATURE_EVENTS` | 2 | 🟡 Mostly built |
| **VOL** | Volunteer Management | Events & Volunteer Mgmt (Recruitment, Engagement, Tracking) | `apps/backend/src/modules/events` | `plugins/events`, `plugins/volunteers` | `VITE_FEATURE_VOLUNTEERS` | 3 | 🟡 Rev 9 scope built |
| **REC** | Recognition & Certificates | Events & Volunteer Mgmt (Recognition) | — | — | — | 3 | ❌ Not started |
| **COM** | Communications & Broadcast | Communications (Broadcast, Security) | — (transactional email only, via `@helix-x/notifications`) | — | — | 2 | ❌ Not started |
| **GOV** | Leadership & Governance (EC Corner) | Communications (Leadership) | — | — (static leadership section on `/` only) | — | 3 | ❌ Not started |
| **P2P** | Member-to-Member Engagement | Communications (P2P, Security) | — | — | — | 4 | ❌ Not started |
| **ADM** | Administration & Master Data | Administration (Data, Automation, Integration) | `community-core` (settings, reference data, audit) + framework auth admin | `plugins/membership-admin` + `@helix-x/plugin-admin` | `VITE_FEATURE_MEMBERSHIP_ADMIN` | 1 | 🟡 Partial |
| **RPT** | Reporting & Analytics | Administration (Reports), Donations (Analytics) | — | `@helix-x/plugin-reports` is registered but is a generic framework plugin with no portal reports | `VITE_FEATURE_REPORTS` | 3 | ❌ Not started |
| **PLT** | Platform, PWA & Experience | Non Functional | cross-app | `apps/frontend` shell | n/a | 1 | 🟡 Partial |
| **FIN** **[NEW — Rev 9]** | Finance Module | RROA-DEV §6 (F1–F4), plus D6, D11 and E15/E17 | — (planned: `community-core` or a sibling `finance` module) | — (planned: `plugins/finance`) | — | 2 | ❌ Not started |
| **HOM** **[NEW — Rev 9]** | Member Home Page | RROA-DEV §5 (H1–H4) | reads DON, VOL, EVT, MP | `plugins/home` (today it serves only the public landing page) | — | 2 | ❌ Not started (H4 🟡) |

*Revision 9:* FIN and HOM are new modules because nothing in the workbook covers them. The Finance module is a restricted document and payout register, which is not TAX's receipting. The home page is a signed-in member dashboard, which is not the public landing page `/`.

*Revision 8:* the planned `packages/extension/backend/*` and `packages/extension/ui/*-ui` homes were never created. All product backend code sits in one NestJS feature module, `community-core`. Product screens are app-local plugins under `apps/frontend/src/plugins/`, as the repo's `CLAUDE.md` requires. Flags are opt-out: a plugin is on unless its flag is `'false'`.

### 2.1 Cross-cutting platform services

These are **not** user-facing modules; they are shared services every module above depends on. Building them once avoids three parallel half-implementations.

| Code | Service | Why it must be shared |
|---|---|---|
| **AUD** | Audit & Change Log | Required independently by `Registration!B19`, `Donations!B15` and `Administration!B6`. One append-only log, one viewer, one retention policy. |
| **NTF** | Notification & Template Service | Email / SMS / WhatsApp / in-app delivery is demanded by REG, DON, TAX, EVT, VOL and COM. Channel adapters, templating, per-member opt-out and delivery receipts belong in one place. |
| **MDM** | Master Data & Reference Lists | Gotra, Caste, Thikana/Village, Chapter, Membership Tier, Fund, Volunteer Role are referenced from MP, DIR, DON, EVT and COM. `Administration!B5` makes them admin-editable. |
| **DOC** **[NEW — Rev 9]** | Document Storage & Security Levels | `RROA-DEV!S1-S3` apply to **every** module. Receipts (TAX), tax letters (TAX), certificates (REC), waivers and flyers (EVT), event bills (EVT → FIN) and finance records (FIN) all go through one store with one security-level model (§20.4). |

---

## 3. Cross-cutting foundations

### 3.1 Role model

`Administration!B3` names five roles. Five is not enough to express the rest of the workbook (chapter scoping, youth accounts, pending applicants), so the model below extends it — extensions are marked **[NEW]**.

| Role | Source | Scope | Core capability |
|---|---|---|---|
| Super Admin / Platform Admin | **[NEW]** | Global | Environment config, integrations, backup/restore, impersonation |
| President / National Chair | `Administration!B3` | Global | Full read, governance publishing, escalation recipient (`Administration!B9`) |
| General Secretary | `Administration!B3` | Global | Minutes, announcements, events, communications |
| Finance Secretary | `Administration!B3` | Global | Donations, funds, refunds, tax statements, financial reports |
| Membership Secretary | `Administration!B3`, `Registration!B16` | Global | Registration vetting, approve/reject, member records, offline reference verification |
| Mentor | `Administration!B3` | Global | Read directory + professional profiles, youth mentoring, no financial access |
| Chapter Lead | `Administration!B4` | **Chapter-scoped** | Manage only their US region's members, events, volunteers, chapter finances |
| Event Organiser | **[NEW]** (implied by `Events!C34` "Mobile Access: dashboard for organizers during live events") | Event-scoped | Event setup, check-in, volunteer roster for assigned events |
| Volunteer Coordinator | **[NEW]** (implied by `Events!B10-B16`) | Event/chapter-scoped | Shifts, hours approval, certificates |
| Member | implied throughout | Self + household | Own profile, own household, own giving history, event/volunteer sign-up |
| Youth Member | `Member profile!D21`, `Child profile!B12` | Self | Restricted profile; certificates; parental linkage |
| Applicant | `Registration!J4` | None | Sees only their own application status |
| Unverified Applicant **[NEW]** | customer requirement | None | Email not yet verified: may only re-request the verification email; invisible to the vetting queue |
| Approved — Awaiting Payment **[NEW]** | customer requirement | Self | Approved but not yet paid: sees own status, the dues payment page and nothing else; invisible to the directory |

**Revision 9: role rules from RROA-DEV.** These add to the table above and change none of it.

| Rule | Roles | Source | Lands in |
|---|---|---|---|
| Only the **General, Member (= Membership) and Finance Secretaries** create events. | `general_secretary`, `membership_secretary`, `finance_secretary` | `RROA-DEV!E1` | EVT-16 |
| "Admins" record offline payments, remove registrations, add event documents, post photo links, remove a spouse or child, and upload tax letters and certificates. | RROA-DEV does not define "Admin". It is assumed to be the portal `admin` / `super_admin` roles (#46). | `RROA-DEV!E3,E11,E15,E16,M4` | EVT, MP-26 |
| "Admins **or Secretaries**" close events, enter volunteer hours and upload certificates. | `admin` + the three Secretaries | `RROA-DEV!E17,V4,V6` | EVT-26, VOL-12, REC-07 |
| Only the **Finance and General Secretaries** open the Finance module. | `finance_secretary`, `general_secretary` | `RROA-DEV!F1` | FIN-01 |
| Only **Admins and the Finance Secretary** see all donations and the donations dashboard. | `admin`, `finance_secretary` | `RROA-DEV!D12,D15` | DON-18, RPT-03 |
| A **Chapter Lead** sees and manages only their own chapter's donation data. | `chapter_lead` | `RROA-DEV!D16` | IAM-10 extended to DON |

All six roles above are already seeded (`0001_baseline.sql`). RROA-DEV needs no new role. The **President** is absent from every RROA-DEV access rule, including the Finance module, although §3.1 gives the President "full read". Question #46 asks which one wins.

**Permission naming:** `<resource>:<action>` — e.g. `members:read`, `members:write.self`, `donations:read.financial`, `registration:approve`, `registration:payment.override`, `registration:email.override`, `chapters:manage.own`. These map onto the existing `@helix-x/authentication` `Permissions()` decorator and the `requiredPermissions` metadata on frontend `NavItem`s, so no new authorization primitives are needed.

### 3.2 The three privacy tiers (critical, spans every module)

`Member profile!B15-B17` define a privacy model that the whole system must honour:

| Tier | Rule | Source |
|---|---|---|
| **Tier 1 — Self-edit only** | Only the member may update their own core profile details. | `Member profile!B16` |
| **Tier 2 — Community read-only** | All non-financial member information is readable by every authenticated member — but only behind the login wall; nothing is public. | `Member profile!B17` |
| **Tier 3 — Financial confidential** | No member may see another member's financial information. Visible only to the member themselves and to Finance Secretary / President. | `Member profile!B16` |

Layered on top: `Communications!B12` requires **global and field-level opt-out** for both directory visibility and communications. So the effective visibility of any field is:

```
visible(field, viewer) =
      viewer is the record owner
  OR  viewer holds an explicit override permission (e.g. members:read.financial)
  OR ( field.tier == COMMUNITY
       AND owner.fieldVisibility[field] != HIDDEN
       AND owner.directoryOptIn == true )
```

**Revision 9.** RROA-DEV adds four member-wide views: the Wall of Fame (DON-14), the event participant list (EVT-21), the two member maps (HOM-03) and the Top Volunteers list (VOL-06). All four are **Tier 2** community data and sit behind the login wall. None shows an amount. They are new ways for the directory's data to leave the member's profile, so each must honour the directory opt-out and field visibility above (question #37). Document access follows the separate five-level model in §20.4. It sits alongside the three tiers and does not replace them.

**Design consequence:** field-level visibility is data, not code. Every profile field carries a `defaultTier` in master data, and each member holds a `field_visibility` override map. A single `ProfileVisibilityService` must be the only path through which profile DTOs are serialised — do not scatter tier checks across controllers.

### 3.3 Household as a first-class entity

`Member profile!B5`, `!E15`, `Spouse profile!B12` and `Child profile!B6` all pivot on a **Household ID** that links multiple profiles to one physical address. Household is therefore an entity in its own right, not an address string copied onto each member:

- One `Household` has exactly one **Head of House** and 0..n members with a `relationship` of Spouse / Child / Parent / Sibling (`Member profile!F16`).
- Household drives: single-transaction family event registration (`Events!B3`), anniversary/birthday recognition (`Member profile!G17`, `!G18`), chapter attribution and mailing address of record.
- A spouse and each child are **linked profiles** (`Member profile!E31`, `!E32`) — they may or may not have login credentials of their own.

### 3.4 Cultural data model (do not genericise these)

The workbook is explicit that this CRM must capture cultural nuance (`Member profile!B1`). These are **not** optional decorations:

| Concept | Field | Note |
|---|---|---|
| Honorific | Kunwar, Baisa, Banna (`Member profile!G7`) | Dropdown, gender-linked |
| **Gotra** | Lineage-based classification (`!E9`) | Used for badge printing (`Events!D9`) and audience segmenting (`Communications!D8`) |
| **Rajput Caste / Sub-Clan** | Sengar, Shaktawat, Rathore, Chauhan… (`!E26`) | **Distinct from Gotra** — the sheet flags this as present on the current form but missing from the new model |
| **Ancestral Village / Thikana** | Native place in Rajasthan (`!E8`) | |
| **Sasural** | Spouse's ancestral thikana (`!E27`) | Only relevant once married |
| **Nanihal** | Mother's ancestral place (`!E28`) | Captured for member and spouse |
| Languages | Hindi, Marwari, Mewari, English (`!E10`) | Multi-select |
| Family history | Long-form lineage narrative (`!E29`) | |

Gotra, Caste and Thikana are all admin-maintained dropdowns (`Administration!B5`) — never free text, or segmentation and badge printing break.

---

## 4. Module MP — Member Profile & Household

> **Purpose:** the system of record for every person in the community. Every other module reads from it.
> **Source tabs:** `Member profile`, `Spouse profile`, `Child profile`.

### 4.1 Data model

#### `member` (primary member record)

| Category | Field | Type | Required | Notes / Source |
|---|---|---|---|---|
| Biographical | Full legal name (first, middle, last) | Text | Yes | `!E6` |
| Biographical | Honorific / Title | Enum (MDM) | No | Kunwar, Baisa, Banna — `!E7` |
| Biographical | Gender | Enum | Yes | Male, Female — `!E25` |
| Biographical | Ancestral Village / Thikana | Text (MDM-assisted) | Yes | `!E8` |
| Biographical | Gotra / Clan | Enum (MDM) | Yes | `!E9` |
| Biographical | Rajput Caste / Sub-Clan | Enum (MDM) | Yes | `!E26` — distinct from Gotra |
| Biographical | Sasural (spouse's thikana) | Text | Conditional | Required only if married — `!E27` |
| Biographical | Nanihal (mother's place) | Text | No | `!E28` |
| Biographical | Languages | Multi-select (MDM) | No | `!E10` |
| Biographical | Family history / background | Long text | No | `!E29` |
| Contact | Email address | Email (unique, case-insensitive) | Yes | **Mandatory for account creation** — it is the login identifier, the verification-code destination and the primary comms point. No account may exist without one — `!E11` + **[NEW]** |
| Contact | Phone / WhatsApp | Phone (E.164) | Yes | Broadcast target — `!E12` |
| Contact | Home address | Structured address | Yes | `!E14` |
| Contact | US Chapter | FK → `chapter` | Auto | Auto-assigned from state — `!E13`, `Member profile!B9` |
| Household | Household ID | FK → `household` | Yes | `!E15` |
| Household | Relationship | Enum | Yes | Head of House, Spouse, Child, Parent — `!E16` |
| Household | Date of birth | Date | Yes | Youth/senior tracking — `!E18` |
| Household | Wedding date | Date | Conditional | Anniversary recognition — `!E17` |
| Professional | Industry / Field | Text (MDM-assisted) | No | `!E19` |
| Professional | Job title | Text | No | `Member profile!B10` |
| Professional | Skills / Expertise | Multi-select + text | No | Mentorship matching — `!E20` |
| Professional | Education & professional achievements | Long text | No | `!E30` |
| Professional | LinkedIn URL, Facebook URL | URL | No | **Only if member approves** — `Member profile!B10` |
| Membership | Membership tier | Enum | Yes | Annual, Lifetime, Youth, Associate — `!E21` |
| Membership | Join date | Date | Auto | `!E22` |
| Membership | Volunteer interests | Multi-select | No | Events, Tech, Food, Fundraising, Youth mentoring — `!E23`, `Member profile!B13` |
| Membership | Member ID (public) | Generated | Auto | Issued on approval — `Registration!D18` |
| Membership | Status | Enum | Auto | Pending-Email-Verification / Pending / In-Review / Approved-Awaiting-Payment / Active / Rejected / Archived — `Registration!J4-J8` + **[NEW]** |
| Membership | `is_approved` | Boolean | Auto | Set true **only** by an admin approval decision (REG-09). Never self-serviceable — **[NEW]** |
| Membership | `is_payment_made` | Boolean | Auto | True when the membership payment for the selected tier settles, or when an admin overrides it (REG-16) — **[NEW]** |
| Membership | `is_active` | Boolean (derived) | Auto | **`is_email_verified AND is_approved AND is_payment_made AND status != Archived`.** Not directly writable by anyone — **[NEW]** |
| Membership | `payment_override_by` / `_reason` / `_at` | FK + Text + Timestamp | Conditional | Populated only when `is_payment_made` was set by admin override; reason mandatory — **[NEW]** |
| Membership | `activated_at` | Timestamp | Auto | Set when **all three** gates first close; drives the welcome email (REG-10) — **[NEW]** |
| Verification | `is_email_verified` | Boolean | Auto | True once the applicant follows the emailed verification link and confirms (REG-21). Set **only** by the verification flow or an admin override (REG-23); resets to false if the email address is changed — **[NEW]** |
| Verification | `email_verified_at` | Timestamp | Conditional | When the verification link was confirmed — **[NEW]** |
| Verification | Verification links | → `verification_token` | Auto | Transient token state is **not** held on the member row — it lives in the shared `verification_token` entity below, which serves verification, credential setup and password reset (IAM-18) — **[NEW]** |
| Finance | Total donations | Currency (derived) | Auto | Aggregate, **Tier 3 confidential** — `!E24` |
| Verification | Reference contacts ×2 (name + phone) | Text | Conditional | Two vouching Rawla members — `!E33` |
| Verification | Offline verification flag | Boolean | No | References supplied offline via membership secretary — `!E34` |
| Security | Password | Hashed + salted | Yes | Never stored or shown in plain text — `!E35` |

#### `household`
`id`, `household_id` (public), `head_member_id`, `address` (structured), `chapter_id`, `anniversary_date`, `created_at`.

#### `spouse_profile` — linked record, `Spouse profile` tab
Full legal name; Rajput Caste (may differ from the member's — `Spouse!D5`); Gotra; Ancestral place/Thikana; Nanihal; Family history; Email (optional); Phone/WhatsApp; Household ID (inherited); Relationship = fixed `Spouse`; Date of birth; Wedding date (shared with primary record); Industry/Field; Education & professional achievements.

#### `child_profile` — linked record, `Child profile` tab
Full legal name; Gender; Household ID (inherited); Relationship = fixed `Child`; Date of birth; **Child sequence** (order among siblings — the current form supports up to 3, `Child!D9`); Education level/grade; Educational & professional achievements (**feeds auto-generated certificates**, `Child!D11`); Membership tier auto-derived as `Youth` from DOB (`Child!D12`).

#### `life_event`
`member_id`, `type` (Birth, Wedding, Anniversary, Death **[NEW]**), `event_date`, `notes`, `recognised_at` — `Member profile!B6`.

#### `verification_token` **[NEW]** — one mechanism, several purposes

A single short-lived credential type backing every "we emailed you a link" flow. Owned by IAM (IAM-18), consumed by REG.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `member_id` | FK → `member` | Nullable — an application may pre-date the member row |
| `destination` | Email (normalised) | Where the link was sent; the token is bound to it |
| `purpose` | Enum | `email_verification`, `credential_setup`, `password_reset` (extensible: `mfa`, phone/WhatsApp) |
| `token_hash` | Hash | The token is **≥128 bits of cryptographic randomness**, URL-safe, and **stored hashed**. The clear token exists only inside the emailed URL — never in the database, logs, sent-mail table or audit trail |
| `expires_at` | Timestamp | Per-purpose TTL (ADM-12) |
| `consumed_at` | Timestamp | **Single-use** — set when the applicant confirms |
| `created_at`, `last_sent_at`, `created_ip` | Timestamp, Timestamp, IP | Throttling and abuse forensics |

**`purpose` is part of the redemption check, not a label.** A token issued for `email_verification` must be rejected by the password-reset endpoint and vice versa — otherwise the lower-assurance flow becomes an account-takeover path into the higher-assurance one. Tokens are single-use and invalidated by: redemption, expiry, issue of a newer token for the same `(destination, purpose)`, and — for `password_reset` — any successful password change by another route.

**A link carries its secret in a URL, so three rules follow.** They are requirements, not implementation notes:

1. **The emailed link never consumes the token.** `GET` renders a confirmation page; the token is spent only by the `POST` behind an explicit button. Corporate mail scanners and link prefetchers (Safe Links, gateway rewriters, antivirus) follow every URL in an email automatically — a token consumed on `GET` is burned before the member ever sees it, and the flow fails for exactly the corporate mailboxes least able to diagnose it.
2. **The token must not leak sideways.** Landing pages send `Referrer-Policy: no-referrer`, carry no third-party scripts or trackers, and are excluded from query-string logging; the token is stripped from the address bar (`replaceState`) once consumed, so it does not survive in browser history or a shared screenshot.
3. **The landing page stands alone.** A mail app may open the link in a different browser, or on a different device, from the one where registration started — the page must complete the flow from the token alone, with no dependence on the original session or tab.

### 4.2 Functional requirements

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| MP-01 | Member management module | Create, read, update and archive member profiles carrying every field in §4.1. | High* | `!B3` |
| MP-02 | Tabular search | Members listed in a table searchable/filterable by any field (name, chapter, gotra, caste, tier, skills, village, status). | High* | `!B4` |
| MP-03 | Detail page | Each member has a full detail page showing the information the list view cannot hold. | High* | `!B4` |
| MP-04 | Household linkage | Link multiple profiles to one physical address with relationship = Spouse / Child / Parent / Sibling. | High* | `!B5` |
| MP-05 | Life-event tracking | Record and surface births, weddings and anniversaries; feed the recognition/greeting engine. | High* | `!B6` |
| MP-06 | Verified contact info | Email, mobile and WhatsApp must be **verified** before being used for broadcasts. Email verification is the mandatory emailed-link flow of REG-21 and is a precondition for the account existing at all; phone/WhatsApp OTP remains a separate, post-activation step. | High* | `!B7` |
| MP-07 | Geographic networking | Surface members by location to promote networking and geographic sub-chapters. | Med* | `!B8` |
| MP-08 | Auto chapter assignment | Derive the US Chapter from the member's state at save time; admin may override. | High* | `!B9` |
| MP-09 | Professional profile | Capture industry, job title and skills for mentorship/sponsorship; link LinkedIn and Facebook **only with the member's explicit approval**. | Med* | `!B10` |
| MP-10 | Membership tier | Assign Annual / Lifetime / Youth / Associate based on the selection made at profile creation. | High* | `!B11` |
| MP-11 | Donation history on profile | Show the member's own giving history and tax receipts, sourced from DON/TAX. | High* | `!B12` |
| MP-12 | Volunteer interests | Capture Event planning, Youth mentoring, Food prep, Tech support; consumed by VOL skill matching. | High* | `!B13` |
| MP-13 | Attendance log | History of RRA conventions and local meetups attended, written by EVT check-in. | Med* | `!B14` |
| MP-14 | Self-service editing | Only the member may edit their own core profile details. | High* | `!B16` |
| MP-15 | Financial confidentiality | No member may view another member's financial information. | High* | `!B16` |
| MP-16 | Authenticated-only visibility | All member information sits behind the auth wall; non-financial fields are read-only-visible to authenticated members. | High* | `!B17` |
| MP-17 | Spouse linked profile | Create/maintain one spouse record per household with the `Spouse profile` field set. | High* | `Spouse!A1` |
| MP-18 | Child linked profiles | Create/maintain multiple child records with sequence ordering; auto-derive Youth tier from DOB. | High* | `Child!A1`, `Child!D12` |
| MP-19 | Field-level privacy controls | Member can mark individual fields hidden from the directory; a global directory opt-out exists. | High | `Communications!D12` |
| MP-20 | Profile completeness indicator **[NEW]** | Show a completion score prompting members to fill lineage/professional data — the workbook's stated goal is to "improve usage of portal" (`!B15`). | Low* | inferred |
| MP-21 | Merge duplicates **[NEW]** | Admin tool to merge two member records, re-pointing donations, registrations and volunteer hours. | Med* | inferred from `Registration!D4` |
| MP-22 | Triple-gate activation **[NEW]** | A member is active **only** when email verification, admin approval and membership payment have *all* landed. `is_active` is computed from `is_email_verified && is_approved && is_payment_made && status != Archived` — it is never a stored, independently settable flag. The gates may close in any order; the account activates when the last one closes. | High | customer requirement |
| MP-23 | Minimum age for account creation **[NEW]** | A person may not create a member profile with a login below the configured minimum age (default **18**, see ADM-09). Age is computed from Date of birth at submission time. Linked `child_profile` records under that age remain permitted — they are dependants in a household, not account holders (see IAM-13). | High | customer requirement |
| MP-24 | Email verification flag **[NEW]** | `is_email_verified` is carried on the member record, shown to admins on the member detail and list views, and is the third activation gate (MP-22). Changing a member's email address — by self-edit or admin edit — clears the flag and re-triggers verification (REG-22); a member whose email is unverified is not a valid broadcast target (MP-06). | High | customer requirement |
| MP-25 | Up to five children **[NEW — Rev 9]** | A member can hold up to **5** children on their profile. The join form, which allows 3 today, must allow 5 as well. Whether 5 is also a hard cap after sign-in, where there is currently no cap, is question #34. Spouse and children added or edited after joining appear straight away, with no approval (`RROA-DEV!M1`, `!M3`, covered by MP-17/MP-18). | High | `RROA-DEV!M2` |
| MP-26 | Only an Admin removes family **[NEW — Rev 9]** | A member may add and edit their spouse and children, but **only an Admin** may remove one from a profile. Removal is audited (AUD) with actor and reason. This conflicts with today's self-service `DELETE` endpoints (§25.3.1, question #35). | Low | `RROA-DEV!M4` |
| MP-27 | Single volunteer-interest option **[NEW — Rev 9]** | The profile carries **one** yes/no option showing interest in volunteering. RROA-DEV says it *replaces* the list of specific interests. MP-12 is kept as written, and #38 asks whether the multi-select is retired or kept alongside. | Not given | `RROA-DEV!V1` |

### 4.3 API surface (`/api`)

```
GET    /members                     list + filter + paginate      (members:read)
GET    /members/:id                 detail, tier-filtered          (members:read)
PATCH  /members/:id                 self-edit or admin override    (members:write.self | members:write)
GET    /members/me                  current member's full record
PATCH  /members/me/privacy          field visibility + opt-outs
GET    /members/:id/donations       Tier-3 gated                   (self | donations:read)
GET    /members/:id/attendance
GET    /households/:id
POST   /households/:id/spouse
POST   /households/:id/children
PATCH  /households/:id/relationships
GET    /life-events?window=30d      upcoming birthdays/anniversaries
```

### 4.4 Screens

`/members` (searchable table with saved filters and CSV export — with an activation-state filter and a visible Approved/Paid pair of badges per row), `/members/:id` (tiered detail view; admin payment-override control with reason prompt), `/members/me` (self-edit with household tab), `/members/me/privacy`, `/verify-email?token=…` → `/set-password`, and `/forgot-password` → `/reset-password?token=…` (public token landing pages: an explicit confirm button, a resend path for an expired or already-used link, and a masked destination address — one shared component across all three purposes), `/members/me/status` (applicant view: the three gates as a checklist — verified / approved / paid — with the action for whichever is outstanding), `/households/:id` (family tree view showing spouse + children), `/admin/settings/activation` (minimum age, dues per tier, reminder interval — ADM-11).

### 4.5 Acceptance criteria

- A member editing another member's profile receives 403, and the UI never renders the edit control.
- `totalDonations` is absent from the serialised payload for any viewer lacking `donations:read` who is not the record owner — verified at the DTO level, not just hidden in the UI.
- Saving a member with a Texas address without an explicit chapter results in `chapter = Texas`.
- Creating a child with DOB < 18 years ago yields `membershipTier = Youth` automatically.
- Searching the member table by Gotra returns only members of that Gotra, in ≤ 1.5 s for the full member base.
- A member with `is_email_verified = false` has `is_active = false` regardless of approval and payment.
- Changing a member's email address sets `is_email_verified = false`, drops `is_active` to false, and issues a fresh code to the new address — the old address receives a change notification.
- A member with `is_approved = true` and `is_payment_made = false` has `is_active = false`, is absent from `GET /directory`, and cannot reach any authenticated member feature beyond the payment and status pages.
- `PATCH /members/:id` with `isActive` in the body is rejected (400) — the field is derived and read-only on every write path.
- Archiving an approved, paid member flips `is_active` to false without clearing `is_approved` or `is_payment_made`, so reinstatement does not require re-payment.
- A registration submitted with a Date of birth giving an age of 17 years 364 days is rejected; 18 years exactly is accepted (with the default configuration).
- **[Rev 9]** A member can add a fifth child on `/join` or on My profile. A sixth is refused, if #34 confirms a hard cap.
- **[Rev 9]** A member calling a remove-spouse or remove-child endpoint receives 403. An Admin removing one writes exactly one audit row carrying a reason.

---

## 5. Module REG — Registration & Onboarding Workflow

> **Purpose:** convert an interested Rajput family into a vetted, active member.
> **Source tab:** `Member Registration process` (Intake and Approval categories; Security/Recovery rows belong to IAM).

### 5.1 The status machine

`Registration!H3-J8` defines the canonical lifecycle. Implement it as an explicit state machine — not as boolean flags. **Diagrams of the whole flow, including every failure and deactivation path, are in §5.5.**

| Stage | Action | Gate flags | Resulting status |
|---|---|---|---|
| Age check | Form validates Date of birth against the configured minimum age (ADM-09) | — | **Blocked** if under age — no record is created **[NEW]** |
| Submission | User fills form (email mandatory) | all three flags `false` | **Pending — Email Verification** **[NEW]** |
| Email verification + password | System emails a verification link; the applicant opens it and confirms, then sets their password in the same proven session (IAM-01) | `is_email_verified = true` | **Pending** — the application only now enters the vetting queue **[NEW]** |
| Vetting | Admin reviews | — | **In-Review** |
| Approval | Admin clicks Approve | `is_approved = true` | **Approved — Awaiting Payment** **[NEW]** |
| Payment | Member pays membership dues, **or** an admin overrides the flag (REG-16) | `is_payment_made = true` | **Active** once *both* gates are true **[NEW]** |
| Recovery | User resets password via an emailed link (IAM-05) | gates unchanged; `is_email_verified` may flip true (§6.2) | **Active (Secured)** |
| Departure | Admin deactivates | flags retained | **Archived** (`is_active = false`) |

**Activation is a conjunction, not a sequence.** `is_active` is derived — never stored as an independently settable flag:

```
is_active = is_email_verified
        AND is_approved
        AND is_payment_made
        AND status NOT IN (Rejected, Archived)
```

The gates may close in any order and the account activates when the last one closes. Two ordering notes:

- **Email verification is the one gate with a natural position** — it comes first, because an unverified application should not consume a reviewer's time and the address has not been proven reachable. Applications sitting in **Pending — Email Verification** stay out of the vetting queue (REG-09) and out of every notification audience.
- **Approval and payment remain order-independent.** A member who pays at submission activates the moment an admin approves; a member approved before paying sits in **Approved — Awaiting Payment** and activates the moment payment settles.

No single flag activates an account, and clearing any of them on a live member — email changed (MP-24), payment refunded or charged back, approval revoked — immediately drops `is_active` to false.

Additional transitions required by `Registration!D17` but absent from the table: **Rejected** and **Info-Requested** (returns to the applicant, then back to In-Review on resubmission). **[NEW]**

### 5.2 Functional requirements

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| REG-01 | Public web form | Mobile-responsive registration page reachable **without** login. Must collect the full member field set plus spouse and up to 3 children. | High | `!B3` |
| REG-02 | Duplicate prevention | Check for an existing email/phone record **before** allowing submission; block with a "you may already be registered" recovery path. | High | `!B4` |
| REG-03 | Legal consent | Mandatory checkboxes for Community Guidelines and Privacy Policy; store version + timestamp of what was accepted. | High | `!B5` |
| REG-04 | Submission alert | Automated "Application Received" email on form completion — this is a **separate** message from the verification email (REG-21) and is sent once the link is followed, so an unverified address receives only the verification mail. | Med | `!B6` |
| REG-05 | Reference capture | Collect name + phone of two Rawla members who vouch for the applicant. | High* | `Member profile!E33` |
| REG-06 | Offline verification flag | Allow the applicant/secretary to mark that references will be supplied offline, bypassing the two-reference requirement. | Med* | `Member profile!E34` |
| REG-07 | Pending status | New users enter "Pending Review" and are **hidden from the member directory**. | High | `!B15` |
| REG-08 | Admin alerts | Real-time Email/SMS notification to the Membership Secretary on each new application. | High | `!B16` |
| REG-09 | Vetting workflow | Admin queue with Approve / Reject / Request More Info, reviewer notes, and reference-check checkboxes. | High | `!B17` |
| REG-10 | Welcome trigger | Approval fires an "Official Welcome" email carrying the assigned Member ID. | Med | `!B18` |
| REG-11 | Approval audit log | Record admin ID, action taken and timestamp for **every** approval decision; append-only. | High | `!B19` |
| REG-12 | Password setup handoff **[REVISED]** | On submission the applicant receives **one** email carrying the verification link. Following it verifies the address and opens password creation in the same session (IAM-01); returning later re-issues a `credential_setup` link. An application with a verified address but no password set is a distinct, visible state in the admin queue. | High | `!B7` |
| REG-13 | Applicant status page **[NEW]** | Applicant can log in to a minimal view showing status and any "more info" request. | Med* | inferred from `!D17` |
| REG-14 | Chapter routing **[NEW]** | Route the application to the Chapter Lead of the applicant's state in addition to the Membership Secretary. | Med* | inferred from `Administration!D4` |
| REG-15 | Dual-gate activation **[NEW]** | Admin approval alone does **not** activate an account. Approval sets `is_approved`; a settled membership payment sets `is_payment_made`; the account becomes active only when both are true (MP-22). Approval and payment may happen in either order. | High | customer requirement |
| REG-16 | Admin override of payment status **[NEW]** | A user holding `registration:payment.override` (Membership Secretary / Finance Secretary / President) may set or clear `is_payment_made` manually — for cheque, Zelle, cash, waived dues, honorary and complimentary memberships. The override requires a **mandatory reason**, records actor + timestamp on the member record, and writes an audit row (REG-11). Clearing the flag on an active member deactivates them. Members can never set this flag for themselves. | High | customer requirement |
| REG-17 | Minimum-age gate **[NEW]** | The public form rejects a Date of birth below the configured minimum age (default **18**, ADM-09) with a clear message, before any record is written. Enforced **server-side** on `POST /public/registrations`, not only by client-side form validation. Age is evaluated at submission date. | High | customer requirement |
| REG-18 | Payment step in onboarding **[NEW]** | The applicant sees the dues amount for their selected membership tier and a pay-now action (routed through DON's payment provider); receipts and the resulting flag update are idempotent against provider webhook retries. Lifetime vs. Annual tier pricing comes from master data (ADM-01). | High | customer requirement |
| REG-19 | Awaiting-payment reminders **[NEW]** | Automated reminder to members stuck in **Approved — Awaiting Payment** after a configurable interval, plus an admin queue view of that cohort. | Med | inferred from REG-15 |
| REG-20 | Email mandatory for account creation **[NEW]** | An email address is required to register — it is the login identifier and the verification destination. Validated for syntax and uniqueness (case-insensitive) at submission; disposable-domain blocking is optional and configurable. No account may be created, by self-registration or by an admin, without one. | High | customer requirement |
| REG-21 | Email verification link **[REVISED]** | On submission the system emails a **verification link** to the supplied address; the applicant opens it and confirms to verify. The token is **≥128 bits of cryptographic randomness**, stored **hashed**, and never written to logs, sent-mail tables or the audit trail in clear. Confirming sets `is_email_verified = true`, consumes the token, and moves the application into the vetting queue. Issued and redeemed through the shared verification-token service (IAM-18) with `purpose = email_verification`. | High | customer requirement |
| REG-22 | Link lifecycle: expiry, single use, resend **[REVISED]** | Verification links **expire after 24 hours** (configurable, ADM-12) and are **single-use**; issuing a new link invalidates the previous one. **Resend throttled** to 1 per 60 s and 5 per hour per address, enforced **server-side, per-address and per-IP**, so the endpoint cannot be used to enumerate accounts or as an email-bombing relay. Opening the link (`GET`) never consumes the token — only the confirm `POST` does (see §4.1), so a mail scanner cannot burn it. No attempt counter is needed: a 128-bit token has no guessing surface. | High | customer requirement |
| REG-23 | Admin verification override **[NEW]** | A user holding `registration:email.override` may mark an address verified manually — for members onboarded in person or behind a mail filter that strips links. Mandatory reason, actor and timestamp recorded on the member record, one audit row written (REG-11). Members can never set this flag for themselves. | Med | inferred from REG-16 parity |
| REG-24 | Unverified-application housekeeping **[NEW]** | Applications that remain unverified for a configurable window (default **7 days**) receive one reminder carrying a fresh link and are then purged, releasing the email address for re-registration. Purge is a hard delete, not an archive — no vetting decision was ever made on the record. | Med | inferred from REG-21 |

### 5.3 API surface

```
POST   /public/registrations                 anonymous submit (email required)
POST   /public/registrations/check-duplicate email/phone probe
GET    /verify-email?token=...               landing page — does NOT consume the token
POST   /public/registrations/verify-email    { token } → is_email_verified + setup ticket
POST   /public/registrations/resend-link     throttled; always returns 202 (no enumeration)
POST   /members/:id/email-verification       admin override, reason required
                                                                    (registration:email.override)
GET    /registrations?status=pending         vetting queue        (registration:read)
POST   /registrations/:id/approve            → Active + Member ID (registration:approve)
POST   /registrations/:id/reject             reason required      (registration:approve)
POST   /registrations/:id/request-info       message to applicant (registration:approve)
POST   /registrations/:id/payment-status     set/clear is_payment_made, reason required
                                                                    (registration:payment.override)
GET    /registrations?status=awaiting-payment approved-but-unpaid cohort (registration:read)
POST   /public/registrations/:id/checkout    start dues payment for the selected tier
POST   /webhooks/payments/membership         provider callback → is_payment_made (idempotent)
GET    /public/config/registration           public: minimum age, tiers + dues amounts
GET    /registrations/:id/audit              append-only history
```

`POST /registrations/:id/approve` sets `is_approved` and allocates the Member ID; it activates the account **only** if `is_payment_made` is already true.

### 5.4 Acceptance criteria

- A pending applicant does not appear in `GET /directory` under any filter.
- Submitting the public form without an email address returns a validation error and creates no record.
- Submission sends exactly one verification email; the token differs across two consecutive submissions and appears nowhere in the application logs, the sent-mail table or the audit trail.
- An unverified application is absent from `GET /registrations?status=pending` — reviewers never see it.
- Issuing a `GET` against the emailed link — as a mail scanner would — leaves the token unconsumed and still usable by the member afterwards.
- A link opened at hour 25 is rejected as expired, and the page offers a resend rather than a dead end.
- Requesting a resend invalidates the prior link — the prior link then fails even inside its own expiry window.
- A consumed link opened a second time is rejected, and the token is absent from the address bar after the first confirmation.
- The verification landing page emits `Referrer-Policy: no-referrer` and loads no third-party script.
- `POST /public/registrations/resend-link` returns the same 202 response and timing envelope for a registered and an unregistered address.
- Approving an application in one transaction: sets `is_approved`, allocates a Member ID, and creates the household — a failure in a downstream notification step must not roll back the approval.
- Approving an **unpaid** application leaves `is_active = false` and status `Approved — Awaiting Payment`; the welcome email (REG-10) fires only when the second gate closes.
- Marking payment received on an application that is still `Pending` sets `is_payment_made` but leaves `is_active = false`.
- The account flips to Active exactly once, on whichever of the two gates closes second, in either order.
- An admin setting `is_payment_made` without a reason receives 400; with a reason, exactly one audit row is written carrying actor, action, target, timestamp, reason and before/after values.
- A non-privileged member calling `POST /registrations/:id/payment-status` — including on their own record — receives 403.
- Clearing `is_payment_made` on an active member (chargeback) drops them out of `GET /directory` on the next request.
- `POST /public/registrations` with a Date of birth under the configured minimum age returns a validation error and creates **no** row, even when the client-side check is bypassed.
- Changing the minimum age in admin settings does not retroactively deactivate existing members.
- Every approve/reject/request-info/payment-override writes exactly one immutable audit row containing actor, action, target, timestamp and reason.
- Submitting with an email that already exists returns a duplicate error and does **not** create a record.

---

### 5.5 End-to-end flow diagrams **[NEW]**

Five views of the same machine. Diagram 1 is the path a real applicant walks; 2 is the status lifecycle behind it; 3 is the emailed-link mechanism shared by all three credential flows; 4 is what a blocked login is told; 5 is how an active member stops being active.

#### 5.5.1 Account creation — the full path

```mermaid
flowchart TD
    A(["Visitor opens the public registration form"]) --> B["Fills the form: name, DOB, email, phone,<br/>address, tier, references, spouse, children"]

    B --> C{"Age check<br/>REG-17 / IAM-15"}
    C -->|"Below configured minimum<br/>ADM-09, default 18"| C1["Blocked. No record created.<br/>Message names the age rule.<br/>Re-checked server-side, not only in the form"]
    C -->|"At or above the minimum"| D{"Email supplied and well formed?<br/>REG-20"}
    D -->|"No"| D1["Validation error. No record created.<br/>Email is the login identity — there is no account without one"]
    D -->|"Yes"| E{"Email or phone already on file?<br/>REG-02"}
    E -->|"Yes"| E1["'You may already be registered'<br/>routed to the forgot-password flow"]
    E -->|"No"| F{"Guidelines + Privacy Policy accepted?<br/>REG-03"}
    F -->|"No"| F1["Submission blocked"]
    F -->|"Yes"| G["Application created<br/>status = Pending - Email Verification<br/>is_email_verified / is_approved / is_payment_made all false"]

    G --> H["Token issued: purpose = email_verification<br/>128-bit random, hashed at rest, TTL 24 h<br/>REG-21 / IAM-18"]
    H --> I["One transactional email sent, carrying the link"]

    I --> SCAN{"Who opens the link first?"}
    SCAN -->|"Mail scanner or prefetcher follows the URL"| SCAN1["GET renders the page.<br/>Token NOT consumed — it survives for the member<br/>REG-22"]
    SCAN1 --> J
    SCAN -->|"Member opens it, possibly on another<br/>device or in a different browser"| J{"Member clicks Confirm.<br/>POST consumes the token"}

    J -->|"Expired after 24 h"| J3["Rejected. Page offers a resend<br/>rather than a dead end"]
    J -->|"Already consumed, or superseded by a newer link"| J2["Rejected as spent"]
    J2 --> RS{"Resend requested?<br/>REG-22"}
    J3 --> RS
    RS -->|"Within throttle: 1 per 60 s, 5 per hour"| H
    RS -->|"Throttled or address unknown"| RS1["202 returned regardless.<br/>No enumeration signal"]
    RS -->|"Never returns"| RS2["Unverified for 7 days: one reminder with a fresh link,<br/>then hard purge. Address released for re-use<br/>REG-24 / ADM-12"]
    RS2 --> X1(["Application gone. No vetting decision was ever made"])

    J -->|"Valid"| K["is_email_verified = true. Token consumed.<br/>Token stripped from the address bar.<br/>Setup ticket returned, 5 min TTL, single use"]
    K --> L["Applicant sets their password<br/>IAM-01: never inline on the public form —<br/>only after control of the address is proven. IAM-02 complexity"]
    L -.->|"Tab closed, returns later"| L1["Requests a credential_setup link<br/>TTL 24 h — it arrived unprompted with the registration mail"]
    L1 --> L

    L --> M["status = Pending. 'Application Received' email, REG-04.<br/>Application enters the vetting queue"]
    M --> N["Membership Secretary and the applicant's Chapter Lead alerted<br/>REG-08 / REG-14"]

    N --> O{"Admin review<br/>REG-09"}
    O -->|"Request more info"| O1["status = Info-Requested. Message to the applicant"]
    O1 --> O2["Applicant resubmits"]
    O2 --> O
    O -->|"Reject with reason"| O3["status = Rejected. Audit row written, REG-11"]
    O3 --> X2(["Not a member. Re-apply path offered"])
    O -->|"Approve"| P["is_approved = true. Member ID allocated.<br/>Household created. Audit row written.<br/>Approval alone does NOT activate — REG-15"]

    P --> Q{"Was payment already settled?"}
    Q -->|"Yes — paid at submission"| Z
    Q -->|"No"| T["status = Approved - Awaiting Payment.<br/>Can authenticate; cannot use the portal"]

    T --> U{"Dues settled?<br/>REG-18"}
    U -->|"Member pays via checkout.<br/>Provider webhook, idempotent on retries"| V["is_payment_made = true"]
    U -->|"Admin override: cheque, Zelle, cash, waived, honorary.<br/>Mandatory reason + actor + timestamp + audit row, REG-16"| V
    U -->|"Payment kill-switch enabled, ADM-11"| V
    U -->|"Not yet"| U1["Reminder after the configured interval, REG-19.<br/>Visible as an admin cohort"]
    U1 --> U

    V --> Z{"is_email_verified AND is_approved AND is_payment_made<br/>AND status not Rejected/Archived?"}
    Z -->|"No"| ZB["Stays inactive. Login returns the specific<br/>blocking reason — see diagram 4"]
    Z -->|"Yes"| ZA["is_active = true. activated_at stamped.<br/>Official Welcome email carrying the Member ID, REG-10.<br/>Now visible in the directory, DIR-09"]
    ZA --> X3(["Active member"])
```

The three gates close in **any order** — the account activates on whichever closes last. Email verification is first only because an unverified application should never reach a reviewer.

#### 5.5.2 Status lifecycle

```mermaid
stateDiagram-v2
    state "Pending - Email Verification" as PEV
    state "Pending" as PEN
    state "In-Review" as REV
    state "Info-Requested" as INF
    state "Rejected" as REJ
    state "Approved - Awaiting Payment" as AAP
    state "Active" as ACT
    state "Active (Secured)" as ACS
    state "Archived" as ARC

    [*] --> PEV : form submitted, age and email valid
    PEV --> PEN : code redeemed, password set
    PEV --> [*] : unverified 7 days, hard purge
    PEN --> REV : reviewer opens it
    REV --> INF : more information requested
    INF --> REV : applicant resubmits
    REV --> REJ : rejected with reason
    REV --> AAP : approved, dues unpaid
    REV --> ACT : approved, dues already paid
    AAP --> ACT : payment settles, or admin override
    ACT --> ACS : password reset completed
    ACS --> ACT
    ACT --> AAP : refund or chargeback clears is_payment_made
    ACT --> ARC : admin deactivates
    ARC --> ACT : reinstated - flags retained, no re-payment
    REJ --> [*]
```

Status and activation are **separate**: status is where the application sits, `is_active` is the derived conjunction of the three flags. A member can hold status `Active` and still be inactive — see diagram 5.

#### 5.5.3 The link mechanism — one service, three purposes

```mermaid
sequenceDiagram
    autonumber
    participant U as Applicant / Member
    participant P as Portal
    participant VT as Verification-token service IAM-18
    participant M as Transactional mail NTF
    participant S as Mail scanner / prefetcher

    U->>P: Registers, or asks to set/reset a password
    P->>VT: Issue token for destination + purpose
    Note over VT: purpose = email_verification (24 h)<br/>credential_setup (24 h)<br/>password_reset (20 min)<br/>128-bit random, stored HASHED
    VT->>M: Send link — non-suppressible, bypasses<br/>broadcast preferences and quiet hours
    M-->>U: One email. The clear token exists only in this URL
    VT-->>P: 202 always — identical body and timing<br/>whether or not the address is registered (IAM-20)

    opt Gateway inspects the mail
        S->>P: GET the link automatically
        P-->>S: Landing page only. Token NOT consumed
    end

    U->>P: Opens the link, clicks Confirm
    P->>VT: Redeem token for that purpose
    Note over VT: Checks: purpose matches, not expired, not consumed.<br/>A verification token is INVALID for reset — and vice versa

    alt Token valid
        VT-->>P: Single-use ticket, 5 min, bound to member + token + the one action
        P->>U: Password form (setup or reset). Token stripped from the URL.<br/>No-referrer, no third-party scripts
        U->>P: New password, spends the ticket
        Note over P: Reset also: revokes every session and refresh token (IAM-19),<br/>clears any IAM-07 lockout, emails a "password changed" notice.<br/>Any redemption sets is_email_verified — same proof of address control
    else Expired or already consumed
        VT-->>P: Rejected. The page offers a resend. A newer link kills every older one
    end
```

#### 5.5.4 What a blocked login is told — precedence ladder

```mermaid
flowchart TD
    L(["POST /auth/login, or any gated API call"]) --> C{"Do the credentials verify?"}
    C -->|"No"| C1["401 INVALID_CREDENTIALS<br/>Uniform timing. No gate detail whatsoever —<br/>otherwise login becomes a membership oracle, IAM-17"]
    C -->|"Yes"| G1{"Locked by failed attempts?"}
    G1 -->|"Yes"| R1["403 ACCOUNT_LOCKED<br/>Wait for auto-expiry, or contact an admin"]
    G1 -->|"No"| G2{"Archived?"}
    G2 -->|"Yes"| R2["403 ACCOUNT_ARCHIVED<br/>Contact the Membership Secretary"]
    G2 -->|"No"| G3{"Rejected?"}
    G3 -->|"Yes"| R3["403 REGISTRATION_REJECTED<br/>Reason shown; re-apply path"]
    G3 -->|"No"| G4{"is_email_verified?"}
    G4 -->|"False"| R4["403 EMAIL_NOT_VERIFIED<br/>Remediation: resend the verification email"]
    G4 -->|"True"| G5{"Information requested by an admin?"}
    G5 -->|"Yes"| R5["403 INFO_REQUESTED<br/>Opens the outstanding request"]
    G5 -->|"No"| G6{"is_approved?"}
    G6 -->|"False"| R6["403 ACCOUNT_PENDING_APPROVAL<br/>Status page and expected review time"]
    G6 -->|"True"| G7{"is_payment_made?"}
    G7 -->|"False"| R7["403 PAYMENT_REQUIRED<br/>Pay-now action with the dues for their tier"]
    G7 -->|"True"| OK(["200 — session issued. Full access per role"])
```

Every 403 also carries the `gates` object, so the client can render "2 of 3 complete" without a second call. The same codes are returned by **every** gated endpoint, not only login, and each blocked attempt is audited with its code.

#### 5.5.5 Losing active status

```mermaid
flowchart LR
    ACT(["is_active = true"]) --> T1["Member changes their email address<br/>MP-24"]
    ACT --> T2["Refund or chargeback<br/>DON reconciliation"]
    ACT --> T3["Admin clears is_payment_made<br/>REG-16, reason mandatory"]
    ACT --> T4["Approval revoked by an admin"]
    ACT --> T5["Admin archives the member"]

    T1 --> F1["is_email_verified = false<br/>Fresh link to the new address.<br/>Old address gets a change notice"]
    T2 --> F2["is_payment_made = false"]
    T3 --> F2
    T4 --> F3["is_approved = false"]
    T5 --> F4["status = Archived. Flags retained,<br/>so reinstatement needs no re-payment"]

    F1 --> D["is_active = false, evaluated per request —<br/>a live JWT does not survive the change, IAM-14"]
    F2 --> D
    F3 --> D
    F4 --> D
    D --> OUT["Dropped from the directory on the next request, DIR-09.<br/>Next API call returns the matching reason code from diagram 4"]
```

---

## 6. Module IAM — Identity, Security & Access

> **Purpose:** authentication, credential lifecycle, session security and role-based authorization.
> **Source rows:** `Member Registration process` Security + Recovery; `Administration` Access + Security.
> **Implementation note:** the monorepo already ships `packages/framework/backend/authentication` (JWT + RBAC + `/api/admin/*`). This module is an **extension**, not a greenfield build.

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| IAM-01 | Triggered credential setup | Password created via a **temporary link emailed after form submission** — never chosen inline on the public form (`Reg!B7`, as originally specified). In the happy path the applicant follows the REG-21 verification link and is taken straight to password creation in that same proven session; an applicant who leaves and returns requests a fresh link with `purpose = credential_setup`. Flow in §6.2. | High | `Reg!B7` |
| IAM-02 | Password complexity | Minimum 8 characters including uppercase, lowercase, number and symbol. | High | `Reg!B8` |
| IAM-03 | MFA | Multi-factor authentication via SMS/Email for admin and special accounts; optional for members. | Med | `Reg!B9` |
| IAM-04 | Credential encryption | Passwords hashed and salted; no plain-text storage anywhere including logs and exports. | High | `Reg!B10`, `Member profile!G35` |
| IAM-05 | Self-service reset | "Forgot Password" on the login page driving an automated recovery flow: request → **link emailed** → open and confirm → set a new password. The same mechanism as email verification, under a different `purpose` (IAM-18). Flow in §6.2. | High | `Reg!B11` |
| IAM-06 | Secure tokens | Reset links unique, single-use, and expiring after **20 minutes** — the workbook's own figure, restored. Tokens carry ≥128 bits of randomness, are stored hashed, are purpose-scoped to `password_reset`, and are consumed only by the confirm `POST`, never by opening the link. | High | `Reg!B12` |
| IAM-07 | Brute-force shield | Temporary account lockout after **5** failed login attempts, with admin unlock and auto-expiry. | High | `Reg!B13` |
| IAM-08 | Secondary identity check | Optional verification using a non-sensitive date (e.g. wedding anniversary) during recovery. | Low | `Reg!B14` |
| IAM-09 | RBAC | Roles: President, Mentor, General Secretary, Finance Secretary, Membership Secretary (+ extensions in §3.1), each mapped to a permission set. | High | `Admin!B3` |
| IAM-10 | Chapter multi-tenancy | Chapter Leads see and manage **only** their US region's data; enforced server-side on every query, not by UI filtering. | High | `Admin!B4` |
| IAM-11 | User impersonation | Admins can "view as" a member to troubleshoot portal issues; every impersonated session is banner-flagged in the UI and written to the audit log; impersonation must **not** grant financial write access. | Med | `Admin!B7` |
| IAM-12 | Session management | Global controls for idle/absolute login timeout and forced organisation-wide password reset. | High | `Admin!B8` |
| IAM-13 | Youth/minor accounts **[NEW]** | Child profiles under 13 must not hold independent login credentials; parent/guardian manages them. Independent of this, **no** person below the configured minimum age (ADM-09, default 18) may create a member account at all — a `child_profile` remains a household dependant record, not a login. | High* | inferred (COPPA exposure from `Child profile`) |
| IAM-14 | Inactive-account authorization **[NEW]** | Authentication succeeds for a member failing any activation gate, but authorization is confined to their own status page, profile self-edit, email verification and the dues payment flow. Every other endpoint returns 403 carrying the **specific** reason code of IAM-16. `is_active` is evaluated **server-side per request** — a session issued while active must not survive a later deactivation, refund, email change or approval revocation. | High | customer requirement |
| IAM-15 | Minimum-age enforcement point **[NEW]** | The age gate lives in the registration service and is re-checked on account creation, not only in the form. Changing the configured minimum age never retroactively deactivates or deletes existing accounts. | High | customer requirement |
| IAM-16 | Explicit blocked-login reason **[NEW]** | A login attempt or API call blocked by an activation gate must tell the caller **which** gate failed, as a stable machine-readable code plus a human message and a remediation action — never a bare "login failed". Contract and precedence in §6.1. | High | customer requirement |
| IAM-17 | Reasons only after authentication **[NEW]** | Gate reasons are disclosed **only once the credentials themselves have verified**. An unknown email or a wrong password returns a single generic `INVALID_CREDENTIALS` with a uniform response time — otherwise the login endpoint becomes a membership-enumeration oracle, which conflicts with the directory being wholly behind the auth wall (`Member profile!B17`). | High | inferred from IAM-16 |
| IAM-18 | Shared verification-token service **[REVISED]** | One service issues, throttles, redeems and audits every emailed credential link, backed by the `verification_token` entity (§4.1). Email verification (REG-21), credential setup (IAM-01) and password reset (IAM-05) are three **purposes** on that service, not three implementations. Redemption always checks `(destination, purpose, token, not expired, not consumed)` — a token is never valid outside the purpose it was issued for. | High | customer requirement |
| IAM-19 | Post-reset session invalidation **[NEW]** | A successful reset **revokes every existing session and refresh token** for that member, so an attacker holding a live session is evicted by the legitimate owner's reset. The member is notified by email that their password changed (to the verified address, with a "wasn't you?" contact path), any account lockout from IAM-07 is cleared, and status moves to **Active (Secured)**. | High | inferred from `Reg!B11`, IAM-12 |
| IAM-20 | Reset-flow abuse resistance **[NEW]** | `POST /auth/password-reset/request` returns the same 202 and timing envelope for a registered and an unregistered address — it must not reveal membership (IAM-17). Throttled per address **and** per IP on the ADM-12 limits shared with REG-22. A password reset **cannot** be initiated from an unauthenticated request against another member's session, and the reset landing page is excluded from referrer, analytics and query-string logging (§4.1). | High | inferred from IAM-17 |

### 6.1 Blocked-login reason contract **[NEW]**

Credentials verify first. If they fail, the response is always `401 INVALID_CREDENTIALS` and nothing more. If they succeed but a gate is closed, the response is `403` with this body shape:

```jsonc
{
  "code": "EMAIL_NOT_VERIFIED",           // stable, machine-readable
  "message": "Verify your email to continue.",
  "remediation": { "action": "resend_code", "href": "/verify-email" },
  "gates": { "emailVerified": false, "approved": false, "paymentMade": false }
}
```

| Code | Cause | Remediation offered |
|---|---|---|
| `INVALID_CREDENTIALS` | Unknown email or wrong password | Retry / forgot password — **no** gate detail (IAM-17) |
| `ACCOUNT_LOCKED` | 5 failed attempts (IAM-07) | Wait for auto-expiry or contact admin |
| `ACCOUNT_ARCHIVED` | Member deactivated | Contact the Membership Secretary |
| `REGISTRATION_REJECTED` | Application rejected | Shows the rejection reason; re-apply path |
| `EMAIL_NOT_VERIFIED` | `is_email_verified = false` | Resend the verification email |
| `ACCOUNT_PENDING_APPROVAL` | `is_approved = false`, still Pending/In-Review | Status page; expected review time |
| `INFO_REQUESTED` | Admin asked for more information | Opens the outstanding request |
| `PAYMENT_REQUIRED` | `is_payment_made = false` | Pay-now action with the dues amount for their tier |

**Precedence** — evaluate top-down and return the **first** matching code, so the member is told the one thing that actually unblocks them next:

```
INVALID_CREDENTIALS > ACCOUNT_LOCKED > ACCOUNT_ARCHIVED > REGISTRATION_REJECTED
    > EMAIL_NOT_VERIFIED > INFO_REQUESTED > ACCOUNT_PENDING_APPROVAL > PAYMENT_REQUIRED
```

The `gates` object is returned alongside so a client can render full progress ("1 of 3 steps complete") without a second call. The same codes are returned by **every** endpoint that IAM-14 blocks, not only `POST /auth/login`, and each blocked attempt is written to the audit log with its code (AUD).

### 6.2 Link-based credential flows **[REVISED]**

Every credential flow — first-time setup, email verification, password reset — is the same emailed link under a different `purpose`. Each is two hops: the member opens the link, then confirms.

```
GET  /verify-email?token=...              landing page; token NOT consumed
POST /public/registrations/verify-email   { token }             → verifies + returns setup ticket
POST /auth/credential-setup/request       { email }             → 202 always; new setup link
POST /auth/credential-setup/confirm       { ticket, password }  → first password set

POST /auth/password-reset/request         { email }             → 202 always (IAM-20)
GET  /reset-password?token=...            landing page; token NOT consumed
POST /auth/password-reset/verify          { token }             → short-lived reset ticket
POST /auth/password-reset/confirm         { ticket, newPassword } → password set, sessions revoked

POST /auth/links/resend                   { email, purpose }    → throttled, 202 always
```

Redeeming a token never hands back the token itself: `verify` returns an opaque, single-use **ticket** (5-minute TTL, bound to the member, the token and the one action it authorises) which the `confirm` step spends. This keeps the token out of the password-submitting request, stops replay if the member abandons the form mid-flow, and means a `credential_setup` ticket cannot be spent on a password *reset* endpoint.

**The happy path sends one email, not two.** Following the verification link returns a setup ticket directly, so the applicant flows verification → password without a second message. A `credential_setup` link exists for the applicant who closes the tab and comes back.

| Parameter | Credential setup | Email verification | Password reset | Configured in |
|---|---|---|---|---|
| Delivery | Emailed link | Emailed link | Emailed link | — |
| Token | ≥128-bit random, URL-safe, hashed at rest | same | same | — |
| TTL | **24 h** | **24 h** | **20 min** (`Reg!B12`) | ADM-12 |
| Consumed by | Confirm `POST` only | Confirm `POST` only | Confirm `POST` only | — |
| Resend cooldown / cap | 60 s / 5 per hour | 60 s / 5 per hour | 60 s / 5 per hour | ADM-12 |
| On redemption | Password set; `is_email_verified = true` | `is_email_verified = true` | Password set; sessions revoked (IAM-19); `is_email_verified = true` | — |

Reset keeps the short 20-minute window because it is an account-takeover vector and is always sent in response to a deliberate request the member is waiting on. Verification and setup get 24 hours because they arrive unprompted with the registration mail, and an applicant who reads their email that evening should not be met with a dead link.

**Rules that apply to reset specifically:**

- **The new password must satisfy IAM-02** and must not equal the current one.
- **Reset does not bypass an activation gate.** A member who resets successfully returns to exactly the gate state they had; if they were unpaid, they are still `PAYMENT_REQUIRED` at the next login (§6.1).
- **Redeeming a reset link proves control of the address**, so it also sets `is_email_verified = true` where it was false, recorded with provenance `password_reset` — **confirmed by the customer**. The proof is identical to REG-21's, and refusing to honour it would strand a member who can demonstrably read their mail. The audit row records which flow closed the gate.
- **IAM-08's secondary identity check** (wedding anniversary), where enabled, is asked **before** a link is issued, not after — it should reduce the mail sent to an address under attack, not merely gate its use.
- A member who is locked out (IAM-07) may still complete a reset; success clears the lockout (IAM-19).

### 6.3 Acceptance criteria

- A reset token used twice, or used at minute 21, is rejected.
- Opening the reset link without confirming leaves the token usable; a mail scanner that follows every URL does not consume it.
- A Chapter Lead calling `GET /members` receives only members whose `chapter_id` matches their own — proven by an API-level test, not a UI check.
- The 6th consecutive failed login within the window locks the account and notifies the member by email.
- An impersonation session cannot issue a refund or edit a donation record.
- A member whose `is_payment_made` is cleared mid-session receives 403 `PAYMENT_REQUIRED` on their next non-exempt API call, without waiting for the JWT to expire.
- Logging in with a correct password on an unverified account returns 403 `EMAIL_NOT_VERIFIED` — not 401, and not a generic failure.
- Logging in with a **wrong** password on that same account returns 401 `INVALID_CREDENTIALS` with no gate detail, and takes the same measured time as a login for an address that was never registered.
- An account failing two gates at once (unverified **and** unpaid) returns `EMAIL_NOT_VERIFIED`, per the precedence order.
- Every blocked-login response carries a remediation action that resolves that specific gate.
- A token issued for `email_verification` is rejected by `POST /auth/password-reset/verify`, and a `password_reset` token is rejected by the email-verification endpoint — proven by test, since this is the mechanism's main abuse surface.
- A reset token used twice, or used after a newer one was issued, is rejected.
- After confirmation the token is gone from the address bar, and the landing page sent `Referrer-Policy: no-referrer`.
- Completing a reset revokes every other live session for that member: a second browser holding a valid JWT receives 401 on its next call.
- `POST /auth/password-reset/request` returns an identical status, body and timing envelope for a registered address and an address that was never registered.
- A reset ticket from step 2 cannot be reused for a second password change, and expires at minute 6.
- A `credential_setup` ticket is rejected by `POST /auth/password-reset/confirm`, and a reset ticket is rejected by the setup endpoint.
- Registering, then following the verification link, leads straight to password creation — the applicant receives exactly **one** email in the happy path.
- Redeeming a password-reset link on a member with `is_email_verified = false` sets the flag, and the audit row names `password_reset` as the closing flow.
- A verification link opened on a different device, in a browser with no prior session, completes the flow from the token alone.
- A member who was `PAYMENT_REQUIRED` before a reset is still `PAYMENT_REQUIRED` after it.

---

## 7. Module CHP — Chapters & Multi-Tenancy

> **Purpose:** model the US regional structure that member assignment, event finance and admin scoping all depend on.
> **Source:** `Administration!B4`, `Member profile!E13`/`!B9`, `Donations!B10`, `Events!B15`.

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| CHP-01 | Chapter registry | Admin-maintained list of US chapters (e.g. Texas, East Coast) with the states each covers, leadership contacts and status. | High* | `Member profile!G13` |
| CHP-02 | State → chapter mapping | Maintainable mapping table driving auto-assignment (MP-08). | High* | `Member profile!B9` |
| CHP-03 | Chapter-scoped data access | Chapter Leads manage only their region (see IAM-10). | High | `Admin!D4` |
| CHP-04 | Donation attribution | Auto-link each donation to a chapter from the donor's profile. | Med | `Donations!D10` |
| CHP-05 | Event revenue/cost split | Attribute event revenue and volunteer-related costs to specific chapters. | High | `Events!D15` |
| CHP-06 | Chapter dashboard | Per-chapter view of members, upcoming events, giving totals and volunteer hours. | Med* | inferred |
| CHP-07 | Chapter transfer **[NEW]** | Moving a member between chapters is an auditable action; historical donations/events stay attributed to the chapter that earned them. | Med* | inferred |

**Design note:** chapter scoping must be enforced as a query-level tenancy filter (a NestJS guard + repository interceptor reading the caller's `chapter_id`), never as a `WHERE` clause remembered by each developer.

---

## 8. Module DIR — Member Directory & Networking

> **Purpose:** the opt-in, searchable, member-facing face of the member database.
> **Source:** `Communications!B9`, `Member profile!B8`/`!B10`.

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| DIR-01 | Opt-in searchable directory | Members find and connect with each other; participation is opt-in and revocable. | High | `Comm!D9` |
| DIR-09 | Active members only **[NEW]** | The directory lists only members with `is_active = true`. Pending, rejected, archived and approved-but-unpaid members are excluded from results *and* from the search index. | High | customer requirement |
| DIR-02 | Faceted search | Filter by chapter, state/city, gotra, caste, industry, skills, languages, membership tier, ancestral village. | High* | `Member profile!B4`, `!B8` |
| DIR-03 | Mentorship discovery | Surface members offering skills/expertise for mentorship and sponsorship; filter by industry. | Med* | `Member profile!B10`, `!G20` |
| DIR-04 | Geographic sub-chapters | Browse members by location to seed local sub-groups. | Med* | `Member profile!B8` |
| DIR-05 | Field-level directory privacy | Honour per-field visibility and the global opt-out from MP-19; hidden fields must not appear in search **results or search indexes**. | High | `Comm!D12` |
| DIR-06 | Social links | Show LinkedIn/Facebook only where the member approved the link. | Med* | `Member profile!B10` |
| DIR-07 | No financial data | The directory never exposes donation amounts, tiers derived from giving, or payment identifiers. | High | `Member profile!B16` |
| DIR-08 | Contact without exposure | Directory "contact" action routes through in-app messaging (P2P-01) rather than revealing a phone number. | Med | `Comm!D10` |

---

## 9. Module DON — Donations & Fundraising

> **Purpose:** collect, designate and track charitable giving.
> **Source tab:** `Donations and Charity Managemen` (Intake, Fund Mgmt).

### 9.1 Data model

`donation` (id, donor_member_id **nullable for anonymous/offline**, amount, currency, fee_covered_amount, net_amount, fund_id, chapter_id, payment_method, gateway_txn_id, status, is_anonymous, tribute_type, tribute_name, donor_note, received_at, recorded_by, receipt_id)
`fund` (id, name, code, description, is_active, goal_amount) — Scholarship, Heritage, General Fund
`recurring_schedule` (id, donor_member_id, amount, fund_id, frequency, next_run_at, status, gateway_subscription_id)
`payment_method_token` (gateway-held; **never store PAN or bank numbers locally**)

**Revision 9 additions** (they add fields and do not remove any):
- `donation.payment_method` gains `ach` (DON-16).
- `donation.receipt_document_id` → `document` (§20.4, level 3).
- `donation.status` covers `pending` for ACH, which settles days later.
- The Wall of Fame is a **read model**, not a table. It is distinct donor display names, ordered alphabetically, excluding anonymous gifts, plus one count of anonymous donors (DON-14).

### 9.2 Functional requirements

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| DON-01 | Payment integration | Integrate Stripe, PayPal, Zelle or ACH for seamless processing. Adapter pattern — one `PaymentGateway` interface, one adapter per provider. | High | `!B3` |
| DON-02 | Recurring giving | Automated monthly, quarterly or annual donation schedules, with member self-service pause/cancel/amend. | Med | `!B4` |
| DON-03 | Fee recovery | Donor opt-in to cover transaction fees (e.g. 2.9% + $0.30); fee shown transparently before confirmation and stored separately from the gift amount. | Med | `!B5` |
| DON-04 | Anonymous mode | Toggle to hide the donor's name from the public "Wall of Fame" and reports — the gift is still attributed internally for tax receipting. | High | `!B6` |
| DON-05 | Fund designation | Tag every gift to a specific fund (Scholarship, Heritage, General). | High | `!B7` |
| DON-06 | Offline entry | Admin tool to log cash and cheques received at local RROA meetups, capturing receipt-book reference and the recording admin. | High | `!B8` |
| DON-07 | Tribute gifts | "In Honor of" / "In Memory of" fields plus a donor note; optionally notify the honouree/family. | Med | `!B9` |
| DON-08 | Chapter attribution | Auto-link each donation to a chapter from the donor's profile. | Med | `!B10` |
| DON-09 | Tier progression | Auto-upgrade membership status once configurable donation thresholds are met. | Low | `!B16` |
| DON-10 | Wall of Fame | Public-facing (behind login) donor recognition list respecting DON-04. | Med* | implied by `!D6` |
| DON-11 | Refunds & corrections **[NEW]** | Refund/void a donation with a mandatory reason; the original row is never mutated — a reversing entry is written. | High* | required by `!D15` immutability |
| DON-12 | Pledges **[NEW]** | Record a pledge and track fulfilment against it (common at community fundraising events). | Low* | inferred |
| DON-13 | Failed-payment dunning **[NEW]** | Retry schedule and donor notification when a recurring charge fails. | Med* | inferred from `!B4` |
| DON-14 | Wall of Fame format **[NEW — Rev 9]** | Shown only to logged-in members, in two parts. **Donors:** names only, **no amounts**, alphabetical. All anonymous gifts collapse into **one line**, for example "Anonymous donors (12)". **Volunteers:** the Top Volunteers list (VOL-06). The Volunteer page shows the Volunteers part, and the member home page shows both (HOM-01). This is the detailed form of DON-10. | Not given | `RROA-DEV!D5`, `!D4` |
| DON-15 | Common pool **[NEW — Rev 9]** | All money collected goes into one common pool. It is shared out **outside** the portal, and each payout is recorded in the Finance module (FIN-03). The portal makes no disbursements. | Not given | `RROA-DEV!D6` |
| DON-16 | Online rails: Stripe and ACH **[NEW — Rev 9]** | Online donations are taken by **Stripe (card)** or **bank transfer (ACH)**, which may be Stripe ACH Direct Debit. **Zelle is not offered for donations** (it is for one-time event payments only, EVT-19). This narrows DON-01's provider list for donations. PayPal is not mentioned (#4). | High | `RROA-DEV!D1` |
| DON-17 | Donation visibility **[NEW — Rev 9]** | A member sees **only their own** donation history and total (MP-11). **Admins and the Finance Secretary** see the full list of all donations received. Nobody else sees anyone's donations, apart from the Wall of Fame. This refines Tier 3 (§3.2), whose "Finance Secretary / President" wording names the President but not Admins (#46). | Not given | `RROA-DEV!D15`, `!D14` |
| DON-18 | Chapter-scoped donation management **[NEW — Rev 9]** | A **Finance Secretary** role manages donations nationally. A **Chapter Lead** sees and manages donation data for their own chapter only, enforced server-side like IAM-10. | High | `RROA-DEV!D16` |

### 9.3 Acceptance criteria

- No card number, CVV or bank account number is ever persisted by the portal — only gateway tokens (supports PCI scope reduction and `Non Functional!D3`).
- An anonymous gift appears on the Wall of Fame as "Anonymous" but resolves to the donor on the Finance Secretary's report and on the donor's own tax statement.
- A refund creates a new reversing ledger row; the original donation row's amount is byte-identical before and after.
- A gift of $5,000 triggers the workflow rule in ADM-04 notifying the National Chair.
- **[Rev 9]** The Wall of Fame never renders an amount. Three anonymous gifts from two donors render as a single "Anonymous donors (2)" line, and no anonymous donor's name appears anywhere on it.
- **[Rev 9]** A member calling another member's donation history receives 403. A Chapter Lead listing donations receives only rows for their chapter, proven by an API-level test.

---

## 10. Module TAX — Receipting, Tax & Financial Compliance

> **Purpose:** meet 501(c)(3) obligations and survive an audit.
> **Source:** `Donations` Tax/Legal + Analytics rows.

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| TAX-01 | Instant e-receipts | PDF receipt generated and emailed immediately on a successful transaction, carrying the RROA EIN, 501(c)(3) statement, fund, date and amount. | High | `!B11` |
| TAX-02 | Annual statements | Self-service download of a consolidated 501(c)(3) tax letter per calendar year. | High | `!B12` |
| TAX-03 | Filing archive | Store all previous years' tax filings for audit for **10 years**, with controlled access and retention enforcement. | High | `!B13` |
| TAX-04 | Immutable financial audit trail | Append-only log of every financial record change, refund and manual deletion — who, what, before/after, when. | High | `!B15` |
| TAX-05 | Receipt reissue **[NEW]** | Reissue/correct a receipt as a numbered amendment; the superseded receipt is retained, never overwritten. | Med* | inferred from `!D15` |
| TAX-06 | Quid pro quo disclosure **[NEW]** | Where an event ticket carries goods/services value, the receipt must state the deductible portion (IRS requirement once EVT ticketing is live). | High* | inferred from `Events!B4` |
| TAX-07 | Offline gift receipting | Cash/cheque gifts logged via DON-06 produce the same receipt and roll into the annual statement. | High* | `!B8` + `!B12` |
| TAX-08 | Uploaded yearly tax letter **[NEW — Rev 9]** | When a member needs a yearly 501(c)(3) donation letter, the **Finance Secretary prepares it outside the portal and uploads it** to that member's profile, where the member downloads it. Each letter is kept on the profile for **5 years**, then removed. The letter is stored at DOC level 3 (§20.4). This is a second route to TAX-02's letter, and TAX-02 is kept as written (#36). | High | `RROA-DEV!D11` |
| TAX-09 | Receipts as stored documents **[NEW — Rev 9]** | Every PDF receipt from TAX-01 is also stored at DOC level 3. The donor, Admins and the Finance Secretary can see it. | High | `RROA-DEV!D10`, §7 |

**Acceptance:** a member who gave 3 online gifts, 1 cash gift and received 1 refund downloads one annual statement showing 4 gifts, the refund deducted, and a correct net deductible total.

---

## 11. Module EVT — Events & Ticketing

> **Purpose:** run cultural and charity events end to end, from listing to on-site check-in.
> **Source:** `Events & Volunteer Management` — Ticketing, Scheduling, Logistics, Comm, On-Site, Finance.

### 11.1 Data model

`event` (id, title, type [Cultural | Charity | Convention | Meetup], chapter_id, venue, start/end, capacity, status, attire_guide, waiver_template_id)
`ticket_type` (event_id, name, audience [Member | Non-Member], price, early_bird_price, early_bird_ends_at, age_band)
`event_registration` (event_id, household_id, purchaser_member_id, total_amount, payment_txn_id, status)
`attendee` (registration_id, member_id **nullable for guests**, ticket_type_id, dietary_pref, tshirt_size, hotel_details, waiver_signed_at, qr_code, checked_in_at)
`time_slot` (event_id, activity, start, end, capacity) + `slot_booking`
`donated_good` (event_id, item, quantity, donor_member_id, received_at)

**Revision 9 additions:**
- `event`:
  - `category` [`mel` | `annual_chapter` | `local_charity`], in RROA-DEV priority order.
  - `duration`, and `capacity` nullable for "No maximum".
  - `registration_closes_on`, `attendance_fee`, `flyer_document_id` (DOC level 1).
  - `stripe_payment_link`, `zelle_instructions`, `photos_url`.
  - `status` gains `closed`, with `closed_at` and `closed_by`. `closed` is terminal.
  - `created_by`, which must hold one of the three Secretary roles.
- `event_registration.status` gains `removed_by_admin`, with `removed_by` and `removed_reason`.
- `event_payment` (registration_id, amount, method [`stripe` | `zelle` | `other`], recorded_by, recorded_at, reference): one row per payment, whether settled online or recorded by hand.
- `event_document` (event_id, document_id, kind [`financial_statement` | `bill` | `other`], added_by). Each document moves from DOC level 4 to level 5 at close.
- `attendee.is_volunteer` (VOL-10).

### 11.2 Functional requirements

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| EVT-01 | Household registration | One user registers **all** family members in a single transaction and a single payment. | High | `!B3` |
| EVT-02 | Tiered pricing | Member vs non-member rates, plus early-bird discounts with automatic cut-over at the deadline. | High | `!B4` |
| EVT-03 | Time-slot booking | Granular appointment scheduling with per-slot capacity (e.g. blood-donation slots). | Med | `!B5` |
| EVT-04 | Preference tracking | Capture dietary needs (Veg / Jain / non-veg / allergies), T-shirt sizes and hotel details per attendee. | High | `!B6` |
| EVT-05 | Digital waivers | Capture a digital signature for liability waivers; store the signed artefact with the template version. | High | `!B7` |
| EVT-06 | Donated-goods inventory | Track goods donated for an event, with donor attribution feeding TAX in-kind receipting. | High | `!B7` |
| EVT-07 | Multi-channel alerts | Automated Email/WhatsApp reminders and attire guides on a configurable schedule before the event. | High | `!B8` |
| EVT-08 | QR check-in | Mobile QR scanning for attendee check-in, usable on a phone at the venue. | Med | `!B9` |
| EVT-09 | Badge printing | Print badges showing **Name and Gotra**. | Med | `!B9` |
| EVT-10 | Organiser mobile dashboard | Live dashboard for organisers during the event: checked-in counts, slot status, volunteer coverage. | High* | `Member profile!C34` |
| EVT-11 | Chapter revenue/cost split | Attribute event revenue and volunteer-related costs to chapters. | High | `!B15` |
| EVT-12 | Attendance history write-back | Successful check-in appends to the member's attendance log (MP-13). | Med* | `Member profile!B14` |
| EVT-13 | Cancellation & refund **[NEW]** | Configurable cancellation policy with refund routed through DON-11. | Med* | inferred |
| EVT-14 | Waitlist **[NEW]** | Automatic waitlist and promotion when capacity frees up. | Low* | inferred from capacity |
| EVT-15 | Guest registration **[NEW]** | Non-member guests can be ticketed without a member profile, at non-member rates. | High* | implied by `!D4` |
| EVT-16 | Event creation and categories **[NEW — Rev 9]** | Only the **General, Member and Finance Secretaries** create events. Each event has one category, in priority order: **Mel**, a large gathering held once every two years (High); **Annual chapter events**, run yearly by each chapter, such as Holi (Med); **Local charity and fundraising events**, such as food drives, blood donation drives and runs (Low). | High | `RROA-DEV!E1` |
| EVT-17 | Event page content **[NEW — Rev 9]** | Every event page shows the dates, duration, location, maximum participants (or "No maximum"), flyer, attendance fee and description. For **smaller events** the flyer and description are optional. Every logged-in member sees the flyer and description. | Not given | `RROA-DEV!E2` |
| EVT-18 | Registration closing date **[NEW — Rev 9]** | Each event has a closing date, the last day to register. Registration is refused after it, server-side. | Not given | `RROA-DEV!E2` |
| EVT-19 | Event payment options **[NEW — Rev 9]** | An event is paid for through a **Stripe payment link** or by **Zelle**. Zelle is allowed for **one-time event payments only**, never for donations or repeat payments. | Not given | `RROA-DEV!E2`, `!D1` |
| EVT-20 | Manual payment recording **[NEW — Rev 9]** | When a member pays by Zelle or another way outside Stripe, an **Admin records the amount received** against that member's registration by hand. The record captures the actor, the time and a reference, and is audited. | Not given | `RROA-DEV!E3` |
| EVT-21 | Participant list **[NEW — Rev 9]** | On the Events page, every logged-in member can see the list of members taking part in each event (Tier 2, §3.2). | Not given | `RROA-DEV!E5` |
| EVT-22 | Invitation broadcast **[NEW — Rev 9]** | Creating an event sends the invitation to **every registered email address**, and as a **text message** to every registered phone number where the portal supports texting. This uses NTF and COM-02, and COM-04 opt-outs apply (#40). | Not given | `RROA-DEV!E4` |
| EVT-23 | No self-cancellation after payment **[NEW — Rev 9]** | Once a member has paid, they **cannot cancel** their registration in the portal. If they ask outside the portal, an Admin can remove them from the event, with the reason audited. **Refunds are not handled in the portal** (compare EVT-13, which is kept, and §26.3). | Not given | `RROA-DEV!E11` |
| EVT-24 | Event documents **[NEW — Rev 9]** | Admins can attach documents such as financial statements and bills at any time **before the event is closed**. Until closing, **Admins and all Secretaries** can see them (DOC level 4). After closing, only the **Finance and General Secretaries** can, in the Finance module (DOC level 5, FIN-04). | Not given | `RROA-DEV!E15` |
| EVT-25 | Event photos link **[NEW — Rev 9]** | Once the event is over, Admins post a link to the event photos on the event page. | Not given | `RROA-DEV!E16` |
| EVT-26 | Closing an event **[NEW — Rev 9]** | Admins or Secretaries **close** an event when everything is done. Closing does three things: it requires volunteer hours to be entered (VOL-12), moves the event's statements and bills to the Finance module (FIN-04), and makes the event read-only. Nothing can be added after closing, and a **closed event cannot be reopened**. | Not given | `RROA-DEV!E17` |

### 11.3 Acceptance criteria

- A head of household registering 2 adults + 3 children produces 1 payment, 1 registration and 5 attendee rows each with its own QR code and dietary preference.
- Early-bird pricing stops applying automatically at the configured timestamp with no admin action.
- A badge preview renders Name and Gotra for every attendee holding a Gotra value.
- The organiser dashboard remains usable on a phone at 4G speeds (`Non Functional!D5`).
- **[Rev 9]** A Chapter Lead or ordinary member calling `POST /events` receives 403. Each of the three Secretaries succeeds.
- **[Rev 9]** A registration attempted the day after `registration_closes_on` is refused, even when the client is bypassed.
- **[Rev 9]** A paid registration exposes no cancel action to the member. An Admin removal requires a reason and writes one audit row.
- **[Rev 9]** After an event is closed:
  - Every write to it (documents, payments, registrations, photos, hours) returns 409.
  - There is no reopen endpoint.
  - Its bills are visible only to the Finance and General Secretaries.

---

## 12. Module VOL — Volunteer Management

> **Purpose:** recruit, schedule, track and recognise volunteers — including youth.
> **Source:** `Events & Volunteer Management` — Recruitment, Scheduling, Engagement, Tracking.

### 12.1 Data model

`volunteer_role` (event_id, name, description, required_skills[], headcount_needed) — e.g. Food Server, Safety Marshal, Chaperone
`volunteer_shift` (role_id, start, end, capacity)
`shift_signup` (shift_id, member_id, status)
`volunteer_hours` (signup_id, checked_in_at, checked_out_at, hours_credited, approved_by)

### 12.2 Functional requirements

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| VOL-01 | Role registry | Define specific volunteer roles/shifts per event (Food Server, Safety Marshal, Chaperone). | High | `!B10` |
| VOL-02 | Skill matching | Auto-suggest roles to members based on the skills and volunteer interests on their profile (Medical, Tech, …). | Med | `!B11` |
| VOL-03 | Shift management | Volunteers self-sign-up for specific time blocks within an event; capacity enforced. | High | `!B12` |
| VOL-04 | Volunteer check-in | A **separate** check-in flow from attendee check-in, used to track hours served. | Med | `!B13` |
| VOL-05 | Hours log | Automated start/end time tracking per shift, producing credited hours. | High | `!B16` |
| VOL-06 | Leaderboards | Recognition of "Top Volunteers" by hours served or event count, filterable by chapter and by youth/adult. | High | `!B14` |
| VOL-07 | Cost attribution | Volunteer-related costs attributed to the sponsoring chapter (shared with EVT-11). | High | `!B15` |
| VOL-08 | Manual hour adjustment **[NEW]** | Coordinator can correct hours with a reason; corrections are audited. | Med* | inferred from `!D16` |
| VOL-09 | Youth chaperone rules **[NEW]** | Shifts flagged as youth-eligible require a linked adult/guardian sign-off. | Med* | inferred from `!D10` "Chaperone" + child profiles |
| VOL-10 | Volunteer during event sign-up **[NEW — Rev 9]** | While registering for an event (EVT-01), a member can also sign up as a volunteer for **themselves, their children, or both**. The volunteer flag is per attendee (`attendee.is_volunteer`). | Not given | `RROA-DEV!V2` |
| VOL-11 | Offline assignment **[NEW — Rev 9]** | Members **do not choose** a volunteer role or shift. Activities are assigned later, and volunteers are told outside the portal. The portal records only who volunteered for which event (compare VOL-01/03, kept, and §26.3). | Not given | `RROA-DEV!V3` |
| VOL-12 | Hours entered at event close **[NEW — Rev 9]** | When closing an event (EVT-26), an Admin or Secretary enters the hours served by **every** volunteer on it, adults and children. An event cannot close while a volunteer has no hours, though 0 is allowed. The hours are held at DOC level 4 and feed VOL-06. | Not given | `RROA-DEV!V4` |
| VOL-13 | Volunteer page **[NEW — Rev 9]** | A Volunteer page shows the Volunteers part of the Wall of Fame, which is the Top Volunteers list (DON-14, VOL-06). | Not given | `RROA-DEV!D5` |

**Acceptance:** a volunteer who checks in at 09:00 and out at 13:30 accrues 4.5 credited hours, which appear on the leaderboard and on their certificate (REC-02) without further admin action.

**Acceptance [Rev 9]:** a parent registering themselves and two children, and ticking "volunteer" for one child, produces exactly one volunteer attendee. At close, that child's 3 hours are entered, and the child appears on Top Volunteers with 3 hours and 1 event.

---

## 13. Module REC — Recognition & Certificates

> **Purpose:** produce the branded certificates that youth volunteers use for school and college applications. This is a **High** priority block in the workbook — all four rows.
> **Source:** `Events & Volunteer Management` — Recognition.

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| REC-01 | Template builder | Admin tool to create branded certificate templates carrying the RRA logo, signatures and layout. | High | `!B17` |
| REC-02 | Auto-generation | System auto-populates the child's name, event and hours served onto the certificate. | High | `!B18` |
| REC-03 | Portal upload | Generated certificates attach automatically to the member profile's **Youth section**. | High | `!B19` |
| REC-04 | Self-service download | Parents download/print certificates for school or college applications. | High | `!B20` |
| REC-05 | Verification code **[NEW]** | Each certificate carries a unique verification code/QR so a school can confirm authenticity. | Med* | inferred from stated use |
| REC-06 | Adult recognition **[NEW]** | The same engine issues appreciation certificates to adult volunteers and donors. | Low* | inferred |
| REC-07 | Manual certificate upload **[NEW — Rev 9]** | An Admin or Secretary prepares certificates **outside the portal** and uploads them to the profile of the member who volunteered, or to **their child's section** of the profile. They are stored at DOC level 2. RROA-DEV states that the portal does **not** create certificates automatically. REC-01, REC-02 and REC-05 are kept as written, and §26.3 records the difference. | High | `RROA-DEV!V6` |
| REC-08 | Certificate download for members and parents **[NEW — Rev 9]** | **Members and parents** download and print certificates from the profile, for example for school or college applications. This extends REC-04, which names parents only, to adult volunteers. | High | `RROA-DEV!V7` |

**Acceptance:** completing a shift as a youth volunteer produces a PDF within 60 seconds, filed under that child's profile, downloadable by the parent, with the child's name, the event name and the credited hours correct.

---

## 14. Module COM — Communications & Broadcast

> **Purpose:** one-to-many official communication across email, WhatsApp and SMS.
> **Source:** `Communications` — Broadcast, Security.

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| COM-01 | Email blast engine | Send rich-text HTML newsletters and formal community notices, with template management, preview and test-send. | High | `!B6` |
| COM-02 | WhatsApp / SMS gateway | Direct integration for critical alerts (event changes, emergency notices) using approved message templates. | High | `!B7` |
| COM-03 | Audience segmenting | Build audiences by **Chapter, Gotra, Age Group, Membership Tier** — and, by extension, by volunteer interest, donor status and event attendance. | High | `!B8` |
| COM-04 | Privacy controls | Global and field-level opt-out governing both communications and directory visibility; opt-outs are honoured on every send. | High | `!B12` |
| COM-05 | Blast throttling | Limit the number of **non-critical** blasts per week to prevent message fatigue; critical alerts bypass the limit. | Low | `!B14` |
| COM-06 | Scheduling **[NEW]** | Schedule a blast for a future send time, with an unschedule window. | Med* | inferred |
| COM-07 | Delivery analytics **[NEW]** | Per-campaign delivery, bounce, open and opt-out counts. | Med* | inferred from `!B14` fatigue logic |
| COM-08 | Transactional vs marketing split **[NEW]** | Receipts, welcome mails and event reminders are transactional and unaffected by marketing opt-out; newsletters are not. | High* | required for CAN-SPAM compliance |

**Acceptance:** a blast targeted at "Texas Chapter + Lifetime tier" excludes every member with a communications opt-out, and the pre-send screen shows the exact recipient count and the number excluded by opt-out.

---

## 15. Module GOV — Leadership & Governance (EC Corner)

> **Purpose:** the Executive Committee's publishing and record-keeping surface.
> **Source:** `Communications` — Leadership.

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| GOV-01 | Announcement portal | A dedicated "Leadership Corner" for official statements from the Board / National Chair, with publish/unpublish and pinning. | High | `!B3` |
| GOV-02 | Meeting minutes repository | Secure archive of EC meeting notes, agendas and resolutions, **searchable by date and topic**, with document versioning. | High | `!B4` |
| GOV-03 | EC update dashboard | A **Board-Only** view for EC updates and internal project tracking. | Med | `!B5` |
| GOV-04 | Access control | Leadership Corner readable by all members; the EC dashboard and draft minutes restricted to EC roles. | High* | implied by `!D5` "Board-Only" |
| GOV-05 | Resolution register **[NEW]** | Track resolutions with status (Proposed / Passed / Rejected) and the meeting they belong to. | Low* | inferred from `!D4` |

---

## 16. Module P2P — Member-to-Member Engagement

> **Purpose:** members connecting with each other without exchanging private contact details.
> **Source:** `Communications` — P2P, Security. Lowest-priority block in the workbook; schedule last.

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| P2P-01 | Internal messaging | Secure in-app 1-1 messaging so members chat **without sharing private phone numbers**. | Med | `!B10` |
| P2P-02 | Community forums | Discussion boards per topic — Youth Mentorship, Matrimonial, Genealogy. | Low | `!B11` |
| P2P-03 | Moderation tools | Admin ability to flag, delete or mute inappropriate content in forums. | Med | `!B13` |
| P2P-04 | Report/block **[NEW]** | Members can report a message or block another member; reports land in the moderation queue. | Med* | inferred from `!D13` |
| P2P-05 | Matrimonial privacy **[NEW]** | The matrimonial board needs its own opt-in and stricter visibility rules than the general directory. | Med* | inferred from `!D11` |

---

## 17. Module ADM — Administration & Master Data

> **Purpose:** the levers that let the community run the portal without engineering help.
> **Source:** `Administration` — Data, Automation, Integration (Access/Security rows live in IAM).

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| ADM-01 | Master data management | Admin tool to maintain dropdown lists: **Gotras, Villages/Thikanas, Membership Tiers** — plus Castes, Honorifics, Languages, Industries, Funds and Volunteer Roles. Values are versioned; deactivating a value must not orphan existing records. | Med | `!B5` |
| ADM-02 | Audit trail | "Who, what, when" for every record change, with before/after values — explicitly crucial for financial data. | High | `!B6` |
| ADM-03 | Backup & recovery | Automated **daily** database backups with 1-click restore. | High | `!B10` |
| ADM-04 | Workflow engine | Admin-authored If/Then rules — e.g. *if donation > $5,000 then notify the National Chair*. Triggers: donation received, member approved, event registered, volunteer hours logged, life event approaching. | Med | `!B9` |
| ADM-05 | API management | Interface to manage connections with WhatsApp, Stripe and email gateways: credentials, health status, retry/failure log. | Med | `!B13` |
| ADM-06 | Data export | Export any table to CSV/Excel for external analysis or accounting — export actions are themselves audited, and financial exports require `donations:read`. | High | `!B12` |
| ADM-07 | Feature flags **[NEW]** | Admin-visible view of which modules are enabled (aligns with the repo's `VITE_FEATURE_*` module registry). | Low* | inferred |
| ADM-08 | Retention & deletion policy **[NEW]** | Configurable retention: 10 years for tax records (TAX-03), archival rather than hard deletion for members (`Registration!J8`). | Med* | inferred |
| ADM-09 | Configurable minimum registration age **[NEW]** | Admin-editable setting `registration.minimum_age` — integer years, **default 18**, validated range 0–99 — controlling who may create a member account (REG-17). Changes are audited (ADM-02), take effect on the next submission, and are **not** applied retroactively to existing members. The value is exposed to the public registration form via `GET /public/config/registration` so the client and server never disagree. Scope: global; per-chapter overrides are explicitly out of scope unless the customer asks. | High | customer requirement |
| ADM-10 | Membership dues configuration **[NEW]** | Dues amount and currency per membership tier (Annual, Lifetime, Youth, Associate) are master data (ADM-01), not hard-coded, including a zero/waived amount for tiers that do not pay. Changing an amount never re-opens the payment gate for members already active. | High | customer requirement |
| ADM-11 | Activation settings surface **[NEW]** | One admin settings screen groups the activation levers: minimum age, dues per tier, awaiting-payment reminder interval (REG-19), verification-link parameters (ADM-12), and whether payment is required at all (a global kill-switch that treats `is_payment_made` as satisfied — for the community's first cohort or a dues-free period). Email verification has **no** kill-switch: it is a security control, not a policy lever. | Med | inferred from REG-15 |
| ADM-12 | Verification-link configuration **[REVISED]** | Admin-editable, audited, **per token purpose** (email verification / credential setup / password reset): link TTL (defaults **24 h**, **24 h** and **20 min** respectively), resend cooldown (default **60 s**) and hourly resend cap (default **5**). Plus the unverified-application purge window (default **7 days**, REG-24) and the sender identity/reply-to for credential emails. Changes apply to links issued afterwards; links already in flight keep the parameters they were issued under. Token length and randomness are **not** admin levers. | High | customer requirement |
| ADM-13 | Email deliverability monitoring **[NEW]** | Bounce, complaint and delivery-failure visibility for credential mail specifically — an address that hard-bounces its verification link is flagged in the admin queue rather than silently stranding the applicant. Requires SPF/DKIM/DMARC on the sending domain, and the link domain must match the sending domain so gateways do not rewrite or strip it. | Med | inferred from REG-21 |

---

## 17A. Module FIN — Finance Module **[NEW — Rev 9]**

> **Purpose:** a restricted home for RROA's own tax documents and financial records: annual filings, closed-event statements and bills, and the record of money shared out of the common pool.
> **Source:** `RROA-DEV` §6 (F1–F4), plus `!D6`, `!E15` and `!E17`.
> **Distinct from TAX.** TAX issues receipts and letters **to members**. FIN holds the **organisation's** records. TAX-03's 10-year filing archive is where the two meet: FIN is the store that satisfies it.

### 17A.1 Data model

- `finance_document` (id, document_id → DOC, kind [`annual_tax_filing` | `event_statement` | `event_bill` | `payout_record` | `other`], fiscal_year, event_id nullable, uploaded_by, uploaded_at, retain_until)
- `pool_payout` (id, paid_on, amount, currency, recipient, purpose, method, reference, recorded_by, recorded_at, supporting_document_id nullable). The record is **append-only**. A correction is a new reversing row, with the same rule as DON-11 and TAX-04.

### 17A.2 Functional requirements

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| FIN-01 | Restricted access | Only the **Finance Secretary** and the **General Secretary** can open the Finance module. They can upload documents and download them later. Everyone else, Admins included, receives 403 (#46). | Not given | `RROA-DEV!F1` |
| FIN-02 | 10-year retention | Every document in the module is kept for **10 years** so it is available for audits. Deletion inside the window is refused. Satisfies TAX-03 and ADM-08. | High | `RROA-DEV!F2`, `Donations!B13` |
| FIN-03 | Common-pool payouts | The Finance Secretary records **every payout** from the common pool (DON-15), money shared out offline, with its amount, date, recipient, purpose and supporting document. | Not given | `RROA-DEV!F3`, `!D6` |
| FIN-04 | Closed-event documents | When an event is closed (EVT-26), its financial statements and bills **move here** from the event and change from DOC level 4 to level 5. | Not given | `RROA-DEV!F4`, `!E17` |
| FIN-05 | Document register | The module lists its documents by kind, year and event, as in the table in 17A.3. The list is expected to grow as more document kinds are confirmed. | Not given | `RROA-DEV` §6 table |

### 17A.3 Tax and financial documents (from RROA-DEV §6)

| Document | How often | Where it is kept | Keep for |
|---|---|---|---|
| RROA annual tax filing | Once a year | Finance module | 10 years |
| Event financial statements and bills | Each event, at closing | Finance module (moved from the event) | 10 years |
| Records of money shared out from the common pool | Each payout | Finance module | 10 years |
| Member's yearly donation tax letter (TAX-08) | When a member needs it | That member's profile, prepared offline by the Finance Secretary | 5 years |

### 17A.4 API sketch and screens

```
GET    /finance/documents?kind=&year=&eventId=     (finance:read)
POST   /finance/documents                          upload            (finance:write)
GET    /finance/documents/:id/download             (finance:read)
GET    /finance/payouts                            (finance:read)
POST   /finance/payouts                            append-only       (finance:write)
```

Screens: `/finance`, with tabs for Documents, Payouts and Closed events. Nav is gated on `finance:read`, which is granted to `finance_secretary` and `general_secretary` only.

### 17A.5 Acceptance criteria

- A Membership Secretary, a Chapter Lead and an Admin each receive 403 from every `/finance/*` route, as long as #46 leaves Admins out.
- Closing an event with 2 bills moves both into `/finance/documents?eventId=…`. They are no longer listed on the event, and a Secretary other than Finance or General can no longer download them.
- Deleting a finance document less than 10 years after upload is refused.
- A payout row cannot be edited. A correction appears as a second row.

---

## 18. Module RPT — Reporting & Analytics

> **Source:** `Administration` — Reports; `Donations` — Analytics.

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| RPT-01 | Custom report builder | Drag-and-drop ad-hoc report creation for EC meetings, with saved and shareable report definitions. | High | `Admin!B11` |
| RPT-02 | Data export | Any report or table exported to CSV/Excel. | High | `Admin!B12` |
| RPT-03 | Donor dashboard | Visual charts of giving trends over time, top donors and per-fund performance. | Med | `Donations!B14` |
| RPT-04 | Membership analytics **[NEW]** | Growth, tier mix, chapter distribution, age pyramid, retention/lapse. | Med* | inferred |
| RPT-05 | Event & volunteer analytics **[NEW]** | Attendance vs capacity, revenue vs cost by chapter, volunteer hours by chapter and by youth/adult. | Med* | `Events!D15`, `Events!D16` |
| RPT-06 | Report permissions | Financial reports gated behind `donations:read`; chapter-scoped users see only their chapter's rows. | High* | `Member profile!B16`, `Admin!D4` |

**Revision 9:** RPT-03's donor dashboard is visible **only to Admins and the Finance Secretary** (`RROA-DEV!D12`). Donation export (`RROA-DEV!D18`) is ADM-06/RPT-02, with High priority.

---

## 18A. Module HOM — Member Home Page **[NEW — Rev 9]**

> **Purpose:** what a **logged-in** member sees when they arrive. It pulls together recognition, the next event, the community maps and a way to contact RROA. More home-page items are expected.
> **Source:** `RROA-DEV` §5 (H1–H4).
> **Relationship to `/`.** Today `/` is the **public** landing page, owned by the `home` plugin with `layout: 'app.full'`. HOM is a signed-in view. It either renders on `/` once `plugin-auth` resolves a session, or it sits at its own route (for example `/home`). Two plugins must never declare the same path (see `CLAUDE.md`).

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| HOM-01 | Wall of Fame on home | The home page shows the Wall of Fame with **both** parts: Donors and Volunteers (DON-14). | Not given | `RROA-DEV!H1`, `!D5` |
| HOM-02 | Upcoming event highlight | A short highlight (flash summary) of the next upcoming open event, with a link to register (EVT). | Not given | `RROA-DEV!H2` |
| HOM-03 | Member maps | Two maps of members registered on the portal. **USA map:** a pin per member at their Home Address. **Rajasthan map:** a pin per member at their Ancestral Village. Addresses must be geocoded. Directory opt-out, field visibility and pin precision are question #37. | Not given | `RROA-DEV!H3` |
| HOM-04 | Contact Us | The home page links to a Contact Us page, where a member types a question or concern and submits it. The portal emails it automatically to the **RROA portal email address**. Whether copies are kept, and at which DOC level, is question #43. | Not given | `RROA-DEV!H4` |

**Acceptance:**
- A signed-out visitor never receives Wall of Fame, map or event data, and the endpoints behind them return 401.
- A member with the directory opt-out set has no pin on either map.
- The home page with no upcoming event shows no empty highlight card.
- A Contact Us submission lands in the configured RROA inbox with the member's identity attached.

---

## 19. Module PLT — Platform, PWA & Experience (Non-Functional)

> **Source tab:** `Non Functional`. The high-level statement (`High level requirements!B15`) is explicit: **a single application serving both mobile and desktop, plus an app-wrapped solution.**

| ID | Requirement | Specification / metric | Priority | Source |
|---|---|---|---|---|
| PLT-01 | Data encryption | All data at rest **AES-256**; in transit **TLS 1.2+**. | High | `!B3` |
| PLT-02 | System uptime | Maintain **98%** uptime; a status page accessible to admins. | High | `!B4` |
| PLT-03 | Responsive load | Initial render **< 1.5 s** on broadband, **< 3 s** on 4G. | High | `!B5` |
| PLT-04 | Cross-browser | Latest **2** versions of Chrome, Safari, Edge and Firefox. | High | `!B6` |
| PLT-05 | Mobile web parity | **100%** feature parity between desktop and mobile browser views. | High | `!B7` |
| PLT-06 | PWA / native experience | Optimised for "Add to Home Screen" to mimic a mobile app — manifest, service worker, offline shell, installability. | Med | `!B8` |
| PLT-07 | Adaptive UI | Columns re-stack and buttons resize for touch on mobile; touch targets ≥ 44×44 px. | High | `!B9` |
| PLT-08 | Accessibility | Conform to **WCAG 2.1 Level AA** — contrast, screen-reader support, keyboard navigation. | Med | `!B10` |
| PLT-09 | Concurrency | Support **100+** simultaneous sessions during peak event hours. | High | `!B11` |
| PLT-10 | Data residency & PII **[NEW]** | US-hosted data; PII minimisation in logs; no member PII in third-party analytics. | High* | inferred from `!B3` |
| PLT-11 | Observability **[NEW]** | Centralised logs, error tracking and uptime monitoring feeding the PLT-02 status page. | High* | required to evidence `!B4` |

**Repo alignment:** PLT-05, PLT-07 and PLT-08 are already codified in `.claude/rules/ui-component.md` (paired `dark:` classes, mobile-first breakpoints, ≥ 44×44 px targets, visible focus rings, `motion-safe:`) — those standards satisfy this tab if enforced on every component.

---

## 20. Cross-cutting services (build once)

### 20.1 AUD — Audit & Change Log
Append-only store; no UPDATE or DELETE grant on the table. Row shape: `actor_id`, `actor_role`, `impersonated_by`, `action`, `entity_type`, `entity_id`, `before` (JSON), `after` (JSON), `reason`, `ip`, `timestamp`. Feeds REG-11, DON-11, TAX-04, ADM-02, IAM-11 and VOL-08. Provide an admin viewer filterable by entity, actor and date range, and an export (ADM-06).

### 20.2 NTF — Notification & Template Service
Channels: Email, SMS, WhatsApp, In-app, Push (PWA). Responsibilities: named templates with variables and versioning; per-member per-channel preference and opt-out (COM-04); transactional-vs-marketing classification (COM-08); throttling (COM-05); delivery receipts and bounce handling (COM-07); retry with backoff. Consumers: REG-04/08/10, IAM-01/05, DON-07/13, TAX-01, EVT-07, VOL, REC-03, COM-01/02, ADM-04.

**Revision 3–7:** the credential emails (REG-21 verification, IAM-01 setup, IAM-05 reset) are **transactional and non-suppressible** — it must bypass broadcast preferences, unsubscribe state and quiet hours, and should be sent on a separate high-priority path from bulk community mail so that a bulk-send backlog never delays account creation.

### 20.3 MDM — Master Data & Reference Lists
Managed lists: Gotra, Rajput Caste, Honorific, Language, Ancestral Village/Thikana, Chapter, State→Chapter map, Membership Tier, Industry, Skill, Volunteer Interest, Volunteer Role, Fund, Dietary Preference, T-shirt Size, Life Event Type. Each list supports add / rename / deactivate / merge with referential safety (ADM-01).

**Revision 9:** add **Event Category** (Mel, Annual chapter event, Local charity event; EVT-16) and **Finance Document Kind** (FIN-05). RROA-DEV §9 says there is only one membership tier, **Lifetime**. The Membership Tier list is kept, and #33 asks how the other seeded tiers are retired.

### 20.4 DOC — Document Storage & Security Levels **[NEW — Rev 9]**

> **Source:** `RROA-DEV` §7 (S1–S3) and §8 (proposed security levels, to be reviewed).

| ID | Requirement | Detail | Priority | Source |
|---|---|---|---|---|
| DOC-01 | Google storage | Every document captured by the portal, from every module, is stored in RROA's Google ("Gmail") storage, most likely Google Drive or a Workspace shared drive through a service account (#39). The portal keeps only metadata and the storage file id. | Not given | `RROA-DEV!S1` |
| DOC-02 | Folder per sensitivity | Documents are kept in separate folders by how sensitive they are, so each folder can be shared only with the people allowed to see it. | Not given | `RROA-DEV!S2` |
| DOC-03 | One level per document | Every document has exactly **one** security level and is saved in that level's folder. When a document's level changes, for example event bills at close (EVT-26, FIN-04), the file **moves** to the new folder. | Not given | `RROA-DEV!S3` |
| DOC-04 | Unclear means higher | When the right level is unclear, use the higher, more private level until it is decided. | Not given | `RROA-DEV` §8 rules |
| DOC-05 | Share with roles, not people | Folders are shared with **role accounts** (for example a shared Finance Secretary account), not personal addresses, so access moves with the office. Only Admins change sharing. Access to levels 4 and 5 is reviewed **once a year**. | Not given | `RROA-DEV` §8 rules |
| DOC-06 | Portal enforces the same rule | The portal's own download endpoints enforce the level in the table below, server-side, whatever the folder sharing says. Folder sharing is defence in depth and never the only check. **[NEW]** | High* | inferred from S2 + §3.2 |
| DOC-07 | Retention by kind | 10 years for FIN documents (FIN-02) and 5 years for yearly tax letters (TAX-08). Expiry is enforced by a scheduled job (#26, #41). | High | `RROA-DEV!F2`, `!D11` |

**Security levels (proposed in RROA-DEV §8; still under review):**

| Level | Who can access | Examples | Suggested folder |
|---|---|---|---|
| 1. All members | All logged-in members, Admins and Secretaries | Event flyers and descriptions, participant lists, Wall of Fame, member maps | `1 - All Members` |
| 2. Personal | The member (and parents, for children), Admins and Secretaries | Volunteer certificates, signed waivers | `2 - Personal`, one sub-folder per member |
| 3. Donation records | The member sees only their own; Admins and the Finance Secretary see all | Donation receipts, yearly donation tax letters | `3 - Donations`, one sub-folder per member |
| 4. Leadership | Admins and all Secretaries | Bills and statements for events still open, volunteer hours records | `4 - Leadership` |
| 5. Finance restricted | Finance Secretary and General Secretary only | RROA tax filings, payout records, bills and statements of closed events | `5 - Finance` |

**Document register (RROA-DEV §7):**

| Document | Module | Who can see it | Level | Portal ID |
|---|---|---|---|---|
| RROA annual tax filing | FIN | Finance and General Secretary | 5 | FIN-01/02 |
| Records of money shared out | FIN | Finance and General Secretary | 5 | FIN-03 |
| Event financial statements and bills | EVT → FIN | Admins and all Secretaries until close, then Finance and General Secretary | 4 → 5 | EVT-24, FIN-04 |
| Yearly donation tax letters | TAX | The member and the Finance Secretary (Admins too, if the level-3 proposal is accepted, #44) | 3 | TAX-08 |
| Donation receipts (PDF) | TAX | The donor, Admins and the Finance Secretary | 3 | TAX-01, TAX-09 |
| Volunteer certificates | REC | The member (and parents), Admins and Secretaries | 2 | REC-07/08 |
| Signed liability waivers | EVT | The signer (and parents), Admins and Secretaries | 2 | EVT-05 |
| Event flyers | EVT | All logged-in members | 1 | EVT-17 |

**Points still under review in RROA-DEV:** Admin access to level-3 tax letters (#44), and whether Contact Us messages are kept and at which level (#43).

---

## 21. Module dependency graph

```
IAM ──┬─> MP ──┬─> DIR
      │        ├─> DON ──> TAX
      │        ├─> EVT ──> VOL ──> REC
      │        ├─> COM
      │        └─> P2P
      ├─> REG ──> MP            (registration creates the member record)
      └─> CHP ──> (MP, DON, EVT, RPT all scope by chapter)

AUD, NTF, MDM  ── consumed by every module above
ADM ──> MDM, AUD, workflow engine, integrations
RPT ──> reads MP, DON, EVT, VOL (never writes)
PLT ──> applies to the whole frontend shell
```

**Revision 9 additions:**

```
DOC ──> consumed by TAX (receipts, letters), EVT (flyers, waivers, bills), REC (certificates), FIN
DON ──> FIN   (common-pool payouts, DON-15 → FIN-03)
EVT ──> FIN   (close moves bills, EVT-26 → FIN-04)
EVT ──> VOL   (volunteering happens at event sign-up, hours at close)
HOM ──> reads DON (Wall of Fame), VOL (Top Volunteers), EVT (next event), MP (maps)
```

**Critical path:** IAM → CHP → MP → REG. Nothing else can ship first; DON, EVT and COM all assume a member record and a chapter exist.

**Revision-2 dependency:** REG-18 makes the dues payment part of activation, so REG now needs the payment-provider integration from DON in **Phase 1**, not Phase 2 — see §22.

---

## 22. Suggested delivery phases

| Phase | Modules | Rationale |
|---|---|---|
| **Phase 1 — Foundation** | IAM, MDM, AUD, CHP, MP, REG, ADM (core), PLT, **DON payment rail (subset)** | The workbook's own priority ordering: profile + registration + security are almost entirely `High`. Nothing else is usable without a vetted member base. **Revision 2:** because activation now requires a settled payment (REG-15/REG-18), the dues checkout and its provider webhook must land in Phase 1 — pull just the payment rail forward from DON, leaving campaigns, funds and receipting in Phase 2. If the provider is not contracted in time (gap #4), ship behind the ADM-11 kill-switch with admin overrides (REG-16) covering payment recording manually. |
| **Phase 2 — Money & Events** | DON, TAX, EVT, COM, DIR, NTF | The two revenue engines plus the ability to tell people about them. TAX must ship with DON, not after — receipts are a legal obligation from the first dollar. |
| **Phase 3 — Engagement** | VOL, REC, GOV, RPT | REC is `High` across all four rows but depends on VOL hours, which depend on EVT. |
| **Phase 4 — Community** | P2P, ADM workflow engine, advanced analytics | The workbook's own `Low`/`Med` tail: forums, matrimonial, throttling refinements. |

**Revision 9 placement:**
- **MP-25 and MP-26** are Phase 1 corrections to shipped behaviour, because they change what `/join` and My profile do today.
- **DOC** and **FIN** join Phase 2. TAX receipts and letters need DOC from the first dollar, and EVT's close step needs FIN.
- **HOM** joins Phase 2. HOM-04 (Contact Us) is nearly done, and HOM-02 needs EVT.
- RROA-DEV moves **VOL-10…13, REC-07/08 and VOL-06** into Phase 2 alongside EVT. Volunteering is captured at event sign-up, certificates are a manual upload, and the leaderboard is High priority. The rest of VOL and REC stay in Phase 3.
- RROA-DEV's own priorities within Phase 2, High first:
  1. DON-16 (Stripe/ACH), DON-04, DON-06, DON-18, TAX-01, TAX-04, TAX-08, ADM-06.
  2. EVT-16 (Mel first), EVT-01, EVT-02 early bird, EVT-04, EVT-05/06, EVT-07, EVT-11.
  3. VOL-06, REC-07, REC-08.

---

## 23. Gaps and open questions for the customer

These need answers before Phase 1 build starts; each would change the data model or the workflow.

| # | Question | Why it matters | Related |
|---|---|---|---|
| 1 | Is a **spouse** a full member with their own login, or only a linked profile? The Spouse tab has an email and phone but no password field. | Determines whether spouse records live in the same `member` table or a separate linked entity, and whether a spouse can donate/register independently. | MP-17 |
| 2 | Same question for **children over 18** — do they graduate to their own member record, and what happens to the household link? | Youth-tier lifecycle, certificate ownership, COPPA exposure. | MP-18, IAM-13 |
| 3 | The child form supports **up to 3 children**. Is that a hard cap or a form limitation? **Answered by RROA-DEV (Rev 9):** up to **5** children (`!M2`); see MP-25 and #34. | Data model should not encode a cap; the form should. | `Child!D9` |
| 4 | Which payment providers are actually contracted — Stripe, PayPal, Zelle, ACH, or a subset? Zelle in particular has no merchant API and would need manual reconciliation via DON-06. **Answered by RROA-DEV (Rev 9):** donations use **Stripe or ACH**; **Zelle only for one-time event payments**, recorded by hand (DON-16, EVT-19, EVT-20). PayPal is not mentioned. | Scope of DON-01 varies enormously. | DON-01 |
| 5 | Is **membership dues** a separate concept from donations? The workbook mentions Annual/Lifetime tiers but never a dues payment flow. **Now partially answered: activation depends on `is_payment_made`, so a dues flow exists (REG-18).** Still open: the amount per tier, and whether dues receipts are tax-deductible (they usually are not, where a benefit is received). **Rev 9:** RROA-DEV says there is only one tier, **Lifetime** (see #33). | A missing module if dues are collected; affects TAX-01 receipt wording. | MP-10, DON, REG-18, ADM-10 |
| 6 | What are the exact **chapter definitions** and their state coverage? | Blocks CHP-02 and MP-08. | CHP-01 |
| 7 | WhatsApp Business API access — is a provider (Twilio, Meta BSP) chosen? Template pre-approval takes weeks. | Long lead time; start early or COM-02 slips. | COM-02 |
| 8 | Does "app wrapped solution" (`High level requirements!B15`) mean a PWA only, or store-published iOS/Android wrappers? | PWA (PLT-06) vs. store submission are very different efforts. | PLT-06 |
| 9 | Gender is captured as Male/Female only (`!G25`). Confirm this is intentional. | Data model + form validation. | MP §4.1 |
| 10 | What is the retention/deletion policy for an **Archived** member — data retained indefinitely, or purged after N years? | Conflicts with the 10-year tax retention rule. | ADM-08, TAX-03 |
| 11 | Who signs off certificate templates, and are digital signatures of officers required? | REC-01 template design. | REC-01 |
| 12 | Is the member directory ever visible to **non-members**? `Member profile!B17` says everything is behind the firewall — confirm no public-facing directory. | Public site scope. | DIR-01 |
| 13 | Does an **Annual** membership expire and re-open the payment gate each year — i.e. does `is_payment_made` reset on renewal, deactivating a member who does not renew? **[NEW]** **Rev 9:** moot if only Lifetime exists (#33). | Determines whether a renewal/lapse lifecycle and grace period are in scope for Phase 1, or whether payment is a one-time onboarding gate. | REG-15, MP-22 |
| 14 | Do **existing members** migrated into the portal arrive pre-approved and pre-paid, or must they pass both gates? **[NEW]** | A one-time backfill setting both flags is needed, or the whole community lands in Approved — Awaiting Payment on go-live. | REG-15, ADM-11 |
| 15 | Is the minimum age **18**, or a different number, and does it apply per chapter or globally? Assumed 18 and global (ADM-09). **[NEW]** | Confirm before build; a per-chapter value changes the settings model. | REG-17, ADM-09 |
| 16 | When a household's child reaches the minimum age, is account creation **automatic, invited, or self-service**? **[NEW]** | Ties to gap #2 (children over 18) and determines whether a scheduled job issues invitations. | MP-23, IAM-13 |
| 17 | Which roles may **override `is_payment_made`** — Membership Secretary only, or Finance Secretary and President too? Assumed all three (REG-16). **[NEW]** | Permission mapping for `registration:payment.override`. | REG-16, IAM-09 |
| 18 | Which **email provider** sends transactional mail (SES, SendGrid, Postmark, Mailgun), and is the sending domain's SPF/DKIM/DMARC already in place? **[NEW]** | Verification codes are now on the critical path for account creation — poor deliverability blocks registration entirely, and domain auth has a lead time. | REG-21, ADM-13 |
| 19 | Do **households sharing one email address** exist in the current membership? The email is unique and is the login identifier, so a couple sharing an address cannot both hold accounts. **[NEW]** | Determines whether spouse records need their own address, or whether uniqueness must be relaxed (gap #1). | REG-20, MP-17 |
| 20 | Is **7 days** the right purge window for unverified applications, and should the address then be free for re-registration? **[NEW]** | Too short strands slow applicants; too long holds addresses hostage. | REG-24, ADM-12 |
| 21 | Should the blocked-login reason be shown in full to the member, or only logged, for **rejected** applications? Assumed shown with the rejection reason (IAM-16). **[NEW]** | A rejection reason may be sensitive (failed vetting); the customer may prefer "contact the Membership Secretary". | IAM-16, REG-09 |
| 22 | Should password reset be **blocked for archived or rejected** accounts, or allowed to complete and simply leave them inactive? Assumed allowed, gates unchanged. **[NEW]** | Affects whether the reset endpoints leak account state, and what an archived member sees. | IAM-05, IAM-16 |
| 23 | Should the verification link **deep-link into the installed PWA** (PLT-06) where the member has one, or always open the browser? **[NEW]** | Universal/app links need domain-association files and platform config; deciding late means reissuing links. | REG-21, PLT-06 |
| 24 | Confirm the **24-hour** verification/setup link TTL. **[NEW]** | Shorter is safer but strands applicants who read mail the next morning; reset stays at the workbook's 20 minutes either way. | REG-22, ADM-12 |
| 25 | Is **Stripe card checkout** the only online dues rail for Phase 1, with cheque, Zelle and cash recorded through the REG-16 override? **[NEW — Rev 8]** | Stripe is the only provider built. Anything else is manual today. | #4, REG-18, DON-01 |
| 26 | Where should scheduled jobs run: an in-process Nest scheduler, or an external cron/queue? No job runner exists yet. **[NEW — Rev 8]** | Blocks REG-19 reminders, REG-24 purge, MP-05 birthday recognition and the #13 renewal lapse. | REG-19, REG-24 |
| 27 | Is a **7-day JWT with no refresh token and no server-side session list** acceptable for Phase 1? Password reset and admin changes already revoke tokens by credential epoch. **[NEW — Rev 8]** | IAM-12 asks for idle timeout and session management. A role grant also needs a sign-out to take effect. | IAM-12, IAM-19 |
| 28 | Is **MFA** (IAM-03) required for officers at go-live, or deferrable? **[NEW — Rev 8]** | Officers can read Tier-3 financial data and override gates. | IAM-03, IAM-09 |
| 29 | Does a **chapter transfer** need approval from the receiving Chapter Lead, or is an admin edit enough? Today an admin can PATCH `chapterId` directly. **[NEW — Rev 8]** | Decides whether CHP-07 is a workflow or a field edit. | CHP-07 |
| 30 | Should spouse and children be **editable after joining** by the member, by an admin, or both? **Answered 27-Sep-2026:** optional at joining, and the member adds or edits them after sign-in. Admin editing is still to be decided. **[NEW — Rev 8]** | Household management is the largest remaining MP gap. | MP-04, MP-17, MP-18 |
| 31 | Should the framework's generic **`/register` screen and `POST /auth/register`** be removed from the portal? Accounts created there are refused at login, but registration still returns a working token. **[NEW — Rev 8]** | Closes a side door around vetting. It needs a framework option to switch the route off. | REG-01, IAM-14 |
| 32 | Is the **Contact Us** form (built, not in the workbook) in scope, and who receives it (`CONTACT_TO_EMAIL`)? **[NEW — Rev 8]** **Answered by RROA-DEV (Rev 9):** in scope as HOM-04; it goes to the RROA portal email address. Public vs signed-in is #43. | It is live but untraced to any requirement. | COM, PLT |
| 33 | RROA-DEV §9 says there is **one membership tier: Lifetime**, with no automatic upgrades. The portal seeds Annual ($50), Lifetime ($500), Youth ($0) and Associate ($25), and MP-10, ADM-10 and DON-09 describe several tiers. Should the other tiers be deactivated, and what happens to members already on them? **[NEW — Rev 9]** | Changes the join form, the dues amount and the §5 status machine, and makes #13 (annual renewal) moot. | MP-10, ADM-10, DON-09, #5, #13 |
| 34 | Is **5 children** (`RROA-DEV!M2`) a hard cap on the profile, or only the join-form limit? Today `/join` allows 3 and My profile has no cap. **[NEW — Rev 9]** | Decides whether the server enforces a cap. | MP-18, MP-25 |
| 35 | `RROA-DEV!M4` lets **only an Admin** remove a spouse or child. Members can remove them today, and there is no admin endpoint. Should the self-service delete be withdrawn? **[NEW — Rev 9]** | This changes shipped behaviour. | MP-17, MP-18, MP-26 |
| 36 | Is the yearly tax letter **only** the Finance Secretary's uploaded PDF (TAX-08), or should the portal also generate a consolidated statement (TAX-02)? **[NEW — Rev 9]** | Generating a statement needs all gifts, refunds and wording in the portal. Uploading needs only DOC. | TAX-02, TAX-08 |
| 37 | Wall of Fame, participant lists, Top Volunteers and **member maps** show members to each other. Do they honour the directory opt-out (MP-19)? How precise is a map pin: street, ZIP or city? Which geocoding service is used for US addresses and for Rajasthan villages? **[NEW — Rev 9]** | Home addresses on a map are sensitive, even behind login. | DON-14, EVT-21, VOL-06, HOM-03 |
| 38 | Does the single volunteer-interest option (`RROA-DEV!V1`) **replace** the `volunteerInterests` multi-select, or sit alongside it? **[NEW — Rev 9]** | The multi-select is built and feeds VOL-02. | MP-12, MP-27 |
| 39 | "RROA's Gmail (Google) storage": is it **Google Drive or a Workspace shared drive**? Which account owns it, and may the portal use a service account? Do the role accounts in DOC-05 exist? **[NEW — Rev 9]** | This is a new external integration with credentials, quota and folder-sharing automation. | DOC-01…05 |
| 40 | Which **SMS** and **WhatsApp** providers are used for event invitations and reminders? Do invitations honour communication opt-outs? **[NEW — Rev 9]** | Extends #7. E4 sends to *every* registered address and number. | EVT-07, EVT-22, COM-02, COM-04 |
| 41 | How is **retention** enforced: automatic deletion at 5 or 10 years, or a review list for the Finance Secretary? **[NEW — Rev 9]** | Needs the scheduled-job runner (#26). | FIN-02, TAX-08, DOC-07, ADM-08 |
| 42 | Wall of Fame **scope**: all-time or by year, any minimum gift, and do dues payments count? **[NEW — Rev 9]** | Decides the read model. | DON-10, DON-14 |
| 43 | Contact Us: RROA-DEV puts it on the **logged-in** home page, but the built form is **public**. Should it stay public? Should copies be kept, and at which DOC level (RROA-DEV §8 review point)? **[NEW — Rev 9]** | The public form currently has no member identity attached. | HOM-04, #32 |
| 44 | RROA-DEV §8 proposes letting **Admins** see yearly tax letters (level 3), while §2 says the member and the Finance Secretary only. Which applies? **[NEW — Rev 9]** | Access rule for TAX-08. | TAX-08, DOC |
| 45 | `RROA-DEV!D4` hides an anonymous donor's name "from the Wall of Fame **and from reports**", while D15 and DON-04 let the Finance Secretary see every donation. Is the name hidden only in member-facing views, or in finance reports as well? **[NEW — Rev 9]** | Receipts and tax letters still need the name. | DON-04, DON-17, RPT-03 |
| 46 | Who is **"Admin"** in RROA-DEV: the `admin` / `super_admin` roles only, or also the President? Is the President deliberately excluded from the Finance module and from the all-donations view? **[NEW — Rev 9]** | Every Rev 9 permission mapping depends on it. | §3.1, FIN-01, DON-17 |

---

## 24. Traceability summary

| Source tab | Rows of requirements | Mapped to modules |
|---|---|---|
| High level requirements | 7 categories | All |
| Member profile | 15 requirements + 30 field definitions | MP, DIR, CHP, IAM |
| Spouse profile | 14 field definitions | MP |
| Child profile | 9 field definitions | MP, REC |
| Member Registration process | 17 requirements + 5-stage status machine | REG, IAM |
| Donations and Charity Management | 14 requirements | DON, TAX, CHP, RPT |
| Events & Volunteer Management | 18 requirements | EVT, VOL, REC, CHP |
| Communications | 12 requirements | COM, GOV, P2P, DIR |
| Administration | 11 requirements | ADM, IAM, CHP, RPT |
| Non Functional | 9 requirements | PLT |
| **RROA-DEV** (Rev 9 source, .docx) | 58 items: M1–M4, D1–D19, E1–E17, V1–V7, H1–H4, F1–F4, S1–S3, plus the §8 level model and the §9 exclusions | MP, DON, TAX, EVT, VOL, REC, RPT, ADM, IAM, CHP, **FIN**, **HOM**, **DOC**: the full crosswalk is in §26 |

**Total:** 103 workbook requirement lines + 53 field definitions → **16 modules, 3 shared services, ~209 traced requirements** (including 69 marked **[NEW]** or **[REVISED]** — 40 identified gaps, 14 from the Revision-2 customer instruction on activation gating and minimum age, 12 from Revision 3 on mandatory email and code verification, and 3 from Revision 4 folding password reset onto the same code mechanism. Revisions 4–7 rewrote IAM-01, IAM-05, IAM-06, IAM-18, REG-12, REG-21, REG-22 and ADM-12 rather than adding requirements: one mechanism — an emailed, single-use, purpose-scoped **link** — serves every credential flow. Revision 7 restored IAM-01 and IAM-06 to the workbook's original wording, so both are traced to source again rather than to a customer instruction).

**Revision 9:** RROA-DEV's 58 items resolve to **22 Covered, 6 Refines, 7 Conflicts and 23 New** (§26.1). Together they produce **43 new requirement IDs** (MP-25…27, DON-14…18, TAX-08…09, EVT-16…26, VOL-10…13, REC-07…08, FIN-01…05, HOM-01…04, DOC-01…07), and **no removals**. Some items both refine an existing row and add a new one. §26.1 gives each item's disposition. The tracked total is now **225 IDs** in §25.

**Build status:** see §25 for each requirement's implementation status, with evidence and a prioritised gap backlog.

*Note: rows 45–64 of the `Member profile` tab contain an unfilled "Column 1–4 / Required?" template with no content and were excluded as vestigial.*

---

## 25. Implementation status and gap register **[NEW — Rev 8]**

**Reviewed:** 27-Sep-2026, against `helix-x-rawla` at commit `a90ecd6` and the linked `framework/helix-x-backend` and `framework/helix-x-web` checkouts.

**Re-verified (Rev 9):** 30-Sep-2026 at `4f7dba8`. The commits since `a90ecd6` are the household family step and editing, the My-profile editing pass, Docker images, PostgreSQL support and the move from TypeORM migrations to numbered SQL files. Rev 8 had already recorded their functional effect. None of them adds DON, EVT, VOL, REC, FIN, HOM or DOC code. The Rev 9 IDs are appended to each table below, and the new modules have their own tables in §25.4A.

### 25.1 Legend and method

| Mark | Meaning |
|---|---|
| ✅ | **Done.** The requirement is met end to end: backend rule, API and screen where one is needed. |
| 🟡 | **Partial.** Some of it is built. The *Gap* column says exactly what is missing. |
| ❌ | **Not started.** No entity, endpoint or screen exists. |

Paths in the evidence column are short forms of these locations:

- `cc/` is `apps/backend/src/modules/community-core/`.
- `fe/` is `apps/frontend/src/plugins/`.
- `fw-auth/` is `framework/helix-x-backend/packages/authentication/src/`.

A status comes from reading the code, not from running it. The only automated coverage is `gate-rules.spec.ts`, `dues-payment.spec.ts`, `member-registration.spec.ts` and the frontend plugin-activation suite.

### 25.2 Roll-up

| Module | Phase | IDs | ✅ | 🟡 | ❌ | Headline gap |
|---|---|---|---|---|---|---|
| MP | 1 | 27 | 14 | 7 | 6 | No household family view, life events, CSV export or completeness indicator. Changing the email address does not reopen the verification gate. |
| REG | 1 | 24 | 21 | 1 | 2 | There is no job runner, so the awaiting-payment reminders (REG-19) and the unverified purge (REG-24) never run. Offline reference verification cannot be recorded. |
| IAM | 1 | 20 | 13 | 3 | 4 | No MFA, impersonation, secondary identity check or youth accounts. Sessions are a 7-day JWT. |
| CHP | 1 | 7 | 3 | 1 | 3 | No chapter dashboard or transfer workflow. Chapter finance waits on DON/EVT. |
| ADM | 1 | 13 | 5 | 2 | 6 | No backup/restore, workflow engine, retention policy, data export or deliverability monitoring. |
| PLT | 1 | 11 | 1 | 6 | 4 | No PWA and no observability. Uptime, load, concurrency and accessibility are unmeasured. |
| DIR | 2 | 9 | 2 | 2 | 5 | Only the active-member list exists. |
| DON | 2 | 18 | 0 | 1 | 17 | Only the dues rail exists. |
| TAX, EVT, VOL, REC, COM, GOV, P2P, RPT | 2–4 | 80 | 0 | 0 | 80 | Not started. Includes the Rev 9 IDs TAX-08/09, EVT-16…26, VOL-10…13 and REC-07/08. |
| FIN **[Rev 9]** | 2 | 5 | 0 | 0 | 5 | Not started. |
| HOM **[Rev 9]** | 2 | 4 | 0 | 1 | 3 | Only Contact Us exists, and it is a public form (HOM-04). |
| DOC **[Rev 9]** | 2 | 7 | 0 | 0 | 7 | No document storage of any kind, and no Google integration. |
| **Total** | | **225** | **59** | **24** | **142** | Rev 8: 182 / 59 / 21 / 102. |

The cross-cutting services are tracked in §25.3.7. Phase 1 (MP, REG, IAM, CHP, ADM, PLT) has 102 IDs after Rev 9 (99 before): **57 done (~56%), 20 partial (~20%), 25 not started.** Phases 2–4 are almost entirely not started.

### 25.3 Phase 1 — per requirement

#### 25.3.1 MP — Member Profile & Household

| ID | Status | Evidence | Gap / next action |
|---|---|---|---|
| MP-01 | ✅ | `cc/entities/member.entity.ts`, `cc/controllers/member.controller.ts` | — |
| MP-02 | 🟡 | `GET /members` in `cc/providers/member.service.ts` `list()`; `fe/members/pages/MembersListPage.tsx` | Text search covers only name, email, phone and Member ID. Filters cover only chapter, gotra, caste, tier and status. **Missing:** skills and village filters, saved filters, **CSV export**. |
| MP-03 | ✅ | `GET /members/:id`, `fe/members/pages/MemberDetailPage.tsx` | The detail view is tier-filtered by `ProfileVisibilityService`. |
| MP-04 | 🟡 | `cc/entities/household.entity.ts`, created at join. Spouse and children are listed on My profile, the member detail page and the application review page. | **Missing:** `GET /households/:id`, a family-tree view, parent and sibling relationships (`PATCH /households/:id/relationships`), and admin editing of another member's household. |
| MP-05 | ❌ | `cc/entities/life-event.entity.ts` (the entity only) | No endpoint, no `GET /life-events?window=30d`, no screen, and no job to recognise events. |
| MP-06 | 🟡 | `isPhoneVerified` column; the email is verified by link | No phone or WhatsApp verification flow. |
| MP-07 | 🟡 | Chapter filter on `/members` | No geographic or nearby-member browsing. |
| MP-08 | ✅ | `ChapterService.resolveForState` at join; `chapterIsOverridden` | — |
| MP-09 | ✅ | industry, jobTitle, skills, education and social-link fields; `socialLinksApproved` | — |
| MP-10 | ✅ | `membershipTier` from the `membership_tier` reference list | — |
| MP-11 | ❌ | — | Depends on DON. Only dues payments exist (`membership_payment`). They are not shown on the profile. |
| MP-12 | ✅ | `volunteerInterests` field (reference list) | Matching waits on VOL-02. |
| MP-13 | ❌ | — | Depends on EVT-12. |
| MP-14 | ✅ | `PATCH /members/me`, `fe/members/pages/MyProfilePage.tsx` | — |
| MP-15 | ✅ | `cc/providers/profile-visibility.service.ts` (Tier 3 stripped from the payload) | — |
| MP-16 | ✅ | Every member route is behind `JwtAuthGuard`; `/` is public but shows no member data | — |
| MP-17 | ✅ | Optional **Family** step on `/join` (`fe/registration/components/RegistrationSteps.tsx` `FamilyStep`). After sign-in: `PUT` / `DELETE /members/me/spouse` (`cc/providers/household.service.ts`) and the Household card on My profile (`fe/members/components/HouseholdSection.tsx`). Visible only to the owner and reviewers (`profile-visibility.spec.ts`). | The spouse is a linked profile, not a login: gap #1 is still open. |
| MP-18 | ✅ | Up to 3 children on `/join`. After sign-in: `POST /members/me/children`, `PUT` / `DELETE /members/me/children/:childId`, with no cap of 3. The server assigns sequence and closes gaps on delete. The youth tier is derived from DOB. | Children reaching the minimum age (gaps #2 and #16) are not handled. |
| MP-19 | ✅ | `PATCH /members/me/privacy`, `fe/members/pages/PrivacySettingsPage.tsx` | — |
| MP-20 | ❌ | — | No profile completeness indicator. |
| MP-21 | ❌ | — | No duplicate-merge tool. |
| MP-22 | ✅ | `cc/providers/gate-rules.ts`, `member-activation.service.ts`, `CHK_member_active_implies_gates` | Unit-tested in `gate-rules.spec.ts`. |
| MP-23 | ✅ | `member-registration.service.ts` age check; `registration.minimum_age` setting | — |
| MP-24 | 🟡 | `isEmailVerified` and its provenance columns; set when a link is redeemed | **Security gap:** `PATCH /auth/account` (framework, `fw-auth/providers/auth.service.ts`) changes the email with no hook. `isEmailVerified` stays true, and `EMAIL_CHANGED_NOTICE` is defined but never sent. The change must reopen the gate and send the notice to the old address. That needs an `onEmailChanged` hook in `AuthHooks`. |
| MP-25 **[Rev 9]** | 🟡 | `MAX_CHILDREN_AT_JOIN = 3` in `fe/registration/hooks/useSubmitRegistration.ts` (the zod schema and the "Up to 3 here" hint in `RegistrationSteps.tsx`). `POST /members/me/children` has no cap. The backend `registration.dto.ts` children array allows `@ArrayMaxSize(10)`. | Raise the join-form limit to 5. Decide whether 5 is also a server-side cap on the profile and the DTO (#34). |
| MP-26 **[Rev 9]** | ❌ | **Conflicts with shipped code:** `DELETE /members/me/spouse` and `DELETE /members/me/children/:childId` (`cc/controllers/member.controller.ts`) let the member remove family, and the Household card offers the action. | Withdraw the self-service deletes (#35). Add an admin-only removal endpoint with a reason and an audit row, plus a control on the admin member view. |
| MP-27 **[Rev 9]** | 🟡 | `volunteerInterests` multi-select (reference list) on the profile | There is no single yes/no volunteer-interest option (#38). |

**§4.4 screens.** Built: `/members`, `/members/:id`, `/members/me`, `/members/me/privacy`, and the framework's `/verify-email`, `/set-password`, `/forgot-password` and `/reset-password`. Built at a different path: the applicant status page is `/join/status`, not `/members/me/status`, and activation settings are `/admin/portal-settings`, not `/admin/settings/activation`. The household is edited from a Household card on `/members/me`, not a separate tab. **Missing:** `/households/:id`, the activation-state filter on `/members`, and the admin payment-override control on `/members/:id`, which lives only on the review page.

#### 25.3.2 REG — Registration & Onboarding

| ID | Status | Evidence | Gap / next action |
|---|---|---|---|
| REG-01 | ✅ | `POST /public/registrations`, `/join` (`fe/registration/pages/JoinPage.tsx`). Six steps, including an optional Family step (spouse, up to 3 children, wedding date). | See #31: the framework's `/register` is still mounted. |
| REG-02 | ✅ | `probeDuplicate`, `POST /public/registrations/check-duplicate`, a unique index | The UI does not call `check-duplicate`. It relies on the submit-time 409. |
| REG-03 | ✅ | `cc/entities/consent-record.entity.ts`; version, IP and timestamp are stored | — |
| REG-04 | ✅ | `APPLICATION_RECEIVED` email, sent when the email gate closes | — |
| REG-05 | ✅ | `member-reference-contact.entity.ts`; two references are required unless the application is marked offline | — |
| REG-06 | 🟡 | `offlineVerification` flag; reference `isVerified` columns | No endpoint or control to mark a reference verified. The columns are read-only today. |
| REG-07 | ✅ | `member.service.ts list()` shows active members only to non-reviewers | — |
| REG-08 | ✅ | `NEW_APPLICATION_ALERT` to the Membership Secretary and the chapter's Chapter Lead | Email only. No in-app alert and no escalation (`Administration!B9`). |
| REG-09 | ✅ | approve, reject and request-info endpoints; `fe/membership-admin/pages/RegistrationReviewPage.tsx` | — |
| REG-10 | ✅ | `APPLICATION_APPROVED` with the `RRA-nnnnn` Member ID, sent on activation | — |
| REG-11 | ✅ | `cc/entities/audit-log.entity.ts`, `member-status-history.entity.ts`, `GET /registrations/:id/audit` | — |
| REG-12 | ✅ | Framework `credential-setup/*` endpoints and `/set-password` | — |
| REG-13 | ✅ | `GET /members/me/status`, `/join/status` with `GateChecklist.tsx` | There is no reply path for an info request. The applicant can only read the message. |
| REG-14 | ✅ | State→chapter map at submit; reviewer alert routed to the Chapter Lead | — |
| REG-15 | ✅ | `computeIsActive` in `gate-rules.ts` | — |
| REG-16 | ✅ | `POST /registrations/:id/payment-status` (reason required, audited) | — |
| REG-17 | ✅ | Server-side age gate (`UNDER_MINIMUM_AGE`) | — |
| REG-18 | ✅ | `cc/providers/dues-payment.service.ts` (console and Stripe), `POST /payments/stripe/webhook`, idempotent `settle()`; a $0 tier is recorded as waived | Stripe only (#25). |
| REG-19 | ❌ | Template `AWAITING_PAYMENT_REMINDER` and the `awaiting_payment_reminder_days` setting exist | **No scheduler.** The reminder is never sent (#26). |
| REG-20 | ✅ | The email is required and unique | — |
| REG-21 | ✅ | `credentialFlow.requestLink('email_verification')` at submit | — |
| REG-22 | ✅ | `fw-auth/providers/verification-token.service.ts`: hashed, single-use, TTL, throttled resend | — |
| REG-23 | ✅ | `POST /registrations/:id/email-verification` (reason required) | — |
| REG-24 | ❌ | Template `UNVERIFIED_REMINDER` and the `unverified_purge_days` setting exist | **No scheduler.** Unverified applications are never reminded or purged. |

**Status machine (§5.1).** Every status is present (`cc/constants.ts`): `pending_email_verification`, `pending`, `in_review`, `info_requested`, `rejected`, `approved_awaiting_payment`, `active`, `active_secured` and `archived`.

#### 25.3.3 IAM — Identity, Security & Access

| ID | Status | Evidence | Gap / next action |
|---|---|---|---|
| IAM-01 | ✅ | Credential-setup link after verification | — |
| IAM-02 | ✅ | `PASSWORD_PATTERN` in `fw-auth/models/auth.dto.ts`: 8+ characters, mixed case, a digit and a symbol | — |
| IAM-03 | ❌ | — | No MFA (#28). |
| IAM-04 | ✅ | bcrypt; link tokens stored as SHA-256 | — |
| IAM-05 | ✅ | Framework `password-reset/*`, `/forgot-password`, `/reset-password` | — |
| IAM-06 | ✅ | Hashed, single-use, purpose-scoped tokens with a TTL | — |
| IAM-07 | ✅ | `fw-auth/providers/login-lockout.service.ts`: 5 attempts, 15-minute lock | The thresholds are code defaults, not an admin setting. |
| IAM-08 | ❌ | — | No secondary identity check for sensitive changes. |
| IAM-09 | ✅ | `@Permissions()` on every portal route; roles seeded in `CommunityCoreSeed` | `event_organiser` and `volunteer_coordinator` are not seeded yet (they wait on EVT and VOL). |
| IAM-10 | ✅ | `MemberService.scopeFor` / `assertInScope` (404 when out of scope) | Applied to members and registrations. Nothing else is chapter-scoped yet. |
| IAM-11 | ❌ | — | No impersonation, though the `super_admin` role description promises it. |
| IAM-12 | 🟡 | `credentialEpoch` revokes tokens | The JWT lasts 7 days (`JWT_EXPIRES_IN`), with no idle timeout, refresh token or session list (#27). |
| IAM-13 | ❌ | Only the `youth_member` role exists | No youth account creation, restricted profile or parental link (#2, #16). |
| IAM-14 | ✅ | `MemberGateInterceptor` and `@GateExempt` | — |
| IAM-15 | ✅ | The age check runs server-side before any write | — |
| IAM-16 | ✅ | `buildGateBody` returns `code`, `remediation` and `gates` | — |
| IAM-17 | ✅ | A wrong password always answers `INVALID_CREDENTIALS` | — |
| IAM-18 | ✅ | One `VerificationTokenService` serves every purpose | — |
| IAM-19 | 🟡 | The epoch bump revokes sessions and clears the lockout; `active_secured` is set | No "your password changed" notification email. |
| IAM-20 | 🟡 | Resend cooldown and hourly cap (`credential.resend_*` settings); request endpoints do not reveal whether an account exists | No per-IP rate limiting, and no global throttler on the auth endpoints. |

**Extra hardening item (validation).** `main.ts` installs a global `ValidationPipe({ whitelist: true })`. That pipe strips unknown fields *before* the route-level `forbidNonWhitelisted` pipes run, so those pipes never fire. An unknown field is silently dropped with a 2xx, not answered with a 400. For example, `PATCH /members/me` with `{"bogusField":1}` returns 200. Derived flags are still refused, because the DTOs declare them with `@IsEmpty()`.

**Extra hardening item (sign-up).** *Rev 9 re-check:* the seeded navigation config (`0001_baseline.sql`) now disables the `helix.auth.register` screen and maps `/register` to the portal's `/join`, so the side-door **screen** is closed. The API is not. The framework's `POST /auth/register` is still mounted and returns a live token. A login from such an account is refused because it has no member row. The token already issued is valid until it expires, but it carries no roles (#31).

#### 25.3.4 CHP — Chapters & Multi-Tenancy

| ID | Status | Evidence | Gap / next action |
|---|---|---|---|
| CHP-01 | ✅ | `chapter.entity.ts`, chapter CRUD, `fe/chapters/pages/ChaptersAdminPage.tsx` | The real chapter list is still needed (#6). |
| CHP-02 | ✅ | `state-chapter-map.entity.ts`, `PUT /chapters/state-map` | — |
| CHP-03 | ✅ | See IAM-10 | — |
| CHP-04 | ❌ | — | Depends on DON. |
| CHP-05 | ❌ | — | Depends on EVT. |
| CHP-06 | ❌ | — | No chapter dashboard. |
| CHP-07 | 🟡 | An admin can `PATCH /members/:id` with a `chapterId` | No transfer workflow and no dedicated history, though the audit log records the change. The admin edit UI is also not wired (see 25.3.5). |

#### 25.3.5 ADM — Administration & Master Data

| ID | Status | Evidence | Gap / next action |
|---|---|---|---|
| ADM-01 | ✅ | Reference lists and values; `fe/membership-admin/pages/ReferenceDataPage.tsx` | — |
| ADM-02 | 🟡 | `audit-log` and `fe/membership-admin/pages/AuditLogPage.tsx` | Covers portal actions only. Framework user/role admin changes are not audited, and there is no retention or immutability policy. |
| ADM-03 | ❌ | — | No backup or restore. The SQLite file needs a production database decision. |
| ADM-04 | ❌ | — | No workflow engine (Phase 4). |
| ADM-05 | ❌ | — | No API keys or API management. |
| ADM-06 | ❌ | — | No data export (see MP-02). |
| ADM-07 | ✅ | `VITE_FEATURE_*` flags in `apps/frontend/src/plugins.ts` | These are build-time flags, not runtime toggles. |
| ADM-08 | ❌ | — | No retention or deletion policy (#10). |
| ADM-09 | ✅ | `registration.minimum_age`, `fe/membership-admin/pages/PortalSettingsPage.tsx` | — |
| ADM-10 | 🟡 | Dues per tier are held as `membership_tier` reference-value metadata (`ReferenceDataService.duesForTier`) | They are edited through the generic reference-data screen. There is no dedicated dues editor and no dues history. |
| ADM-11 | ✅ | `registration.payment_required` kill switch, reminder interval and purge days in portal settings | The reminder and purge values are stored but nothing uses them (REG-19/24). |
| ADM-12 | ✅ | Link TTL, cooldown and cap settings pushed to the framework by `cc/providers/credential-policy.service.ts` | — |
| ADM-13 | ❌ | — | No deliverability monitoring. Mail goes out over `console` or SMTP (#18). |

**Unused admin API.** `PATCH /members/:id`, `POST /members/:id/archive` and `POST /members/:id/reinstate` exist, but no screen calls them. A member can be archived or edited only through the API.

#### 25.3.6 PLT — Platform, PWA & Experience

| ID | Status | Evidence | Gap / next action |
|---|---|---|---|
| PLT-01 | 🟡 | Passwords are hashed and tokens are SHA-256 | No encryption at rest for the SQLite database, and TLS is a deployment concern. |
| PLT-02 | ❌ | Only `GET /api/health` exists | No uptime monitoring. |
| PLT-03 | 🟡 | Plugins are code-split and lazy-loaded | No performance budget and no measurement. |
| PLT-04 | 🟡 | Modern React/Vite build | No cross-browser test matrix. |
| PLT-05 | 🟡 | The design system is responsive; `/` uses the full-width layout | Not verified on devices. |
| PLT-06 | ❌ | — | No web manifest and no service worker (#8, #23). |
| PLT-07 | 🟡 | Theme plugin with light/dark | No other adaptive behaviour. |
| PLT-08 | 🟡 | Design-system components | No accessibility audit. |
| PLT-09 | ❌ | — | Not tested for concurrency. SQLite is single-writer. |
| PLT-10 | ✅ | Tier-3 data is stripped server-side and the directory is behind login | Data-residency hosting is still to be decided. |
| PLT-11 | ❌ | Nest logger and `DB_LOGGING` | No structured logs, metrics or error tracking. |

#### 25.3.7 Cross-cutting services

| Service | Status | Evidence | Gap |
|---|---|---|---|
| AUD | 🟡 | `cc/providers/audit.service.ts` | Portal-only (see ADM-02). |
| NTF | 🟡 | `@helix-x/notifications`: console and SMTP adapters, a template registry, a dev outbox; 8 portal templates | Email only. No SMS or WhatsApp, no per-member opt-out, no delivery receipts. 3 of the 8 templates are never sent (payment reminder, unverified reminder, email-changed notice). |
| MDM | ✅ | `reference-list` / `reference-list-value` with 9 lists | Fund and volunteer-role lists wait on DON and VOL. |

### 25.4 Phase 2–4 modules

| Module | IDs | Status |
|---|---|---|
| DIR | DIR-01…09 | ✅ DIR-09. 🟡 DIR-01: `/members` is login-walled and has a `directoryOptIn` flag, but it is an admin-style table, not a directory. 🟡 DIR-05: field visibility is honoured. ✅ DIR-07: Tier-3 data is stripped server-side. ❌ DIR-02, 03, 04, 06, 08. |
| DON | DON-01…13 | 🟡 DON-01: Stripe Checkout for dues only. ❌ DON-02…13. |
| TAX | TAX-01…07 | ❌ All. There is no dues receipt either (see #5). |
| EVT | EVT-01…15 | 🟡 Built: EVT-01, 02 (age-banded tickets with early bird; member rates only), 03, 04, 05, 06, 07 (email), 11. Not built, as RROA-DEV §9 defers them: EVT-08, 09, 10, 12, 13, 14, 15. |
| VOL | VOL-01…09 | 🟡 Built: VOL-06, VOL-07, and VOL-08 in the Rev 9 form (hours corrected before close, audited). Not built, as RROA-DEV §9 defers them: VOL-01…05, VOL-09. |
| REC | REC-01…06 | ❌ All. |
| COM | COM-01…08 | ❌ All. Only transactional email exists. |
| GOV | GOV-01…05 | ❌ All. `/` has a static leadership section. |
| P2P | P2P-01…05 | ❌ All. |
| RPT | RPT-01…06 | ❌ All. `@helix-x/plugin-reports` is registered but carries no portal reports. |

### 25.4A Revision 9 requirements — per requirement

Every Rev 9 ID outside MP (see §25.3.1 for MP-25…27):

| ID | Status | Evidence | Gap / next action |
|---|---|---|---|
| DON-14 | ❌ | — | Wall of Fame read model and screen. Depends on DON-01/04. |
| DON-15 | ❌ | — | A policy statement. No disbursement code is needed. It is recorded through FIN-03. |
| DON-16 | ❌ | `dues-payment.service.ts` has a Stripe **Checkout** provider for dues only | Extend to donations, and add Stripe ACH Direct Debit. The asynchronous settlement needs the webhook path the dues rail already has. |
| DON-17 | ❌ | Tier-3 stripping exists in `profile-visibility.service.ts` for `totalDonations` | No donation entity or list yet. |
| DON-18 | ❌ | `MemberService.scopeFor` provides chapter scoping for members | Reuse it for donations. |
| TAX-08 | ❌ | — | Needs DOC and a per-member document list on the profile, plus a 5-year expiry job (#26, #41). |
| TAX-09 | ❌ | — | Needs TAX-01 and DOC. |
| EVT-16…26 | ✅ | `be/modules/events`, `fe/plugins/events`, migration `0004` | Built. EVT-22 sends email only: SMS has no provider (#40) and is a marked seam. `super_admin` may also create events and read closed-event documents. The 4→5 document level is an access rule, not a Google Drive move (DOC-01). |
| VOL-10…13 | ✅ | `be/modules/events`, `fe/plugins/volunteers` | Built, with VOL-06 (Top Volunteers). |
| REC-07, REC-08 | ✅ | `be/modules/events` (certificates), `fe/plugins/members` | Built on the portal's own file store with the level-2 rule enforced server-side; not on Google storage (DOC-01). |
| FIN-01…05 | ❌ | Roles `finance_secretary` and `general_secretary` are seeded | No module, no `finance:*` permissions, no screens. |
| HOM-01…03 | ❌ | `fe/home` renders the **public** landing page only | A signed-in home view is needed. HOM-03 also needs geocoding (#37). |
| HOM-04 | 🟡 | `@helix-x/plugin-contact` (`/contact`, `layout: 'app.bare'`, no `when` clause) and `POST /api/contact` → `CONTACT_TO_EMAIL`, rate-limited | Built as a **public** form, not linked from a signed-in home, with no member identity attached (#43). |
| DOC-01…07 | ❌ | — | No file storage of any kind: no upload endpoint and no Google Drive client (#39). |

### 25.5 API and screen drift (documented vs built)

The built paths are working and deliberate. The documented surfaces in §4.3, §5.3 and §4.4 should be read as the table below says.

| Documented | Built |
|---|---|
| `GET /verify-email?token=…` (landing) | Framework `GET /api/auth/email-verification/landing` plus the `/verify-email` screen |
| `POST /public/registrations/verify-email` | `POST /api/auth/email-verification/confirm` |
| `POST /public/registrations/resend-link` | `POST /api/auth/email-verification/resend` |
| `POST /members/:id/email-verification` | `POST /registrations/:id/email-verification` |
| `POST /public/registrations/:id/checkout` | `POST /members/me/payments/checkout` (signed in and gate-exempt; consistent with §6.1) |
| `POST /webhooks/payments/membership` | `POST /payments/stripe/webhook`; in dev, `GET /dev/payments/:ref/complete` |
| `GET /registrations?status=pending` / `?status=awaiting-payment` | `GET /registrations?status=<status>`, using the snake-case values from §25.3.2 (for example `approved_awaiting_payment`). It defaults to `pending`. |
| `POST /households/:id/spouse`, `POST /households/:id/children` | `PUT` / `DELETE /members/me/spouse`, `POST /members/me/children`, `PUT` / `DELETE /members/me/children/:childId`. These are self-service and scoped to the caller's session, so no household id is taken from the request. |
| `GET /households/:id`, `PATCH /households/:id/relationships`, `GET /life-events`, `GET /members/:id/donations`, `GET /members/:id/attendance` | **Not built** |
| Screen `/members/me/status` | `/join/status` |
| Screen `/admin/settings/activation` | `/admin/portal-settings` |
| — (undocumented) | `/admin/registrations`, `/admin/registrations/:id`, `/admin/reference-data`, `/admin/audit`, `/admin/chapters` |

### 25.6 Built beyond the requirements

- **Contact Us** (`@helix-x/plugin-contact`, `POST /api/contact`, `VITE_FEATURE_CONTACT`) is not traced to the workbook (#32).
- **Public landing page** `/` (`fe/home`): hero, pillars, join path, benefits, leadership and footer.
- **`info_requested` status** is handled end to end, including its email. §5.1 names the status, but no REG requirement owns it.
- **Dev tooling:** the mail outbox (`/api/dev/outbox`), the console payment provider and `@helix-x/plugin-devtools` (`VITE_FEATURE_DEVTOOLS`).
- **Generic framework admin:** `/admin/users`, `/admin/roles`, `/admin/permissions` and `/admin/navigation`.

### 25.7 Prioritised gap backlog

**P1 — before a Phase-1 go-live**

1. **Email change must reopen the email gate** (MP-24). Add an `onEmailChanged` hook to the framework's `AuthHooks`. Send `EMAIL_CHANGED_NOTICE` and a fresh verification link. This is a security gap.
2. **Scheduled jobs** (REG-19, REG-24): choose a runner (#26), then wire the two existing templates and settings.
3. **Close the `/auth/register` side door** (#31). This needs a framework option to disable the route and hide the screen.
4. **Admin member management UI:** edit, archive and reinstate. Put the payment and email overrides on `/members/:id`. Add a control to mark a reference verified (REG-06).
5. **Household view for admins** (MP-04): a family view at `/households/:id`, and letting the Membership Secretary correct a member's spouse or children. Members can already manage their own.
6. **CSV export and richer filters** on `/members` (MP-02, ADM-06).
7. **Session policy** (IAM-12): shorter access tokens plus refresh, or a documented acceptance of the 7-day JWT (#27). Add a password-changed notice (IAM-19).
8. **Production readiness:** database choice and backups (ADM-03), structured logging and error tracking (PLT-11), rate limiting on auth routes (IAM-20).

**P2 — Phase 1 completion**

MFA for officers (IAM-03, #28), life events and birthday/anniversary recognition (MP-05), profile completeness (MP-20), chapter dashboard and transfer (CHP-06/07), PWA manifest and service worker (PLT-06), accessibility audit (PLT-08), a way to reply to an info request (REG-13), and a dedicated dues editor with history (ADM-10).

**P1 additions (Rev 9)** — shipped behaviour that RROA-DEV changes:

9. **Children cap** (MP-25): allow 5 on `/join`, and settle #34.
10. **Admin-only family removal** (MP-26): withdraw the member `DELETE` endpoints and the UI action, and add an audited admin removal (#35).
11. **Tier model** (#33): if only Lifetime remains, deactivate the other `membership_tier` values in a migration pair (sqlite + postgres, with a `SCHEMA_VERSION` bump) and decide how existing members move.

**P2.5 — Rev 9 Phase 2 foundation**, in dependency order:

1. **DOC** (#39), because receipts, letters, certificates, waivers and bills all need it.
2. **DON + TAX** (DON-16/04/06/18, TAX-01/04/08/09, ADM-06 export).
3. **EVT** with close (EVT-16…26, Mel first), which feeds **VOL-10…12** and **FIN-04**.
4. **FIN** (FIN-01…05).
5. **HOM** (HOM-01…04), **VOL-06/13** and **REC-07/08**.

**P3 — later phases**

DIR as a real opt-in directory. DON and TAX together: receipts are a legal obligation from the first dollar. Then EVT, COM, VOL, REC, GOV, RPT and P2P, in the §22 order.

---

## 26. Crosswalk: RROA-DEV → portal requirements **[NEW — Rev 9]**

**Source:** `RROA_Donations_Events_Volunteers_Requirements.docx`, updated 28-Sep-2026.

### 26.1 Every RROA-DEV item

**Disposition** has four values:

- **Covered.** An existing ID already says this, and nothing was added.
- **Refines.** An existing ID covers it, and RROA-DEV adds detail, captured in a new ID or a note.
- **New.** No existing ID covered it, so a new ID was added.
- **Conflicts.** RROA-DEV differs from an existing ID or from shipped behaviour. Both are kept, and the open question decides.

**Status** is the build status at `4f7dba8` of the portal ID(s) that carry the item.

| RROA-DEV | Requirement (short) | Priority | Module | Portal ID(s) | Disposition | Status |
|---|---|---|---|---|---|---|
| **M1** | Add spouse/child any time after registering; no approval; appears at once | High | MP | MP-17, MP-18 | Covered | ✅ |
| **M2** | Up to 5 children (form allows 3) | High | MP | MP-25 (refines MP-18) | Refines | 🟡 |
| **M3** | Edit spouse/children details any time | High | MP | MP-17, MP-18 | Covered | ✅ |
| **M4** | Only an Admin removes a spouse or child | Low | MP | MP-26 | Conflicts (members can delete today, #35) | ❌ |
| **D1** | Donate online by Stripe or ACH; no Zelle for donations | High | DON | DON-01, DON-16 | Refines | ❌ (Stripe exists for dues only) |
| **D2** | Recurring monthly / quarterly / yearly | Med | DON | DON-02 | Covered | ❌ |
| **D3** | Donor covers the processing fee | Med | DON | DON-03 | Covered | ❌ |
| **D4** | Anonymous: hidden from Wall of Fame and reports; grouped as one line | High | DON | DON-04, DON-14 | Covered (#45 on "reports") | ❌ |
| **D5** | Wall of Fame for logged-in members: donors (names, no amounts, alphabetical) + volunteers | Not given | DON / VOL / HOM | DON-10, DON-14, VOL-13, HOM-01 | New | ❌ |
| **D6** | One common pool, shared out offline, payouts recorded in Finance | Not given | DON / FIN | DON-15, FIN-03 | New (differs from DON-05 funds, §26.3) | ❌ |
| **D7** | Admins record cash and cheques from meetups | High | DON | DON-06 | Covered | ❌ |
| **D8** | In Honor of / In Memory of + note | Med | DON | DON-07 | Covered | ❌ |
| **D9** | Donation auto-linked to the donor's chapter | Med | DON / CHP | DON-08, CHP-04 | Covered | ❌ |
| **D10** | PDF receipt sent as soon as payment goes through | High | TAX | TAX-01, TAX-09 | Refines | ❌ |
| **D11** | Yearly tax letter prepared offline, uploaded to profile, kept 5 years | High | TAX / DOC | TAX-08 | Conflicts (TAX-02 generates it, #36) | ❌ |
| **D12** | Donations dashboard; Admins + Finance Secretary only | Med | RPT | RPT-03, RPT-06 | Refines | ❌ |
| **D13** | Permanent, uneditable history of donation changes incl. deletions | High | TAX / AUD | TAX-04, ADM-02, AUD | Covered | ❌ (AUD 🟡 portal-only) |
| **D14** | Profile shows own donation history and total | Not given | MP | MP-11 | Covered | ❌ |
| **D15** | Own history only; Admins + Finance Secretary see all | Not given | DON | DON-17, MP-15 | New | ❌ (MP-15 ✅) |
| **D16** | Finance Secretary manages donations; Chapter Lead only own chapter | High | DON / IAM | DON-18, IAM-09, IAM-10 | New | ❌ (roles seeded ✅) |
| **D17** | Alert rules, e.g. > $5,000 → National Chair | Med | ADM | ADM-04 | Covered | ❌ |
| **D18** | Export donations to Excel/CSV | High | ADM / RPT | ADM-06, RPT-02 | Covered | ❌ |
| **D19** | Manage payment-service connections from one screen | Med | ADM | ADM-05 | Covered | ❌ |
| **E1** | Only the 3 Secretaries create events; types Mel / annual chapter / local charity | High | EVT | EVT-16 | New | ❌ |
| **E2** | Event page fields; closing date; Stripe link or Zelle | Not given | EVT | EVT-17, EVT-18, EVT-19 | New | ❌ |
| **E3** | Admin records Zelle/other payments by hand | Not given | EVT | EVT-20 | New | ❌ |
| **E4** | Invitation to every email, and SMS where supported | Not given | EVT / COM | EVT-22, COM-02 | New | ❌ |
| **E5** | Members see each event's participant list | Not given | EVT | EVT-21 | New | ❌ |
| **E6** | Whole family in one step and one payment | High | EVT | EVT-01 | Covered | ❌ |
| **E7** | Early bird discounts | High | EVT | EVT-02 | Covered (early-bird half) | ❌ |
| **E8** | Book a time slot (e.g. blood donation) | Med | EVT | EVT-03 | Covered | ❌ |
| **E9** | Food preference, T-shirt size, hotel details | High | EVT | EVT-04 | Covered | ❌ |
| **E10** | Online waivers; track donated goods | High | EVT | EVT-05, EVT-06 | Covered | ❌ |
| **E11** | No self-cancel after paying; Admin removes; no refunds | Not given | EVT | EVT-23 | Conflicts (EVT-13 refunds, §26.3) | ❌ |
| **E12** | Email + WhatsApp reminders incl. attire guide | High | EVT / COM | EVT-07 | Covered | ❌ |
| **E13** | Organiser live-event dashboard on phone | Not given | EVT | EVT-10 | Covered | ❌ |
| **E14** | Event income and volunteer costs assigned to chapter | High | EVT / CHP | EVT-11, CHP-05, VOL-07 | Covered | ❌ |
| **E15** | Event documents before close; visibility then moves to Finance | Not given | EVT / DOC | EVT-24 | New | ❌ |
| **E16** | Admins post a photos link after the event | Not given | EVT | EVT-25 | New | ❌ |
| **E17** | Close event; docs move to Finance; no additions; no reopen | Not given | EVT / FIN | EVT-26, FIN-04 | New | ❌ |
| **V1** | One volunteer-interest option (replaces the specific list) | Not given | MP | MP-27 | Conflicts (MP-12 multi-select, #38) | 🟡 |
| **V2** | Volunteer at event sign-up, for self and/or children | Not given | VOL | VOL-10 | New | ❌ |
| **V3** | No role or shift choice; assigned and told offline | Not given | VOL | VOL-11 | Conflicts (VOL-01/03, §26.3) | ❌ |
| **V4** | Hours for every volunteer entered at event close | Not given | VOL | VOL-12 | Conflicts (VOL-04/05 check-in, §26.3) | ❌ |
| **V5** | Top Volunteers by hours or events | High | VOL | VOL-06 | Covered | ❌ |
| **V6** | Certificates prepared offline and uploaded to member/child | High | REC | REC-07, REC-03 | Conflicts (REC-01/02 auto-generation, §26.3) | ❌ |
| **V7** | Members and parents download certificates | High | REC | REC-04, REC-08 | Refines | ❌ |
| **H1** | Home page shows both parts of the Wall of Fame | Not given | HOM | HOM-01 | New | ❌ |
| **H2** | Upcoming-event flash summary with register link | Not given | HOM | HOM-02 | New | ❌ |
| **H3** | USA map (home address) and Rajasthan map (ancestral village) | Not given | HOM | HOM-03 | New | ❌ |
| **H4** | Contact Us page emails the RROA portal address | Not given | HOM | HOM-04 | New | 🟡 (public form built) |
| **F1** | Only Finance + General Secretary open the Finance module | Not given | FIN | FIN-01 | New | ❌ |
| **F2** | Documents kept 10 years for audit | High | FIN | FIN-02, TAX-03, ADM-08 | Refines | ❌ |
| **F3** | Finance Secretary records every common-pool payout | Not given | FIN | FIN-03 | New | ❌ |
| **F4** | Closed-event statements and bills move to Finance | Not given | FIN | FIN-04 | New | ❌ |
| **S1** | All documents stored in RROA's Google storage | Not given | DOC | DOC-01 | New | ❌ |
| **S2** | Separate folders by sensitivity | Not given | DOC | DOC-02, DOC-05 | New | ❌ |
| **S3** | One level per document; moves when the level changes | Not given | DOC | DOC-03, DOC-04 | New | ❌ |

**Tally:** 58 items: **22 Covered, 6 Refines, 7 Conflicts, 23 New**. They produced **43 new IDs**. Only 5 of the 58 have any code today: M1 ✅, M3 ✅, M2 🟡, V1 🟡 and H4 🟡.

RROA-DEV §8 (security levels) is carried in §20.4 as the level table and DOC-04/05. Its §9 exclusions are in §26.3.

### 26.2 Existing IDs RROA-DEV does not mention

These rows are **unchanged**. RROA-DEV is silent on them. Unless §26.3 lists them, silence is not exclusion.

| Module | IDs RROA-DEV does not touch |
|---|---|
| DON | DON-12 (pledges), DON-13 (failed-payment dunning, implied by DON-02) |
| TAX | TAX-05 (receipt reissue), TAX-06 (quid pro quo on event tickets, which still applies to paid events), TAX-07 (receipts for offline gifts, implied by D7 + D10) |
| EVT | EVT-14 (waitlist) |
| VOL | VOL-08 (manual hour correction, consistent with VOL-12), VOL-09 (youth chaperone rules) |
| REC | REC-06 (adult recognition) |
| Other | COM, GOV, P2P, DIR, REG, IAM (except IAM-09/10), PLT: RROA-DEV does not cover these areas |

### 26.3 Scope notes: what RROA-DEV §9 leaves out "for now"

You decided (Rev 9) that **nothing is removed from this document** on the basis of RROA-DEV. Each affected row stays exactly as written. This table records RROA-DEV's position, so anyone planning the next build knows the customer does not expect these items in the current scope.

| RROA-DEV §9 "Not included for now" | Existing IDs affected (kept as written) | Open question |
|---|---|---|
| Anything for non-members or the public | EVT-15 (guest registration), the non-member half of EVT-02 (member vs non-member rates). The public `/join`, `/` landing and `/contact` remain, since registration was declared complete. | #43 |
| Choosing a fund for a donation (Scholarship, Heritage); all money goes into one common pool | DON-05, the `fund` entity in §9.1, and the fund dimension of RPT-03 and TAX-01 | — |
| Sharing out money through the portal | None. The portal only records payouts (FIN-03). | — |
| Zelle for donations or repeat payments | DON-01 (lists Zelle), DON-02 | #4 (answered) |
| Membership tiers and automatic tier upgrades; only Lifetime | MP-10, ADM-10, DON-09, the `membership_tier` values seeded today | #33 |
| Assigning volunteer activities and notifying volunteers through the portal | VOL-01 (role registry) | — |
| Automatic role suggestions from profile skills | VOL-02 (skill matching) | #38 |
| Donation or ticket refunds | DON-11, EVT-13, the refund lines of TAX-04 and §9.3 | — |
| Event check-in, QR scanning, printed name badges | EVT-08, EVT-09, the QR field on `attendee` | — |
| Recording who attended events and volunteer activities (future enhancement) | EVT-12, MP-13 (attendance log) | — |
| Volunteers choosing roles and shifts, and volunteer check-in | VOL-03, VOL-04, VOL-05 (automated hours) | — |
| Automatic certificate creation | REC-01 (template builder), REC-02 (auto-generation), REC-05 (verification code) | — |
