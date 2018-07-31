const yaml = require('js-yaml');
const fs = require('fs-extra')

function hasRequiredKeysInTemplateDataMapping(dataMap) {

  if (dataMap.querySource === undefined) {
    throw new Error("The data mapping for a required template field is missing a 'querySource' key")
  }

  if (dataMap.field === undefined) {
    throw new Error("The data mapping for a required template field is missing a 'field' key")
  }

  return
}

function hasRequiredKeysInThemeConfig(config) {
  if (config === undefined) {
    throw new Error("In gatsby-themes.yaml, this theme config is missing. Please create the missing file with the proper configurations.")
  }

  if (config.mappings === undefined) {
    throw new Error("In gatsby-themes.yaml, this theme config needs a 'mappings' key.")
  }

  if (config.query === undefined) {
    throw new Error("In gatsby-themes.yaml, this theme config needs a 'query' key.")
  }

  if (config.develop === undefined) {
    throw new Error("In gatsby-themes.yaml, this theme config needs a 'develop' key.")
  }

  if (config.build === undefined) {
    throw new Error("In gatsby-themes.yaml, this theme config needs a 'build' key.")
  }

  return
}


function checkForKeyInMapping(key, mappings) {
  const exists = key in mappings

  if (!exists) {
    throw new Error(`${key} not found in 'mappings' field of gatsby-themes.yaml`)
  }
}

exports.loadYaml = (path, encoding = 'utf8') => {
  // Loads yaml file
  return yaml.safeLoad(fs.readFileSync(path, encoding))
}

exports.loadJson = async (path, encoding = 'utf8') => {
  const config = await fs.readJson(path)

  hasRequiredKeysInThemeConfig(config)

  return config
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
  // TODO: There is some mixed logic in here when it comes to error checking. Refactor later
  // Must be able to parse for null values and undefined if user does not specify
  checkForKeyInMapping(key, mappings)

  const templateDataMapping = mappings[key]
  hasRequiredKeysInTemplateDataMapping(templateDataMapping)

  if (templateDataMapping.querySource === null
      || templateDataMapping.field === null
  ) {
    return null
  }

  const { querySource, field } = templateDataMapping

  return queryResult['data'][querySource][field]
}
