const yaml = require('js-yaml');
const fs = require('fs-extra')

exports.loadYaml = (path, encoding = 'utf8') => {
  return yaml.safeLoad(fs.readFileSync(path, encoding))
}

exports.loadJsonSync = (path) => {
  return fs.readJsonSync(path)
}
