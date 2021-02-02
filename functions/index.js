// Constants
const HANDLERS = {
  createUser: 'create_user',
  createGuestUser: 'create_guest_user',
  validateUserByEmail: 'validate_email',
  validateUserById: 'validate_id',
  createReport: 'create_report',
  selectReporter: 'select_reporter',
  redirectReporter: 'redirect_reporter',
  validatePolicyStatus: 'validate_policy_status',
  processServiceType: 'process_service_type',
  processPeopleStatus: 'process_people_status'
}

const SCENES = {
  endConversation: 'actions.page.END_CONVERSATION',
  accountLinkingOrigin: 'AccountLinkingOrigin',
  selectServiceType: 'SelectServiceType',
  guestReporter: 'GuestReporter',
  completeProfile: 'CompleteProfile',
  guestCompleteProfile: 'GuestCompleteProfile',
  makeReport: 'MakeReport',
  enterPeopleStatus: 'EnterPeopleStatus',
  enterEventDescription: 'EnterEventDescription'
}

const UDEA_COORDINATES = {
  lat: '6.268420887121053',
  lon: '-75.56872703256917'
}

// Utils
// const logJson = (value) => {
//   console.log('JSON LOGGED 👀 -->', JSON.stringify(value))
// }

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
  const handleChangeScene = changeScene(conv)
  const { id, insurance, plate } = conv.session.params
  const { email, name } = conv.user.params.tokenPayload
  const user = await addUser({ name, email, id, insurance, plate })

  if (user) {
    handleChangeScene(SCENES.makeReport)
  } else {
    conv.add('No fue posible crear el usuario')
    handleChangeScene(SCENES.endConversation)
  }
})

app.handle(HANDLERS.createGuestUser, async conv => {
  const { name, email, id, insurance, plate } = conv.session.params
  const user = await addUser({ name, email, id, insurance, plate })
  const handleChangeScene = changeScene(conv)

  if (user) {
    handleChangeScene(SCENES.makeReport)
  } else {
    conv.add('No fue posible crear el usuario')
    handleChangeScene(SCENES.endConversation)
  }
})

app.handle(HANDLERS.createReport, async (conv) => {
  const handleChangeScene = changeScene(conv)
  const { id } = conv.session.params
  let user = null

  if (id) {
    user = await getUserById(id)
  } else {
    user = conv.user.params.tokenPayload
  }

  const { email } = user
  const { serviceType, eventDescription } = conv.session.params
  const reportData = {
    email,
    service_type: serviceType,
    description: eventDescription,
    latitude: UDEA_COORDINATES.lat,
    longitude: UDEA_COORDINATES.lon
  }
  const isSuccess = createReport(reportData)

  if (isSuccess) {
    conv.add('¡Reporte creado exitosamente! ')
  } else {
    conv.add('¡No se puso crear el reporte!')
    handleChangeScene(SCENES.endConversation)
  }
})

app.handle(HANDLERS.selectReporter, conv => {
  const { name } = conv.user.params.tokenPayload
  conv.add(`¿Eres ${name}?`)
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

app.handle(HANDLERS.validatePolicyStatus, async conv => {
  const handleChangeScene = changeScene(conv)
  const { id } = conv.session.params
  const { email } = conv.user.params.tokenPayload
  let user = null

  if (id) {
    user = await getUserById(id)
  } else {
    user = await getUserByEmail(email)
  }

  if (isInputEquals(user.insurance, 'sura')) {
    const hasActivePolicy = await validateInsurance(user)
    if (hasActivePolicy) {
      handleChangeScene(SCENES.selectServiceType)
    } else {
      conv.add(`El usuario no tiene un seguro activo con ${user.insurance} `)
      handleChangeScene(SCENES.endConversation)
    }
  } else {
    conv.add(`Actualmente no hay soporte para la aseguradora ${user.insurance}`)
    handleChangeScene(SCENES.endConversation)
  }
})

app.handle(HANDLERS.processServiceType, conv => {
  const handleChangeScene = changeScene(conv)
  const { serviceType } = conv.session.params

  if (isInputEquals(
    serviceType,
    [
      'asistencia de siniestro',
      'asistencia en siniestro',
      'asistencia siniestro',
      'siniestro'
    ]
  )) {
    handleChangeScene('EnterPeopleStatus')
  } else {
    handleChangeScene(SCENES.enterEventDescription)
  }
})

app.handle(HANDLERS.processPeopleStatus, async conv => {
  const handleChangeScene = changeScene(conv)
  const { hasWoundedPeople } = conv.session.params
  const { id } = conv.session.params
  let user = null

  if (id) {
    user = await getUserById(id)
  } else {
    user = conv.user.params.tokenPayload
  }

  if (isInputEquals(hasWoundedPeople, ['sí', 'si'])) {
    const { email } = user
    const { serviceType, eventDescription } = conv.session.params
    const reportData = {
      email,
      service_type: serviceType,
      description: eventDescription,
      latitude: UDEA_COORDINATES.lat,
      longitude: UDEA_COORDINATES.lon
    }
    const isSuccess = createReport(reportData)

    if (isSuccess) {
      conv.add('¡Reporte creado exitosamente! ')
    } else {
      conv.add('¡No se puso crear el reporte!')
      handleChangeScene(SCENES.endConversation)
    }
  } else {
    handleChangeScene(SCENES.enterEventDescription)
  }
})

exports.fulfillment = functions.https.onRequest(app)
