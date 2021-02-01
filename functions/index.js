// Constants
const HANDLERS = {
  createUser: 'create_user',
  createGuestUser: 'create_guest_user',
  validateUserByEmail: 'validate_email',
  validateUserById: 'validate_id',
  createReport: 'create_report',
  selectReporter: 'select_reporter',
  redirectReporter: 'redirect_reporter',
  validatePolicyStatus: 'validate_policy_status'
}

const SCENES = {
  endConversation: 'actions.page.END_CONVERSATION',
  accountLinkingOrigin: 'AccountLinkingOrigin',
  selectServiceType: 'SelectServiceType',
  guestReporter: 'GuestReporter',
  completeProfile: 'CompleteProfile',
  guestCompleteProfile: 'GuestCompleteProfile',
  makeReport: 'MakeReport'
}

// Utils
const logJson = (value) => {
  console.log('JSON LOGGED 👀 -->', JSON.stringify(value))
}

const isInputEquals = (input, match) => {
  if (Array.isArray(match)) {
    return match.some(item => {
      const itemRegex = new RegExp(item, 'i')
      return itemRegex.test(input)
    })
  }

  const matchRegex = new RegExp(match, 'i')
  return matchRegex.test(input)
}

// TODO: Review for delete
const validatePolicy = conv => async user => {
  const hasInsurance = await validateInsurance(user)
  if (hasInsurance) {
    conv.scene.next.name = SCENES.selectServiceType
  } else {
    if (isInputEquals(user.insurance, 'sura')) {
      conv.add(`El usuario no tiene un seguro activo con ${user.insurance} `)
    } else {
      conv.add(`Actualmente no hay soporte para la aseguradora ${user.insurance}`)
    }
    conv.scene.next.name = SCENES.endConversation
  }
}

const changeScene = conv => sceneName => (conv.scene.next.name = sceneName)

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
    console.log('[EMAIL OR ID EXITS]', emailExist, idExist)
    return false
  } else {
    const docRef = db.collection('users').doc()
    try {
      docRef.set({ ...userData })
      return userData
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
async function validateInsurance (userData) {
  const accessToken = await getAccessToken()
  const options = {
    method: 'GET',
    json: true,
    url:
      'https://university3-dev-ed.my.salesforce.com/services/data/v47.0/query/?q=SELECT+name+from+Account',
    headers: {
      Authorization: 'Bearer ' + accessToken
    }
  }
  const response = await request(options, () => {})
  const user = response.records.find((item) => item.Name === userData.email)

  if (user) {
    const userId = user.attributes.url.replace('/services/data/v47.0/sobjects/Account/', '')
    return { userEmail: user.Name, userId }
  }

  return null
}

async function getAccessToken () {
  const params = {
    grant_type: 'password',
    client_id:
      '3MVG9l2zHsylwlpSPD4Hw7reFXjppFjuUYNA20JlvD2kyYJJFEpwwBlKJno6Vtn8_AZmC4F7b9qpjZ9XFOT72',
    client_secret:
      '6819F34AF24378D0E36E4936C34FBBD193C77C0B02FF75A8A45D9BF74F33D2CF',
    username: 'jupabass89@gmail.com',
    password: '1989Juan*L8BkqZ7LsKBAFoaaNEpgvnOp'
  }
  const options = {
    method: 'POST',
    json: true,
    url: `https://university3-dev-ed.my.salesforce.com/services/oauth2/token?grant_type=${params.grant_type}&client_id=${params.client_id}&client_secret=${params.client_secret}&username=${params.username}&password=${params.password}`
  }
  const response = await request(options, () => {})
  return response.access_token
}

async function createReport (reportData) {
  const accessToken = await getAccessToken()
  const userData = await getUserByEmail(reportData.email)
  const AccountId = await validateInsurance(userData).userId
  logJson(AccountId)
  const body = {
    AccountId,
    Description: reportData.description,
    Subject: reportData.service_type,
    Priority: 'High',
    Latitude__c: reportData.latitude,
    Longitude__c: reportData.longitude
  }
  const options = {
    method: 'POST',
    json: true,
    body,
    url: 'https://university3-dev-ed.my.salesforce.com/services/data/v50.0/sobjects/Case/',
    headers: {
      Authorization: 'Bearer ' + accessToken
    }
  }
  return await request(options, () => {})
}

// Handlers
app.handle(HANDLERS.validateUserByEmail, async (conv) => {
  const { email } = conv.user.params.tokenPayload
  const handleChangeScene = changeScene(conv)
  const user = await getUserByEmail(email)

  if (user) {
    handleChangeScene(SCENES.makeReport)
  } else {
    handleChangeScene(SCENES.completeProfile)
  }
})

app.handle(HANDLERS.validateUserById, async (conv) => {
  const { id } = conv.session.params
  const handleChangeScene = changeScene(conv)
  const user = await getUserById(id)

  if (user) {
    handleChangeScene(SCENES.makeReport)
  } else {
    handleChangeScene(SCENES.guestCompleteProfile)
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
    insurance: conv.session.params.insurance,
    plate: conv.session.params.plate
  }
  const response = await addUser(userData)

  if (response) {
    conv.add('Usuario creado exitosamente! ')
    const insurance = await validateInsurance(userData)
    if (insurance) {
      conv.scene.next.name = SCENES.selectServiceType
    } else {
      conv.add(`El usuario no tiene un seguro activo con: ${response.insurance} `)
      conv.scene.next.name = SCENES.endConversation
    }
  } else {
    conv.add('No fue posible crear el usuario, ')
    conv.scene.next.name = 'ErrorScene'
  }
})

app.handle(HANDLERS.createReport, async (conv) => {
  const email = conv.user.params.tokenPayload.email
    ? conv.user.params.tokenPayload.email
    : conv.session.params.email
  // const reportData = {
  //   email,
  //   service_type: conv.session.params.service,
  //   description: conv.session.params.description,
  //   latitude: conv.device.latitude,
  //   longitude: conv.device.longitude
  // }
  const reportData = {
    email,
    service_type: 'Siniestro', // validar procedencia
    description: conv.session.params.description,
    latitude: '12.43', // validar procedencia
    longitude: '-13.54' // validar procedencia
  }
  const response = await createReport(reportData)
  logJson(response)
  if (response) {
    conv.add('Reporte creado exitosamente! ')
  } else {
    conv.add('No fue posible crear el reporte, ')
    conv.scene.next.name = 'ErrorScene'
  }
})

app.handle(HANDLERS.selectReporter, conv => {
  const userName = conv.user.params.tokenPayload.given_name
  conv.add(`¿Eres ${userName}?`)
})

app.handle(HANDLERS.redirectReporter, conv => {
  const { isLocalReporter } = conv.session.params
  let nextScene = SCENES.endConversation

  if (isInputEquals(isLocalReporter, ['si', 'sí'])) {
    nextScene = SCENES.accountLinkingOrigin
  } else if (isInputEquals(isLocalReporter, 'no')) {
    nextScene = SCENES.guestReporter
  }

  conv.scene.next.name = nextScene
})

app.handle(HANDLERS.createGuestUser, conv => {
  const { name, email, id, insurance, plate } = conv.session.params
  addUser({ name, email, id, insurance, plate })
})

app.handle(HANDLERS.validatePolicyStatus, conv => {
  changeScene(conv)(SCENES.selectServiceType)
})

exports.fulfillment = functions.https.onRequest(app)
