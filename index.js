#!/usr/bin/env node
const path = require('path')
const yargs = require('yargs')
const yaml = require('js-yaml')
const fs = require('fs-extra')
const loader = require('./lib/loader')
const Schema = require('./cli/schema')

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

const getNameOfGatsbyPlugin = (plugin) => {
  // Plugins are either object or string type
  if (typeof plugin === 'object')
    return plugin.resolve

  return plugin
}


const parseObjectTypeGatsbyPlugins = (objPlugin) => {
  let plugin = {}

  plugin.resolve = objPlugin.resolve
  plugin.options = parsePluginOptionsForDotEnv(objPlugin)

  return plugin
}

const loadPluginsForGatsbyConfig = (plugins) => {

  const sitePlugins = plugins.map(obj => {
    if (typeof obj === 'object') {
      return parseObjectTypeGatsbyPlugins(obj)
    }

    return obj
  })

  return sitePlugins
}


const readGatsbyThemesConfig = () => {
  const gatsbyThemesConfigPath = path.join(process.cwd(), `gatsby-themes.yaml`)

  try {
    const isThemesConfigPresent = fs.existsSync(gatsbyThemesConfigPath)
    if (!isThemesConfigPresent)
      return null

      return loader.loadYaml(gatsbyThemesConfigPath)
  } catch (e) {
    console.log(e);
  }
}

const hasPluginInDependencies = (dependencies, plugin) => {
  let pluginName = getNameOfGatsbyPlugin(plugin)

  if (dependencies.hasOwnProperty(pluginName))
    return true

  return false
}

const findMissingPluginPkgs = (plugins) => {

  const { theme, themesDir } = readGatsbyThemesConfig()
  const themePath = path.join(process.cwd(), themesDir, theme)

  const pkgJson = loader.loadJsonSync(path.join(themePath, `package.json`))
  const dependencies = pkgJson.dependencies

  const missingPlugins = []
  plugins.forEach(plugin => {
    const isPluginPresent = hasPluginInDependencies(dependencies, plugin)

    if (!isPluginPresent) {
      let pluginName = getNameOfGatsbyPlugin(plugin)
      missingPlugins.push(pluginName)
    }
  })

  return missingPlugins
}


const installSourcePlugins = (plugins) => {
  const { theme, themesDir } = readGatsbyThemesConfig()
  const themePath = path.join(process.cwd(), themesDir, theme)

  const missingPlugins = findMissingPluginPkgs(plugins)

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

const getThemeJsonConfig = () => {
  const { theme, themesDir, themes } = readGatsbyThemesConfig()
  let themeJson = themes[theme]

  if (themeJson.hasOwnProperty('plugins')) {
    if (themeJson.plugins === null) {
      throw Error(`Error in gatsby-themes.yaml: 'plugins' property cannot be empty.`)
    }

    themeJson.plugins = loadPluginsForGatsbyConfig(themeJson.plugins)
    return themeJson
  }

  // TODO: Lots of downstream effects if this is not empty list
  themeJson.plugins = []
  return themeJson
}

const createDataConfigForTheme = () => {
  const { theme, themesDir, themes } = readGatsbyThemesConfig()

  let themeJson = getThemeJsonConfig()

  const outputFile = path.join(process.cwd(), themesDir, theme, `theme.json`)
  const themeConfigWriteStream = fs.createWriteStream(outputFile)

  // TODO: For some reasons, if there is too much async/sync going on
  // the event loop stops writing out this file
  const themeConfigBuffer = new Buffer.from(JSON.stringify(themeJson, null, ' '))
  themeConfigWriteStream.write(themeConfigBuffer)
  themeConfigWriteStream.end()

}

const getGatsbyArgs = (argv) => {
  // Skip first two positions, get args for gatsby
  return argv.splice(2).join(" ")
}

const copyHandler = (argv) => {
  const { theme, themesDir, themes } = readGatsbyThemesConfig()

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
  createDataConfigForTheme()

  let themeJson = getThemeJsonConfig()
  if (themeJson.hasOwnProperty('plugins')) {
    installSourcePlugins(themeJson.plugins)
  }

  const { theme, themesDir } = readGatsbyThemesConfig()
  const themePath = path.join(process.cwd(), themesDir, theme)
  const gatsbyArgs = getGatsbyArgs(process.argv)


  spawn(`gatsby ${gatsbyArgs}`, {
    cwd: themePath,
    shell: true,
    stdio: `inherit`,
    env: process.env,
  })
}

yargs
  .command({
    command: 'init',
    aliases: [],
    desc: 'Create a new gatsby-themes.yaml file for themes management.',
    handler: initHandler
  })
  .command({
    command: 'copy',
    aliases: [],
    desc: 'Copy the public folder from the default theme.',
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
