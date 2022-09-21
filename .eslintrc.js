module.exports = {
    parser: '@typescript-eslint/parser',
    overrides: [
      {
        files: ['*.*'],
        parser: null,
      },
      {
        files: ['*.ts', '*.tsx'], // Your TypeScript files extension
        parserOptions: {
          project: ['tsconfig.json'], // Specify it only for TypeScript files
        },
      },
    ],
    plugins: ['@typescript-eslint/eslint-plugin'],
    extends: [
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
      'prettier',
      'plugin:prettier/recommended',
    ],
    root: true,
    // env: {
    //   node: true,
    //   jest: true,
    // },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'warn',
    },
  };
  