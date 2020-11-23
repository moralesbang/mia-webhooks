const functions = require('firebase-functions')
const { conversation } = require('@assistant/conversation')

// Constants
const HANDLERS = {
  createUser: 'create_user'
}

// Utils
const logJson = value => console.log('JSON LOGGED 👀 -->', JSON.stringify(value))

// Setup
const app = conversation({
  clientId: functions.config().client.id
})

// Handlers
app.handle(HANDLERS.createUser, conv => {
  logJson(conv)
  conv.add('Registro completado!')
})

exports.fulfillment = functions.https.onRequest(app)
