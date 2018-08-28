#!/usr/bin/env node

const yaml = require('js-yaml')
const fs = require('fs-extra')
const loader = require('./loader')
const yargs = require('yargs');
const { spawn, exec } = require('child_process')
const path = require('path')

const addQueryAlias = (key, value) => {
  const partial = `
    ${key}: ${value}
  `
  return partial
}

const joinPartialQueries = (partials) => {
  var query = ``

  partials.forEach(entry => {
    const key = entry[0]
    const value = entry[1]

    const partial = addQueryAlias(key, value)
    query += partial
  })

  return query
}

const composeGraphqlQuery = (queries) => {

  const entries = Object.entries(queries)
  const query = joinPartialQueries(entries)

  return `{ ${query} }`

}

exports.loadPlugins = () => {
  const config = loader.loadJsonSync(path.resolve(process.cwd(), 'theme.json'))
  return config.plugins
}

exports.fetchDataFromSources = async (graphql) => {

  const config = loader.loadJsonSync(path.resolve(process.cwd(), 'theme.json'))
  const dataQueries = config.data
  const query = composeGraphqlQuery(dataQueries)

  try {
    return await graphql(query)
  } catch (e) {
    // TODO: Handle errors when there is parsing issues, prevent silent fail

    throw e
  }
}
