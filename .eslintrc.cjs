module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:react-hooks/recommended',
    'plugin:tailwindcss/recommended',
    'plugin:@tanstack/eslint-plugin-query/recommended',
    // 'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'packages', 'scripts'],
  parser: '@typescript-eslint/parser',
  plugins: [
    'react-refresh',
    'eslint-plugin-react-compiler',
    '@typescript-eslint',
    'import',
  ],
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
  settings: {
    react: { version: 'detect' },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['./tsconfig.json', './tsconfig.node.json'],
      },
    },
  },
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react-compiler/react-compiler': 'error',
    '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: {
          attributes: false, //If you use void in http attributes the promise will not execute
        },
      },
    ],
    '@typescript-eslint/array-type': ['error', { default: 'generic' }],
    // prevent importing radix unless in @/components/ui folder using import/no-restricted-paths
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './src/',
            from: './node_modules/@radix-ui/',
            except: ['./react-icons/'],
            message: 'Do not import outside of @/components/ui',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['./src/components/ui/**/*'],
      rules: {
        'import/no-restricted-paths': 'off',
      },
    },
  ],
};
