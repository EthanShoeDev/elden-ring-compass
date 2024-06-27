const sortImports = process.env.SORT_IMPORTS === 'true';

/** @type {import("prettier").Config} */
export default {
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  arrowParens: 'always',
  plugins: [
    'prettier-plugin-tailwindcss',
    ...(sortImports ? ['prettier-plugin-organize-imports'] : []),
  ],
  trailingComma: 'es5',
};
