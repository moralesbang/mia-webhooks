// const functions = require('firebase-functions')
const { conversation } = require('@assistant/conversation')

// Constants
const HANDLERS = {
  createUser: 'create_user',
  validateUserByEmail: 'validate_email',
  validateUserById: 'validate_id'
}

// Firebase
const admin = require('firebase-admin');
const functions = require('firebase-functions');
admin.initializeApp(functions.config().firebase);
let db = admin.firestore();

async function getUserByEmail(email, name) {
  //get user by email
  let usersRef = db.collection('users');
  let query = usersRef.where('email', '==', email).where('name', '==', name);
  query.get().then(snapshot => {
    if (snapshot.empty) {
      logJson('No matching user');
      return;
    }
    return true;
  })
  .catch(() => {
    logJson('Error getting user');
  });
}

async function getUserById(id) {
  //get user by email
  let usersRef = db.collection('users');
  let query = usersRef.where('id', '==', id);
  query.get().then(snapshot => {
    if (snapshot.empty) {
      logJson('No matching user');
      return;
    }
    return true;
  })
  .catch(() => {
    logJson('Error getting user');
  });
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
  logJson(cov);
  const userName = conv.user.name;
  const email = conv.user.email;
  let response = await getUserByEmail(email, userName);
  if (!response) {
    //response the handler false
  }
  //response the handler ok
})

app.handle(HANDLERS.validateUserById, conv => {
  logJson(cov);
  const id = conv.user.id; //validate
  let response = await getUserById(id);
  if (!response) {
    //response the handler false
  }
  //response the handler ok
})

app.handle('getting', conv => {
  logJson(cov);
})

exports.fulfillment = functions.https.onRequest(app)
