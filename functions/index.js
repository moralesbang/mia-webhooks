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

// Setup conversation
const { conversation } = require('@assistant/conversation')
const app = conversation({
  clientId: functions.config().client.id
})

// Firebase Functions
async function addUser (userData) {
  // consultar primero si ya existe
  // .
  // .
  // .
  // //
  const docRef = db.collection('users').doc()
  try {
    docRef.set({ ...userData })
    return true
  } catch (error) {
    return false
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

// Handlers
app.handle(HANDLERS.validateUserByEmail, async (conv) => {
  const email = conv.user.params.tokenPayload.email
  const response = await getUserByEmail(email)
  if (response) {
    conv.add(response.plate)
  } else {
    conv.add('Usuario no registrado')
  }
  logJson(response)
})

app.handle(HANDLERS.validateUserById, async (conv) => {
  logJson(conv)
  const id = conv.scene.slots.userId.value // validate
  logJson(id)
  // const response = await getUserById(id)
  // logJson(response)
  // if (!response) {
  //   // conv.scene.next.name = 'UserOnBoarding'
  // } else {
  //   conv.add('El usuario ya está registrado!')
  // }
})

app.handle(HANDLERS.createUser, async (conv) => {
  logJson(conv)
  // original data
  // const userData = {
  //   name: conv.scene.slots.userName.value,
  //   id: conv.scene.slots.userId.value,
  //   email: conv.scene.slots.email.value,
  //   insurance: conv.scene.slots.insurance.value,
  //   plate: conv.scene.slots.plate.value,
  // }
  // mock data
  const userData = {
    name: 'Carlos Duque',
    id: '1234567',
    email: 'carlosduque@udea.edu.co',
    insurance: 'sura',
    plate: 'abc123'
  }
  const response = await addUser(userData)
  if (response) {
    conv.add('Usuario creado exitosamente!')
    // validateInsurance(userData, conv)
  } else {
    conv.add('No fue posible crear el usuario')
    conv.scene.next.name = 'ErrorScene'
  }
})

exports.fulfillment = functions.https.onRequest(app)
