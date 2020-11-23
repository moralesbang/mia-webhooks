// const functions = require('firebase-functions')
const { conversation } = require('@assistant/conversation')

// Constants
const HANDLERS = {
  createUser: 'create_user',
  validateUserByEmail: 'validate_email',
  validateUserById: 'validate_id'
}

// Utils
const logJson = (value) =>
  console.log('JSON LOGGED 👀 -->', JSON.stringify(value))

// Firebase SetUp
const admin = require('firebase-admin')
const functions = require('firebase-functions')
admin.initializeApp(functions.config().firebase)
const db = admin.firestore()

// Firebase Functions
async function getUserByEmail (email) {
  return db
    .collection('users')
    .where('email', '==', email)
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        logJson('No matching user')
        return false
      }
      return true
    })
    .catch(() => {
      logJson('Error getting user')
    })
}

async function getUserById (id) {
  return db
    .collection('users')
    .where('id', '==', id)
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        logJson('No matching user')
        return false
      }
      return true
    })
    .catch(() => {
      logJson('Error getting user')
    })
}

async function addUser (name) {
  const docRef = db.collection('users').doc()
  try {
    docRef.set({
      name: name,
      id: '87654321',
      email: 'mompi@getUserByEmail.com'
    })
    return true
    // return Promise.all(setAda)
  } catch (error) {
    return false
  }
}

// Setup conversation
const app = conversation({
  clientId: functions.config().client.id
})

// Handlers
app.handle(HANDLERS.createUser, async (conv) => {
  logJson(conv)
  const name = conv.scene.slots.userName.value // validate
  const response = await addUser(name)
  logJson(response)
  if (response) {
    // conv.scene.next.name = 'HelloWord'
    conv.add('El usuario fue creado exitosamente!')
  }
})

app.handle(HANDLERS.validateUserByEmail, (conv) => {
  const email = conv.user.email
  const response = getUserByEmail(email)
  logJson(response)
  if (!response) {
    conv.scene.next.name = 'UserOnBoarding'
  } else {
    conv.add('El usuario ya está registrado!')
  }
})

app.handle(HANDLERS.validateUserById, async (conv) => {
  logJson(conv)
  const id = conv.scene.slots.userId.value // validate
  const response = await getUserById(id)
  logJson(response)
  if (!response) {
    conv.scene.next.name = 'UserOnBoarding'
  } else {
    conv.add('El usuario ya está registrado!')
  }
})

app.handle('greeting', (conv) => {
  logJson(conv)
})

exports.fulfillment = functions.https.onRequest(app)
