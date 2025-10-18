/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require('@yarnpkg/types')

/**
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Workspace} Workspace
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Dependency} Dependency
 */

module.exports = defineConfig({
  async constraints({ Yarn }) {
    // Enforce @electricui modules share identical versions when imported
    for (const dependency of Yarn.dependencies()) {
      if (!dependency.ident.startsWith('@electricui')) { continue }
      if (dependency.type === `peerDependencies`) { continue }

      for (const otherDependency of Yarn.dependencies({ ident: dependency.ident })) {
        if (otherDependency.type === `peerDependencies`) { continue }

        // This is auto-fixable
        dependency.update(otherDependency.range)
      }
    }

    // Enforce peer dependencies of @electricui modules share identical versions across other @electricui modules
    // This is a common cause of intended singletons branching into multiple instances.
    // TODO: Also enforce 'holes' in peer dependency resolution
    for (const dependency of Yarn.dependencies()) {
      if (!dependency.ident.startsWith('@electricui')) { continue }
      if (!dependency.resolution) { continue }

      for (const [peerDependencyIdent, peerDependencyVersion] of dependency.resolution.peerDependencies.entries()) {
        for (const otherDependency of Yarn.dependencies()) {
          if (!otherDependency.ident.startsWith('@electricui')) { continue }
          if (!otherDependency.ident === dependency.ident) { continue }

          for (const [otherPeerDependencyIdent, otherPeerDependencyVersion] of dependency.resolution.peerDependencies.entries()) {
            if (peerDependencyIdent === otherPeerDependencyIdent && peerDependencyVersion !== otherPeerDependencyVersion) {
              // If two @electricui packages share a peer dependency, but they have different versions, error
              dependency.error(`${dependency.ident} and ${otherDependency.ident} both share peer dependency ${peerDependencyIdent} but with different versions: ${peerDependencyVersion} and ${otherPeerDependencyVersion}`)
            }
          }
        }
      }
    }
  },
})