export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'apps/docs/.vitepress/cache/**', 'apps/docs/.vitepress/dist/**'],
  },
  {
    files: ['**/*.{js,ts,vue}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },
]
