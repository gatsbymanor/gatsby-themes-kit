const fs = require('fs-extra')
const loader = require('./lib/loader')

exports.readGatsbyThemesYaml = () => {
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
