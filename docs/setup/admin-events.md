# Administering events

**Administration → Manage events** (`/admin/events`). What you can do here
depends on your [role](/setup/roles.md#events-and-volunteers).

An event moves through three states, in one direction only:

```
Draft  ──publish──▶  Published  ──close──▶  Closed
```

A **draft** is invisible to members. A **published** event takes registrations.
A **closed** event is read-only, permanently — there is no way to reopen it.

## 1. Create the event

**New event** — offered only to the General, Membership and Finance
Secretaries (and the platform administrator).

| Field | Notes |
|---|---|
| Title, category | Mel, annual chapter event, or local charity event |
| Chapter | The sponsoring chapter; leave empty for a national event |
| Location, time zone, starts, ends | Times are entered in the **event's** time zone, not yours |
| Last day to register | Registration is refused from the day after, whatever anyone's clock says |
| Maximum participants | Leave empty for "No maximum" |
| Description, what to wear | Both optional; "what to wear" goes into the reminder email |
| Liability waiver | Pick one if every attendee must sign — see [Waivers](/setup/admin-events.md#waivers) |
| Ask for T-shirt sizes / hotel details | Adds those questions to the registration form |
| Reminder days | e.g. `7, 1`; empty uses the portal setting |
| Stripe payment link, Zelle instructions | Optional, shown beside the portal's own checkout |

It is saved as a draft.

## 2. Add tickets

**Tickets** tab. A ticket is an age band with a price — for example *Under 5*
(free), *Child 5–12*, *Adult 13+*. Each attendee is given the first ticket, in
order, that fits their age **on the day of the event**; members do not choose.

A ticket can have an early-bird price with an end time. The standard price
takes over at that moment by itself.

- A free event still needs one ticket, priced at 0.
- Changing a price never changes what an existing registration owes.
- A ticket somebody holds cannot be deleted; make it inactive instead.

## 3. Add time slots (optional)

**Time slots** tab — appointments within the event, such as blood-donation
times, each with a number of places. Members book them while registering.

## 4. Add the flyer (optional)

**Details** tab → Flyer. An image or a PDF. An image flyer also becomes the
event's picture on the Events page.

## 5. Publish

**Publish**, top right. From this moment:

- members can see the event and register;
- **the invitation is emailed to every active member, and to spouses whose
  email is on file** — once per address. Members who have turned off event
  emails are skipped.

The Details tab shows how many were sent, skipped or failed. Invitations go
out within a few minutes, in batches. Text messages are not sent: the portal
has no SMS provider.

## 6. Follow the registrations

**Registrations** tab: each household, who is coming, what they owe and what
they have paid. **View** shows food preferences, T-shirt sizes, hotel details,
booked time slots and whether the waiver was signed.

### Recording a payment

When a household pays by Zelle, cheque or cash, an **Admin** records it:
**Record payment** → amount, how it was paid, a reference. Your name and the
time are kept with it. When the total is covered the registration becomes
*Confirmed* and the household is emailed.

Card payments made through the portal record themselves.

### Removing a household

A member cannot cancel once they have paid. If they ask, an **Admin** uses
**Remove**, with a reason. Their places are released and they are told by
email. The payments stay on record — **refunds are handled outside the
portal.**

## 7. Reminders

Registered households are reminded by email on the configured days before the
start, with the date, the place, what to wear, their time slots and any
balance still owing.

## 8. Documents, donated goods and costs

| Tab | Use it for | Who |
|---|---|---|
| **Documents** | Financial statements and bills | Admins attach; Admins and all Secretaries read — until the event is closed |
| **Donated goods** | What was donated, how much, by whom | Admins and Secretaries |
| **Costs** | What the event cost, against which chapter. Shows received, costs and net per chapter. | Finance and General Secretary, Admins |

Revenue is counted for the chapter each household belonged to when it
registered.

## 9. Post the photos

**Details** tab → Photos. Paste the link once the event is over. It must be
done **before** closing.

## 10. Enter hours and close

**Hours and close** tab.

1. Everyone who ticked "volunteer" at sign-up is listed — adults and children.
   Enter the hours each served. Enter `0` for someone who did not serve; an
   empty box is not accepted.
2. **Close event…** and confirm.

Closing is permanent. Afterwards:

- nothing can be added or changed — registrations, payments, documents,
  photos or hours;
- the event's statements and bills are visible **only to the Finance and
  General Secretaries**;
- the hours count towards [Top Volunteers](/guide/volunteering.md).

Check before closing that outstanding payments are recorded: the screen warns
you if any registration still owes money.

## Waivers

**Administration → Waivers** (`/admin/waivers`).

Write the waiver text once and attach it to events from their Details tab. A
waiver is never edited in place: **Publish a new version** creates version 2,
and every signature keeps pointing at the version that person agreed to.

None is supplied with the portal. Have the wording reviewed by counsel —
members sign exactly this text.
