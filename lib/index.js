const yaml = require('js-yaml');
const fs = require('fs-extra')

exports.loadYaml = (path, encoding = 'utf8') => {
  // Loads yaml file
  return yaml.safeLoad(fs.readFileSync(path, encoding))
}

exports.loadJson = async (path, encoding = 'utf8') => {
  return await fs.readJson(path)
}

exports.fetch = async (graphql, query) => {
  try {
    return await graphql(query)
  } catch (e) {
    // TODO: Handle errors when there is parsing issues, prevent silent fail

    throw e
  }
}

/**
 * Return the value of a template key from query data
 *
 * @param mappings config to map template key to query results
 * @param key the template key we need a value for
 * @param queryResult the result of graphql query
 */
exports.getTemplateValueByKey = (key, mappings, queryResult) => {
  // TODO: Specific Gatsby Themes SDK. Should not be in GQM

  // check if key in mapping
  if (!mappings.hasOwnProperty(key)) return null

  const templateKey = key
  const userMap = mappings[templateKey]

  const source = userMap.querySource
  const field = userMap.field

  return queryResult['data'][source][field]
}
