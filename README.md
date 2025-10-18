# Setup

To install, run `yarn install`.

To install the SDKs, run `yarn dlx @yarnpkg/sdks vscode` in the workspace root. If prettier ever breaks, run that.

To build all packages, run `yarn workspaces foreach -Avp --topological-dev --no-private run build` in the
`electricui-interface` root, or `yarn build`.

## Linux Deps

You might have issues with node-usb during setup. Ensure that `libusb` and `libusb-devel >1.0.22` are installed.

# Setup Production

Get the latest LTS release of NPM and Yarn.

Get a copy of Forge.

If you're on windows:

> First run `npm install --global --production windows-build-tools` as administrator

Copy in the config file to Forge supplied by Michael to pre-auth you.

`forge init ./directory_somewhere`(as administrator if you're on windows)

And it should work?

#### exFat and symlinks

Symlinks are required for a decent developer experience.

exFAT filesystems seem to have problems given a lack of symlink support, we recommend using a different filesystem for
this project.

# Changelogs, commits, versioning

To setup, yarn install electricui-interface to grab the local deps you need, plus the global deps with the following
command:

```
yarn install -g conventional-changelog-cli commitizen cz-conventional-changelog lerna conventional-github-releaser
```

To commit:

`git cz` instead of `git commit` and it'll walk you through it.

# Folder Structure

Packages are the electricui runtime modules that all get compiled down.

Prototypes are non-functional ideas that haven't reached full development stage, but need code to be somewhere.

Templates are the desktop / mobile template boilerplate projects.

Tools are developer tools that aren't part of the runtime ecosystem.

# Publishing

Done via CD.

## Common problems

> Git diff showing problems after installation.
> `lerna ERR! EUNCOMMIT Working tree has uncommitted changes, please commit or remove changes before continuing.`

Usually this means a yarn.lock file hasn't been committed when package bumps have occurred.

### Bins

Bins need to be included in the package.json files field with their encrypted filename with a wildcard extension, since
their extension will be mutated from .bin to .eui.bin, and the files field is used for both the manifest generation,
then for the package inclusion.

### Licence

The licence is stored in LICENCE_TEMPLATE in this directory, in the template, and arc has a copy internally that the
build tools asks for.
