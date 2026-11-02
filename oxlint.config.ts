import { defineConfig } from 'oxlint';
import { defineShoemakerConfig } from 'shoemaker-oxlint-config';

// The shared strictness model (every category and plugin rule at `error`,
// each rejected rule `off` with its reason) lives in shoemaker-oxlint-config.
// Only this repo's own choices are below, each with its reason above it.
export default defineConfig(
  defineShoemakerConfig({
    scope: 'elden-ring-compass',
    react: true,
    tanstackRouter: true,
    web: true,
    playwright: true,
    testingLibrary: true,
    ignorePatterns: [
      // Cloned upstream repos read as docs (gitignored).
      'docs/cloned-repos-as-docs/**',
      // Generated game data from the erdb project; not hand-linted.
      'apps/web/src/assets/erdb/**',
      'apps/web/src/lib/elden-ring-raw-db/**',
      'CLAUDE.md',
    ],
    rules: {
      // Save-file, BND/BHD archive, param and share-code parsing is bit-field
      // work (flag bitmasks, gaitem handles, `>>> 0` unsigned coercion).
      'no-bitwise': 'off',
      // Sequential `await` in a loop is intentional here (ordered IO,
      // backpressure in the archive unpackers), not a perf bug.
      'no-await-in-loop': 'off',
      // Game data and JSON payloads carry null.
      'unicorn/no-null': 'off',
      // Binary-format offsets and game constants read fine as literals.
      'no-magic-numbers': 'off',
      // Web Workers' postMessage takes a transfer list, not a targetOrigin; this
      // rule targets cross-window `window.postMessage` and misfires on the
      // save-parser worker (`self.postMessage`/`worker.postMessage`).
      'unicorn/require-post-message-target-origin': 'off',
      // `@elden-ring-compass/…` package names in comments read as tags.
      'jsdoc/check-tag-names': 'off',
      // Default depth 2 cannot see label text through layout wrapper divs; 4 reaches real markup.
      'jsx-a11y/control-has-associated-label': ['error', { depth: 4 }],
      // oxlint's port ships no element→role map, so these are eslint-plugin-jsx-a11y's
      // documented defaults; `<ul role="listbox">` with `role="option"` is the ARIA pattern.
      'jsx-a11y/no-noninteractive-element-to-interactive-role': [
        'error',
        {
          ul: [
            'listbox',
            'menu',
            'menubar',
            'radiogroup',
            'tablist',
            'tree',
            'treegrid',
          ],
          ol: [
            'listbox',
            'menu',
            'menubar',
            'radiogroup',
            'tablist',
            'tree',
            'treegrid',
          ],
          li: ['menuitem', 'option', 'row', 'tab', 'treeitem'],
          table: ['grid'],
          td: ['gridcell'],
          fieldset: ['radiogroup', 'presentation'],
        },
      ],
    },
  }),
);
