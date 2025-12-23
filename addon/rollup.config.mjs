import { Addon } from '@embroider/addon-dev/rollup';
import babel from '@rollup/plugin-babel';
import * as sass from 'sass';
import path from 'path';

const addon = new Addon({
  srcDir: 'src',
  destDir: 'dist',
});

const scssEntry = 'src/styles/ember-attacher.scss';

function scssHandler() {
  return {
    name: 'scss-handler',
    buildStart() {
      this.addWatchFile(path.resolve(scssEntry));
    },
    generateBundle() {
      const result = sass.compile(path.resolve(scssEntry), {
        style: 'expanded',
        sourceMap: false,
        sourceMapIncludeSources: false,
      });

      this.emitFile({
        type: 'asset',
        fileName: 'styles/ember-attacher.css',
        source: result.css,
      });

      if (result.sourceMap) {
        this.emitFile({
          type: 'asset',
          fileName: 'styles/ember-attacher.css.map',
          source: JSON.stringify(result.sourceMap),
        });
      }
    },
  };
}

export default {
  output: addon.output(),

  plugins: [
    // These are the modules that will be available as imports from your addon
    addon.publicEntrypoints([
      'components/attach-popover.js',
      'components/attach-tooltip.js',
      'components/basic-attacher.js',
      'defaults.js',
      'test-support/index.js',
    ]),

    // These are the modules that will be re-exported by the consuming app
    addon.appReexports([
      'components/attach-popover.js', 
      'components/attach-tooltip.js',
      'components/basic-attacher.js',
    ]),

    // Include any dependencies in the build
    addon.dependencies(),

    // Build SCSS into CSS asset in dist/styles
    scssHandler(),

    // Converts .hbs files to JS
    addon.hbs(),

    // Run JS through Babel so the template colocation plugin wires templates to components
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.ts'],
      configFile: './babel.config.json',
    }),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
}; 