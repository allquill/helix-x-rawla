import { CREDENTIAL_TEMPLATES, portalUrl, type NotificationTemplate } from '@helix-x/backend';
import { PORTAL_TEMPLATES } from '../constants';

/**
 * The portal's own transactional mail.
 *
 * Registered with `TemplateRegistryService.register`, which overwrites by name,
 * so these also replace the framework's unbranded credential defaults — and do
 * so regardless of module init order, because the framework registers its own
 * only when the name is still free.
 */

export const esc = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string,
  );

const ORG = 'Rajputana Rawla of America';

const layout = (
  heading: string,
  bodyHtml: string,
  action?: { href: string; label: string },
): string => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
  <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin:0 0 12px">${esc(ORG)}</p>
  <h1 style="font-size:20px;margin:0 0 16px">${esc(heading)}</h1>
  <div style="font-size:15px;line-height:1.6;margin:0 0 20px">${bodyHtml}</div>
  ${
    action
      ? `<p style="margin:0 0 20px"><a href="${action.href}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${esc(action.label)}</a></p>
  <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0">If the button does not work, paste this into your browser:<br><span style="word-break:break-all">${action.href}</span></p>`
      : ''
  }
</div>`;

export const simple = (
  name: string,
  subject: (v: Record<string, unknown>) => string,
  heading: (v: Record<string, unknown>) => string,
  body: (v: Record<string, unknown>) => string,
  action?: (v: Record<string, unknown>) => { href: string; label: string },
): NotificationTemplate => ({
  name,
  priority: 'transactional',
  render: (variables) => {
    // `<br>` becomes a line break before the tags are stripped, or the plain-text
    // alternative runs sentences together — "…Membership Secretary.The link is".
    const text = body(variables)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '');
    const act = action?.(variables);
    return {
      subject: subject(variables),
      html: layout(heading(variables), body(variables), act),
      text: act ? `${text}\n\n${act.label}: ${act.href}` : text,
    };
  },
});

export const PORTAL_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  /*
   * The framework's own credential mail, branded.
   *
   * `TemplateRegistryService.register` overwrites by name and the framework
   * registers its unbranded defaults only when the name is still free, so
   * claiming the name here is all it takes. Worth doing for this one above all
   * the others: it is the first thing a new applicant ever receives from us,
   * and it is the only step between applying and having an account.
   */
  simple(
    CREDENTIAL_TEMPLATES.email_verification,
    () => 'Confirm your email address',
    () => 'Confirm your email address',
    () =>
      'You are almost a member. Confirm this address and choose a password, and your application goes straight to the Membership Secretary.<br><br>The link is valid for 24 hours.',
    (v) => ({ href: String(v.link ?? ''), label: 'Confirm my email address' }),
  ),
  simple(
    PORTAL_TEMPLATES.APPLICATION_RECEIVED,
    () => 'We have received your membership application',
    (v) => `Thank you, ${esc(v.firstName)}`,
    () =>
      'Your application is now with the Membership Secretary for review. We will email you as soon as a decision is made.',
    () => ({ href: portalUrl('/join/status'), label: 'View your application status' }),
  ),
  simple(
    PORTAL_TEMPLATES.APPLICATION_APPROVED,
    () => 'Welcome to the Rajputana Rawla of America',
    (v) => `Welcome, ${esc(v.firstName)}`,
    (v) =>
      `Your membership is now active.<br><br>Your Member ID is <strong>${esc(v.memberId)}</strong> — please keep it for your records.`,
    () => ({ href: portalUrl('/members/me'), label: 'Open your profile' }),
  ),
  simple(
    PORTAL_TEMPLATES.APPLICATION_REJECTED,
    () => 'An update on your membership application',
    (v) => `Hello ${esc(v.firstName)}`,
    (v) =>
      `After review, your membership application was not approved.<br><br>${esc(v.reason)}<br><br>If you believe this was in error, please contact the Membership Secretary.`,
  ),
  simple(
    PORTAL_TEMPLATES.INFO_REQUESTED,
    () => 'We need a little more information',
    (v) => `Hello ${esc(v.firstName)}`,
    (v) =>
      `The Membership Secretary has asked for more information before your application can proceed:<br><br><em>${esc(v.message)}</em>`,
    () => ({ href: portalUrl('/join/status'), label: 'Respond to the request' }),
  ),
  simple(
    PORTAL_TEMPLATES.AWAITING_PAYMENT_REMINDER,
    () => 'Your membership dues are outstanding',
    (v) => `Hello ${esc(v.firstName)}`,
    (v) =>
      `Your application has been approved. Your membership becomes active once the ${esc(v.tier)} dues are settled.`,
    () => ({ href: portalUrl('/join/status'), label: 'Complete your membership' }),
  ),
  simple(
    PORTAL_TEMPLATES.NEW_APPLICATION_ALERT,
    (v) => `New membership application: ${esc(v.applicantName)}`,
    () => 'A new application is awaiting review',
    (v) =>
      `<strong>${esc(v.applicantName)}</strong> has applied for membership.<br>Chapter: ${esc(v.chapter ?? 'Unassigned')}<br>Tier: ${esc(v.tier)}`,
    (v) => ({
      href: portalUrl(`/admin/registrations/${esc(v.memberId)}`),
      label: 'Review the application',
    }),
  ),
  simple(
    PORTAL_TEMPLATES.EMAIL_CHANGED_NOTICE,
    () => 'The email address on your account was changed',
    () => 'Your sign-in address has changed',
    (v) =>
      `The email address for your account was changed to <strong>${esc(v.newEmail)}</strong>.<br><br>If this was not you, contact the Membership Secretary immediately — this address can no longer be used to sign in.`,
  ),
  simple(
    PORTAL_TEMPLATES.UNVERIFIED_REMINDER,
    () => 'Please confirm your email address',
    (v) => `Hello ${esc(v.firstName)}`,
    () =>
      'Your membership application is on hold because your email address has not been confirmed yet. Follow the link below to confirm it — otherwise the application will be removed and the address released.',
    (v) => ({ href: String(v.link ?? ''), label: 'Confirm my email address' }),
  ),
];
