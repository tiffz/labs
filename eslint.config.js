import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';
import js from '@eslint/js';

export default [
  // Global ignores
  {
    ignores: ['dist/', 'node_modules/', '*.min.js', 'build/', 'coverage/', 'public/', 'storybook-static/'],
  },

  // Base JS and TS configs
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Config for Node.js files (e.g., config files in root)
  {
    files: ['eslint.config.js', 'vite.config.ts', 'vite.config.js', 'postcss.config.js', 'tailwind.config.cjs', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Config for React application source files
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      'react-refresh': pluginReactRefresh,
      'jsx-a11y': pluginJsxA11y,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      ...pluginJsxA11y.flatConfigs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      // Enforced after the SPA a11y audit. Keep these at 'error' so new
      // regressions block CI instead of silently accumulating.
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/control-has-associated-label': 'off',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/media-has-caption': 'error',
      'jsx-a11y/no-autofocus': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-noninteractive-tabindex': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Allow react-three-fiber JSX properties (position, rotation, geometry, material, etc.)
      'react/no-unknown-property': [
        'error',
        {
          ignore: [
            'position',
            'rotation',
            'scale',
            'geometry',
            'material',
            'intensity',
            'object',
            'args',
            'attach',
            'castShadow',
            'receiveShadow',
            'renderOrder',
          ],
        },
      ],
      // Google TypeScript Style Guide: Prefer named imports over default imports
      // Note: This is a warning, not an error, to allow gradual migration
      'import/no-default-export': 'off', // We'll use a custom rule or manual review
      // Enforce consistent import ordering (style guide recommends: imports, then implementation)
      'import/order': 'off', // Can be enabled with eslint-plugin-import if needed
      // Console policy: route diagnostics through shared/utils/serverLogger.
      // `warn` for now because ~40 call sites predate this rule — see the
      // Phase 2 plan in docs/ENGINEERING_AUDIT. Once those are routed, flip
      // to `error`.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Tests may freely use console for diagnostic output; do not warn there.
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/**/__test__/**/*.{ts,tsx}', 'src/shared/test/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },

  // Shared server logger internally uses console to surface bootstrap issues
  // (and has its own explicit comments); exempt it from the rule.
  {
    files: ['src/shared/utils/serverLogger.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // CLI runners / tooling scripts executed via `tsx` print diagnostic output
  // directly to stdout by design; the serverLogger policy does not apply.
  {
    files: [
      'src/beat/tests/**/*.{ts,tsx}',
      'src/beat/utils/nodeAudio.ts',
      'src/beat/utils/bpmAccuracyTest.ts',
      'scripts/**/*.{ts,mjs,js}',
    ],
    rules: {
      'no-console': 'off',
    },
  },
];
