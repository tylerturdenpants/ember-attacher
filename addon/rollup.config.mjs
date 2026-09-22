import { Addon } from '@embroider/addon-dev/rollup';
import babel from '@rollup/plugin-babel';
import fs from 'fs';
import path from 'path';

const addon = new Addon({
  srcDir: 'src',
  destDir: 'dist',
});

const cssEntry = 'src/styles/ember-attacher.css';

function cssHandler() {
  return {
    name: 'css-handler',
    buildStart() {
      this.addWatchFile(path.resolve(cssEntry));
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'styles/ember-attacher.css',
        source: fs.readFileSync(path.resolve(cssEntry), 'utf8'),
      });
    },
  };
}

export default {
  output: addon.output(),

  plugins: [
    // These are the modules that will be available as imports from your addon
    addon.publicEntrypoints([
      'index.js',
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

    // Copy checked-in CSS into dist/styles (implicit-styles / exports["./styles"])
    cssHandler(),

    // Converts .hbs files to JS
    addon.hbs(),

    // Compile <template> in .gjs files
    addon.gjs(),

    // Run JS through Babel so the template colocation plugin wires templates to components
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.gjs', '.ts'],
      configFile: './babel.config.json',
    }),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
};
