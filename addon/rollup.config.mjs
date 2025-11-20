import { Addon } from '@embroider/addon-dev/rollup';

const addon = new Addon({
  srcDir: 'src',
  destDir: 'dist',
});

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

    // Converts .hbs files to JS
    addon.hbs(),

    // Maintains CSS/SCSS from src into dist
    addon.keepAssets(['**/*.css', '**/*.scss']),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
}; 