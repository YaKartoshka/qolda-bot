const express = require("express");
const router = express.Router();
const async = require("async");

const firebase = require('../libs/firebase_db');

const db = firebase.fdb;
const bucket = firebase.storage;



router.post("/login", async (req, res) => {
  console.log(req.body)
  var r = { "r": 0 };
  const email = req.body.email.toLowerCase().trim();
  const password = req.body.password.trim();

  firebase.fauth.signInWithEmailAndPassword(firebase.fauth.getAuth(), email, password).then(async (userCredential) => {
    const user_id = userCredential.user.uid;

    var documentFound = false;
    const users = await db.collection('users').get();


    let user = await db.collection('users').doc(user_id).get();
  
    if (user.exists) {
      r['r'] = 1;
      documentFound = true;
      req.session.user_id = user_id;
      req.session.isAuthenticated = true;
      req.session.role = user.data().role;
      res.send(JSON.stringify(r));
    } else {
      res.send(JSON.stringify(r));
    }

  }, (err) => {
    console.log(err.code);
    if (err.code == 'auth/user-not-found') {
      r['r'] = 2;
    } else if (err.code == 'auth/wrong-password') {
      r['r'] = 0;
    } else if (err.code == 'auth/too-many-requests') {
      r['r'] = 3;
    }
    res.send(JSON.stringify(r));
  });
});

router.post("/register", async (req, res) => {
  const email = req.body.email.toLowerCase().trim();
  const password = req.body.password.trim();
  console.log(req.body)
  var r = { "r": 0 };
  firebase.fauth.createUserWithEmailAndPassword(firebase.fauth.getAuth(), email, password).then(async (userCredential) => {
    const user_id = userCredential.user.uid;
   
    const full_name = req.body.full_name;
    const phone_number = req.body.phone_number;
    const role = req.body.role;

    req.session.user_id = user_id;
    req.session.isAuthenticated = true;
    req.session.role = 'mentor';

    const new_user = await db.collection('users').doc(user_id).set({
      user_id: user_id,
      email: email,
      fullName: full_name,
      phoneNumber: phone_number,
      role: role,
    });

    r['r'] = 1;
    res.send(JSON.stringify(r));

  }, (err) => {
    console.log(err.code)
    if (err.code == 'auth/email-already-in-use') {
      r['r'] = 4;
    }
    res.send(JSON.stringify(r));
  });
});




router.get('/logout', (req, res) => {
  req.session.destroy();
  return res.redirect('/login');
});



module.exports = router;
