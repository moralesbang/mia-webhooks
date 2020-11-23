const functions = require('firebase-functions')
const { conversation } = require('@assistant/conversation')
// const admin = require('firabse-admin')

// Constants

const HANDLERS = {
  createUser: 'create_user'
}

// Utils

const logJson = value => console.log('JSON LOGGED 👀 -->', JSON.stringify(value))

// const COLLECTIONS = {
//   conversations: 'conversations'
// }

// Setup

// const db = admin.firestore()
const app = conversation()

// Handlers

app.handle(HANDLERS.createUser, conv => {
  logJson(conv)
  // db.collection(COLLECTIONS.conversations).add(conv)
  conv.add('Registro completado!')
})

exports.fulfillment = functions.https.onRequest(app)
