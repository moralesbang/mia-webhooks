// Constants
const HANDLERS = {
  createUser: 'create_user',
  validateUserByEmail: 'validate_email',
  validateUserById: 'validate_id'
}

// Utils
const logJson = (value) =>
  console.log('JSON LOGGED 👀 -->', JSON.stringify(value))

const request = require('request-promise')

// Firebase SetUp
const admin = require('firebase-admin')
const functions = require('firebase-functions')
admin.initializeApp(functions.config().firebase)
const db = admin.firestore()

// Setup conversation
const { conversation } = require('@assistant/conversation')
const app = conversation({
  clientId: functions.config().client.id
})

// Firebase Functions
async function addUser (userData) {
  const emailExist = await getUserByEmail(userData.email)
  const idExist = await getUserById(userData.id)
  if (emailExist || idExist) {
    return false
  } else {
    const docRef = db.collection('users').doc()
    try {
      docRef.set({ ...userData })
      return true
    } catch (error) {
      return false
    }
  }
}

async function getUserByEmail (email) {
  const query = await db.collection('users').where('email', '==', email).get()
  try {
    const snapshot = query.docs[0]
    const data = snapshot.data()
    return data
  } catch (error) {
    return null
  }
}

async function getUserById (id) {
  const query = await db.collection('users').where('id', '==', id).get()
  try {
    const snapshot = query.docs[0]
    const data = snapshot.data()
    return data
  } catch (error) {
    return null
  }
}

// salesforce functions
async function validateInsurance (userData, conv) {
  logJson(conv)
  // salesforce integration
  //

  request(
    {
      url: 'https://university3-dev-ed.my.salesforce.com/services/data/v47.0/query/?q=SELECT+name+from+Account',
      headers: {
        Authorization: 'Bearer 00D4W000008J4iL!AQsAQMpdfU9rc2YyISEWE7S7A9BvJbodIqE4Eg4irp2a8MPBa5.iOUopFAyx6qFRpIqECisdQ4C56oSL6hqKXiPlCTyZkv9I'
      },
      rejectUnauthorized: false
    },
    function (err, res) {
      if (err) {
        logJson(err)
      } else {
        logJson(JSON.parse(res.body).records[3])
      }
    }
  )

  const insurance = true

  if (insurance) {
    conv.scene.next.name = 'ServiceSelection'
  } else {
    conv.add(
      'El usuario no tiene un seguro activo con: ' + userData.insurance + ' '
    )
    conv.scene.next.name = 'EndScene'
  }
}

// Handlers
app.handle(HANDLERS.validateUserByEmail, async (conv) => {
  const email = conv.user.params.tokenPayload.email
  const response = await getUserByEmail(email)
  if (response) {
    conv.add(
      'El usuario con email: ' + response.email + 'ya está registrado! '
    )
    validateInsurance(response, conv)
  } else {
    conv.add('Usuario no registrado ')
    conv.scene.next.name = 'CompleteProfile'
  }
})

app.handle(HANDLERS.validateUserById, async (conv) => {
  const id = conv.session.params.id
  const response = await getUserById(id)
  if (response) {
    conv.add('El usuario con ID: ' + response.id + 'ya está registrado! ')
    validateInsurance(response, conv)
  } else {
    conv.add('Usuario no registrado ')
    conv.scene.next.name = 'CompleteProfile'
  }
})

app.handle(HANDLERS.createUser, async (conv) => {
  const email = conv.user.params.tokenPayload.email
    ? conv.user.params.tokenPayload.email
    : conv.session.params.email
  const name = conv.user.params.tokenPayload.name
    ? conv.user.params.tokenPayload.name
    : conv.session.params.name
  const userData = {
    name,
    email,
    id: conv.session.params.id,
    insurance: conv.session.params.plate,
    plate: conv.session.params.insurance
  }
  const response = await addUser(userData)
  if (response) {
    conv.add('Usuario creado exitosamente! ')
    validateInsurance(response, conv)
  } else {
    conv.add('No fue posible crear el usuario, ')
    conv.scene.next.name = 'ErrorScene'
  }
})

exports.fulfillment = functions.https.onRequest(app)
