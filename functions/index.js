// const functions = require('firebase-functions')
const { conversation } = require('@assistant/conversation')

// Constants
const HANDLERS = {
  createUser: 'create_user',
  validateUserByEmail: 'validate_email',
  validateUserById: 'validate_id'
}

// Firebase
const admin = require('firebase-admin')
const functions = require('firebase-functions')
admin.initializeApp(functions.config().firebase)
const db = admin.firestore()

function getUserByEmail (email, name) {
  // get user by email
  const usersRef = db.collection('users')
  const query = usersRef.where('email', '==', email).where('name', '==', name)
  query.get().then(snapshot => {
    if (snapshot.empty) {
      logJson('No matching user')
      return
    }
    return true
  })
    .catch(() => {
      logJson('Error getting user')
    })
}

function getUserById (id) {
  // get user by email
  const usersRef = db.collection('users')
  const query = usersRef.where('id', '==', id)
  query.get().then(snapshot => {
    if (snapshot.empty) {
      logJson('No matching user')
      return
    }
    return true
  })
    .catch(() => {
      logJson('Error getting user')
    })
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

app.handle(HANDLERS.validateUserByEmail, conv => {
  logJson(conv)
  const userName = conv.user.name
  const email = conv.user.email
  const response = getUserByEmail(email, userName)
  if (!response) {
    // response the handler false
  }
  // response the handler ok
})

app.handle(HANDLERS.validateUserById, conv => {
  logJson(conv)
  const id = conv.user.id // validate
  const response = getUserById(id)
  if (!response) {
    // response the handler false
  }
  // response the handler ok
})

app.handle('greeting', conv => {
  logJson(conv)
})

exports.fulfillment = functions.https.onRequest(app)
