const Joi = require('joi')

const GatsbyThemesYamlSchema = Joi.object().keys({
  version: Joi.number().integer().min(1).required(),
  themesDir: Joi.string().required(),
  theme: Joi.string().required(),
  data: Joi.string(),
  plugins: Joi.array().items(Joi.string(), Joi.object()),
})

exports.validate = (object) => {

  Joi.validate(object, GatsbyThemesYamlSchema, (err, value) => {
    if (err)
      throw err
  })

}
