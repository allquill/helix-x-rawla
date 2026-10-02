import { portalUrl, type NotificationTemplate } from '@helix-x/backend';
import { esc, simple } from '../../community-core/templates/portal-templates';
import { EVENT_TEMPLATES } from '../constants';

/** `$1,250.00` from minor units. */
export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/** "Saturday, March 20, 2027 at 6:00 PM CDT", in the event's own zone. */
export function formatWhen(event: { startsAt: Date; timezone: string }): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: event.timezone,
    dateStyle: 'full',
    timeStyle: 'short',
  })
    .format(event.startsAt)
    .concat(' ', shortZone(event));
}

function shortZone(event: { startsAt: Date; timezone: string }): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: event.timezone, timeZoneName: 'short' })
    .formatToParts(event.startsAt)
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? '';
}

const line = (label: string, value: unknown): string =>
  value ? `<strong>${esc(label)}:</strong> ${esc(value)}<br>` : '';

/**
 * Mail the events module sends. The links are frontend routes owned by the
 * `events` plugin — change a path there and these 404 with nothing failing at
 * build time.
 */
export const EVENT_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  simple(
    EVENT_TEMPLATES.INVITATION,
    (v) => `You are invited: ${v.title}`,
    (v) => String(v.title ?? ''),
    (v) =>
      `${line('When', v.when)}${line('Where', v.venue)}${line('Register by', v.closesOn)}` +
      (v.description ? `<br>${esc(v.description).replace(/\n/g, '<br>')}` : ''),
    (v) => ({ href: portalUrl(`/events/${v.eventId}`), label: 'View the event and register' }),
  ),
  simple(
    EVENT_TEMPLATES.REMINDER,
    (v) => `Reminder: ${v.title} is coming up`,
    (v) => `See you soon, ${esc(v.firstName)}`,
    (v) =>
      `${line('Event', v.title)}${line('When', v.when)}${line('Where', v.venue)}` +
      (v.attireGuide ? `<br><strong>What to wear:</strong><br>${esc(v.attireGuide).replace(/\n/g, '<br>')}<br>` : '') +
      (v.slots ? `<br><strong>Your time slots:</strong><br>${esc(v.slots).replace(/\n/g, '<br>')}<br>` : '') +
      (v.balance
        ? `<br>There is a balance of <strong>${esc(v.balance)}</strong> still to pay on your registration.`
        : ''),
    (v) => ({ href: portalUrl(`/events/${v.eventId}/registration`), label: 'Open your registration' }),
  ),
  simple(
    EVENT_TEMPLATES.REGISTRATION_RECEIVED,
    (v) => `Your registration for ${v.title}`,
    (v) => `Thank you, ${esc(v.firstName)}`,
    (v) =>
      `We have your registration for <strong>${esc(v.title)}</strong>.<br><br>` +
      `${line('When', v.when)}${line('People registered', v.attendeeCount)}${line('Total', v.total)}` +
      (v.owes ? '<br>Your places are held. Please complete the payment to confirm them.' : ''),
    (v) => ({ href: portalUrl(`/events/${v.eventId}/registration`), label: 'Open your registration' }),
  ),
  simple(
    EVENT_TEMPLATES.REGISTRATION_CONFIRMED,
    (v) => `You are confirmed for ${v.title}`,
    (v) => `You are confirmed, ${esc(v.firstName)}`,
    (v) =>
      `Your payment of <strong>${esc(v.paid)}</strong> has been received and your registration for ` +
      `<strong>${esc(v.title)}</strong> is confirmed.<br><br>${line('When', v.when)}`,
    (v) => ({ href: portalUrl(`/events/${v.eventId}/registration`), label: 'Open your registration' }),
  ),
  simple(
    EVENT_TEMPLATES.REGISTRATION_REMOVED,
    (v) => `Your registration for ${v.title} has been removed`,
    (v) => `Hello ${esc(v.firstName)}`,
    (v) =>
      `An administrator has removed your household's registration for <strong>${esc(v.title)}</strong>.<br><br>` +
      `${line('Reason', v.reason)}<br>If you have paid, please contact the organisers about your payment.`,
  ),
];
