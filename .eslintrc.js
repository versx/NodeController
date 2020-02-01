module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
    },
    plugins: [
        '@typescript-eslint',
    ],
    ignorePatterns: ['node_modules/'],
    rules: {
        'comma-dangle': ['error', 'always'],
        'curly': 'error',
        'eqeqeq': ['error', 'always'],
        'indent': ['error', 4],
        'linebreak-style': ['warn', 'unix'],
        'no-cond-assign': ['error', 'always'],
        'semi': ['warn', 'always'],
        'quotes': ['error', 'double']
    },
    reportUnusedDisableDirectives: true,
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        /*'prettier/@typescript-eslint',*/
    ],
};