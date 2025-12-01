import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import js from '@eslint/js';

export default [
  // Global ignores
  {
    ignores: ['dist/', 'node_modules/', '*.min.js', 'build/', 'coverage/', 'public/'],
  },

  // Base JS and TS configs
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Config for Node.js files (e.g., config files in root)
  {
    files: ['eslint.config.js', 'vite.config.ts', 'vite.config.js', 'postcss.config.js', 'tailwind.config.js'],
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
      'react/react-in-jsx-scope': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Google TypeScript Style Guide: Prefer named imports over default imports
      // Note: This is a warning, not an error, to allow gradual migration
      'import/no-default-export': 'off', // We'll use a custom rule or manual review
      // Enforce consistent import ordering (style guide recommends: imports, then implementation)
      'import/order': 'off', // Can be enabled with eslint-plugin-import if needed
    },
  },
];
