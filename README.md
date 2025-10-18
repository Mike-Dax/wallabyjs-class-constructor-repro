# Setup

To install, run `yarn install`.

To install the SDKs, run `yarn dlx @yarnpkg/sdks vscode` in the workspace root. If prettier ever breaks, run that.

To build all packages, run `yarn workspaces foreach -Avp --topological-dev --no-private run build` in the
`electricui-interface` root, or `yarn build`.

# Wallaby Reproduction

Jump into `./packages/core/`.

## Validation

Run `yarn test`. Vitest tests pass and work.

## Repro

Run the WallabyJS configure and start in `core`. Initial run seems to work, modifying any file in any way, or running
the debugger causes `AcceptabilityRule is not a constructor`.
