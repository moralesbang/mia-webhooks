const functions = require('firebase-functions')
const { conversation } = require('@assistant/conversation')

const app = conversation()
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

app.handle('create_user', conv => {
  conv.add('Hi, how is it going?')
})

exports.fulfillment = functions.https.onRequest(app)
