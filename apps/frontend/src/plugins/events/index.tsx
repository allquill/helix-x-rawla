import { lazy } from 'react';
import { definePlugin, type PluginContext } from '@helix-x/web';

const EventsListPage = lazy(() => import('./pages/EventsListPage').then((m) => ({ default: m.EventsListPage })));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage').then((m) => ({ default: m.EventDetailPage })));
const EventRegisterPage = lazy(() => import('./pages/EventRegisterPage').then((m) => ({ default: m.EventRegisterPage })));
const MyRegistrationPage = lazy(() => import('./pages/MyRegistrationPage').then((m) => ({ default: m.MyRegistrationPage })));
const AdminEventsPage = lazy(() => import('./pages/AdminEventsPage').then((m) => ({ default: m.AdminEventsPage })));
const AdminEventNewPage = lazy(() => import('./pages/AdminEventNewPage').then((m) => ({ default: m.AdminEventNewPage })));
const AdminEventPage = lazy(() => import('./pages/AdminEventPage').then((m) => ({ default: m.AdminEventPage })));
const WaiverTemplatesPage = lazy(() => import('./pages/WaiverTemplatesPage').then((m) => ({ default: m.WaiverTemplatesPage })));

// Must stay identical to the clauses in manifest.ts.
const CAN_READ = "'events:read' in user.permissions";
const CAN_REGISTER = "'events:register' in user.permissions";
const CAN_ADMIN = "'events:registrations.read' in user.permissions";
const CAN_CREATE = "'events:create' in user.permissions";
const CAN_WAIVERS = "'events:waivers.manage' in user.permissions";

export default definePlugin({
  async activate(context: PluginContext) {
    context.registerRoute({ id: 'rawla.events.list', path: '/events', when: CAN_READ, component: EventsListPage });
    context.registerRoute({ id: 'rawla.events.detail', path: '/events/:id', when: CAN_READ, component: EventDetailPage });
    context.registerRoute({ id: 'rawla.events.register', path: '/events/:id/register', when: CAN_REGISTER, component: EventRegisterPage });
    context.registerRoute({ id: 'rawla.events.registration', path: '/events/:id/registration', when: CAN_REGISTER, component: MyRegistrationPage });
    context.registerRoute({ id: 'rawla.events.admin', path: '/admin/events', when: CAN_ADMIN, component: AdminEventsPage });
    context.registerRoute({ id: 'rawla.events.admin.new', path: '/admin/events/new', when: CAN_CREATE, component: AdminEventNewPage });
    context.registerRoute({ id: 'rawla.events.admin.detail', path: '/admin/events/:id', when: CAN_ADMIN, component: AdminEventPage });
    context.registerRoute({ id: 'rawla.events.waivers', path: '/admin/waivers', when: CAN_WAIVERS, component: WaiverTemplatesPage });
  },
});
