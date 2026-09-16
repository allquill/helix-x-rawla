import { lazy } from 'react';
import { definePlugin, type PluginContext } from '@helix-x/web';

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));

export default definePlugin({
  async activate(context: PluginContext) {
    context.registerRoute({ id: 'rawla.home.landing', path: '/', component: HomePage });
  },
});
