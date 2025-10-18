// @ts-check
import eslint from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import reactCompiler from 'eslint-plugin-react-compiler'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        // tsconfigRootDir: __dirname,
        // @ts-ignore
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  prettierConfig,
  {
    plugins: {
      'react-compiler': reactCompiler,
      'react-hooks': reactHooks,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
      'react-compiler/react-hooks': 'error',
    },
  },

  // Custom rules
  {
    rules: {
      // Guard against trying to await non-thenables, such as in Promise.all([nonThenable])
      "@typescript-eslint/await-thenable": "error",

      // Turn off rules

      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-enum-comparison": "off",
      "@typescript-eslint/unbound-method": "off",
      "require-await": "off",
      "@typescript-eslint/require-await": "off",

      // This seems to overly error when things are fine, for operations like
      // binary typecache's this.sharedConnectionStateManager.get('typeCache').get(message.messageID)
      "@typescript-eslint/no-unsafe-member-access": "off",

      // These have many false positives
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",

      // Any time 'any' is used as a type override, it's intentional.
      "@typescript-eslint/no-unsafe-argument": "off",

      // False positives with new Promise(resolve => setTimeout(resolve, 0))
      "@typescript-eslint/no-implied-eval": "off",

      // Allow throwing CancellationToken reasons
      "@typescript-eslint/prefer-promise-reject-errors": "off",

      // Prevent dangling promises
      "@typescript-eslint/no-floating-promises": "error",

      // Prevent promises in if statements, etc
      "@typescript-eslint/no-misused-promises": "error"

    }
  }
)