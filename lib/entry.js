#!/usr/bin/env node
const yaml = require('js-yaml')
const fs = require('fs-extra')
const loader = require('./loader')
const yargs = require('yargs');
const { spawn, exec } = require('child_process')
const path = require('path')

exports.loadPlugins = () => {
  const config = loader.loadJsonSync(path.resolve(process.cwd(), 'theme.json'))
  return config.plugins
}

exports.fetchDataFromSources = async (graphql) => {

  const config = loader.loadJsonSync(path.resolve(process.cwd(), 'theme.json'))
  const query = config.data

  try {
    return await graphql(query)
  } catch (e) {
    // TODO: Handle errors when there is parsing issues, prevent silent fail

    throw ` There is an error in your gatsby-themes.yaml. Check your graphql syntax. ${e}`
  }
}
