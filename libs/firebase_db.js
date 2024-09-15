const admin = require('firebase-admin');
const serviceAccount = require("../service.json");
const fauth = require('firebase/auth');
const { initializeApp } = require('firebase/app');

const firebaseConfig = {
  apiKey: "AIzaSyD_7uO_QmzOpmpp_JTWz7P5LOsg1OmWaE8",
  authDomain: "qolda-app.firebaseapp.com",
  projectId: "qolda-app",
  storageBucket: "qolda-app.appspot.com",
  messagingSenderId: "134286217216",
  appId: "1:134286217216:web:61e402548717370b4c08e5",
  measurementId: "G-EE3DYEB6BD"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

const admin_app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://qolda-app.appspot.com'
});

const fdb = admin.firestore();
const admin_fauth = admin.auth();
const storage = admin.storage().bucket();


module.exports = {fdb, admin_fauth, fauth, storage};