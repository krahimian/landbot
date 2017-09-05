const search = require('zillow').search
const argv = require('yargs').argv
const jsonfile = require('jsonfile')
const Logger = require('logplease')
const nodemailer = require('nodemailer')

const logger = Logger.create('LandBot')
const config = require('./config')

let transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // secure:true for port 465, secure:false for port 587
  auth: {
    type: 'OAuth2',
    clientId: config.gmail.clientId,
    clientSecret: config.gmail.clientSecret
  }
})

const options = config[argv.name]
let data = jsonfile.readFileSync(options.data_path) || {}

search(options.search_options, function(err, results) {
  if (err)
    return logger.error(err)

  logger.info(`Found ${results.length} results`)

  let new_results = []

  console.log(results)

  results.forEach(function(result, index) {
    if (!data[result.zpid])
      new_results.push(result)
  })

  logger.info(`${new_results.length} new results`)

  let html = `<p>Found ${new_results.length} new results</p>`
  new_results.forEach(function(result) {
    html += `<p>`

    if (result.image)
      html += `<img src=${result.image}/>`

    html += `<h2>${result.price} — ${result.info}</h2>`
    html += `<h5>${result.address}</h5>`
    html += `<div>${result.link}</div>`
    html += `</p>`
  })

  let mailOptions = {
    from: config.gmail.user,
    to: config.gmail.to,
    subject: `LandBot: ${argv.name}`,
    html: html,
    auth: {
      user: config.gmail.user,
      refreshToken: config.gmail.refreshToken,
      accessToken: config.gmail.accessToken,
      expires: config.gmail.expires
    }
  }

  if (new_results.length) {
    logger.info('Sending email')

    transporter.sendMail(mailOptions, (error, info) => {
      if (error)
	return logger.error(error)

      logger.info(`Message ${info.messageId} sent: ${info.response}`)

      logger.info('Saving new results to file')

      new_results.forEach(function(result) {
	data[result.zpid] = result
      })

      jsonfile.writeFileSync(options.data_path, data)
      
    })
  }
})
