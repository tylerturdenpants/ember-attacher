import { defineConfig } from 'vite';
import { extensions, classicEmberSupport, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig(({ mode }) => ({
  // Vite 8 `vite build --mode development` leaves `development|production` unresolved to `production`
  // unless `NODE_ENV=development` or explicit `development` condition is set, which otherwise loads
  // `ember-source/dist/prod` where `runInDebug`/`deprecate`/`warn` are no-ops.
  resolve:
    mode !== 'production'
      ? { conditions: ['module', 'browser', 'development'] }
      : undefined,
  plugins: [
    classicEmberSupport(),
    ember(),
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
  ],
}));
