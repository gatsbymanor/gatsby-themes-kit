const gtk = require('../lib')
const path = require('path')
const { spawn } = require('child_process')


function spawnGatsbyProcess() {

  const themePath = path.resolve(__dirname, themeDir, theme)

  const args = process.argv

  return spawn(`yarn run gatsby ${args}`, {
    cwd: starterThemeArgs.directory,
    shell: true,
    stdio: `inherit`,
    env: process.env,
  })
}

spawnGatsbyProcess()
