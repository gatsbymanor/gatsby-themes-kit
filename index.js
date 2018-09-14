#!/usr/bin/env node
const path = require('path')
const yargs = require('yargs')
const yaml = require('js-yaml')
const fs = require('fs-extra')
const loader = require('./lib/loader')
const Schema = require('./cli/schema')
const Reader = require('./cli/reader')

const { spawn, spawnSync, execSync } = require('child_process')


// Checks the existence of yarn package
// We use yarnpkg instead of yarn to avoid conflict with Hadoop yarn
// Refer to https://github.com/yarnpkg/yarn/issues/673
//
// Returns true if yarn exists, false otherwise
// const shouldUseYarn = () => {
//   try {
//     execSync(`yarnpkg --version`, { stdio: `ignore` })
//     return true
//   } catch (e) {
//     return false
//   }
// }

const getDotEnvValue = (key) => {
  if (!key.includes('process.env')) {
    return key
  }

  const variable = key.split('process.env.').slice(1)
  return process.env[variable]
}

const parsePluginOptionsForDotEnv = (oldPlugin) => {

  let options = {}
  Object.entries(oldPlugin.options).forEach(item => {
    let key = item[0]
    let val = getDotEnvValue(item[1])

    options[key] = val
  })

  return options
}

const loadPluginsForGatsbyConfig = (plugins) => {

  const sitePlugins = plugins.map(obj => {
    if (typeof obj === 'object') {
      let newPlugin = {}

      newPlugin.resolve = obj.resolve
      newPlugin.options = parsePluginOptionsForDotEnv(obj)

      return newPlugin
    }

    return obj
  })

  return sitePlugins
}


const findMissingPluginPkgs = (plugins, themePath) => {
  const pkgJson = loader.loadJsonSync(path.join(themePath, `package.json`))
  const dependencies = pkgJson.dependencies

  const missingPlugins = []
  plugins.forEach(plugin => {
    var pluginName = plugin

    if (typeof plugin === 'object')
      pluginName = plugin.resolve

    if (!dependencies.hasOwnProperty(pluginName))
      missingPlugins.push(pluginName)

  })

  return missingPlugins
}


const installSourcePlugins = (plugins, themePath) => {
  const missingPlugins = findMissingPluginPkgs(plugins, themePath)

  if (missingPlugins.length > 0) {

    const missingPkgs = missingPlugins.map(pkg => {
      let yarnArg = `${pkg}@next`
      return yarnArg
    })

    const yarnPkgs = missingPkgs.join(" ")

    // TODO: make yarn optional
    // let cmd = shouldUseYarn() ? spawnSync(`yarnpkg`) : spawnSync(`npm install`)


    // TODO: figure out a way not to block the event loop using promises
    return spawnSync(`yarn add ${yarnPkgs}`, {
      cwd: themePath,
      shell: true,
      stdio: `inherit`,
      env: process.env,
    })
  }

  return null
}

const createDataConfigForTheme = (config) => {
  const { theme, themesDir } = config

  const outputFile = path.join(process.cwd(), themesDir, theme, `theme.json`)
  const themeConfigWriteStream = fs.createWriteStream(outputFile)

  // TODO: For some reasons, if there is too much async/sync going on
  // the event loop stops writing out this file
  const themeConfigBuffer = new Buffer.from(JSON.stringify(config, null, ' '))
  themeConfigWriteStream.write(themeConfigBuffer)
  themeConfigWriteStream.end()

}

const getGatsbyArgs = (argv) => {
  // Skip first two positions, get args for gatsby
  return argv.splice(2).join(" ")
}

const copyHandler = (argv) => {
  const config = Reader.readGatsbyThemesYaml()
  const { theme, themesDir } = config

  const themeDirPublicDir = path.join(process.cwd(), themesDir, theme, `public`)
  const parentDirPublicDir = path.join(process.cwd(), 'public')

  return fs.copy(themeDirPublicDir, parentDirPublicDir)
}

const initHandler = (argv) => {
  const project = path.join(process.cwd(), `gatsby-themes.yaml`)
  const template = path.join(__dirname, 'templates', 'gatsby-themes-v1.yaml')
  return fs.copy(template, project)
}

const processHandler = (argv) => {
  const config = Reader.readGatsbyThemesYaml()
  Schema.validate(config)

  // TODO: figure out prettier logic around this
  if (config.hasOwnProperty('plugins')) {
    config.plugins = loadPluginsForGatsbyConfig(config.plugins)
  } else {

    // TODO: Lots of downstream effects if this is not empty list
    config.plugins = []
  }

  const { theme, themesDir } = config
  const themePath = path.join(process.cwd(), themesDir, theme)

  createDataConfigForTheme(config)
  installSourcePlugins(config.plugins, themePath)

  const gatsbyArgs = getGatsbyArgs(process.argv)


  spawn(`gatsby ${gatsbyArgs}`, {
    cwd: themePath,
    shell: true,
    stdio: `inherit`,
    env: process.env,
  })
}


const getHandler = (argv) => {
  let githubRepo = argv.name
  let alias = argv.name
  if (argv.as !== undefined)
    alias = argv.as

  const config = Reader.readGatsbyThemesYaml()
  const { themesDir } = config
  const themePath = `${themesDir}/${alias}`

  return spawnSync(`gatsby new ${themePath} ${githubRepo}`, {
    cwd: process.cwd(),
    shell: true,
    stdio: `inherit`,
    env: process.env,
  })
}

const setHandler = (argv) => {
  let config = Reader.readGatsbyThemesYaml()
  config.theme = argv.name

  const GatsbyThemesYamlFile = yaml.safeDump(config)
  let outputFile = path.join(process.cwd(), `gatsby-themes.yaml`)

  const themeConfigWriteStream = fs.createWriteStream(outputFile)
  const themeConfigBuffer = new Buffer(GatsbyThemesYamlFile)
  themeConfigWriteStream.write(themeConfigBuffer)
  themeConfigWriteStream.end()

}

yargs
  .command({
    command: 'init',
    aliases: [],
    desc: 'Create a new gatsby-themes.yaml file for themes management.',
    handler: initHandler
  })
  .command({
    command: 'get <name>',
    aliases: [],
    desc: 'Downloads theme <name> to your themes directory from github.',
    handler: getHandler,
    builder: cmd =>
      cmd
        .option(`as`, {
          type: `string`,
          describe: `Download using a different name.`,
        }),
  })
  .command({
    command: 'set <name>',
    aliases: [],
    desc: 'Sets <name> as the default theme in your gatsby-themes.yaml file.',
    handler: setHandler
  })
  .command({
    command: 'copy',
    aliases: [],
    desc: 'Copy public folder of default theme to the parent project.',
    handler: copyHandler
  })
  .command({
    command: '*',
    aliases: [],
    desc: 'Takes a gatsby command to run',
    handler: processHandler
  })
  .demandCommand()
  .help()
  .wrap(72)
  .argv
