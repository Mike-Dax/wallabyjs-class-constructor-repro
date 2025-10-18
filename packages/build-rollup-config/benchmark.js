const { writeFileSync, mkdirSync } = require('fs')
const { join } = require('path')

const gitHash = () => require('child_process').execSync('git rev-parse HEAD').toString().trim()

module.exports = {
  gitHash,
  getName: (packageJson, benchName) => `${packageJson.name}/${benchName}`,
  writeVersionInfo: dirname => {
    mkdirSync(join(dirname, 'results'), {
      recursive: true, 
    })
    writeFileSync(
      join(dirname, `./results/versions.json`),
      JSON.stringify(
        {
          gitHash: gitHash(),
          versions: process.versions,
          dateTime: Date.now(),
        },
        null,
        2,
      ),
    )
  },
}
