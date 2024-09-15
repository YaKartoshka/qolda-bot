const express = require("express");
const router = express.Router();
const async = require("async");
const admin = require('firebase-admin')
const firebase = require('../libs/firebase_db');

const db = firebase.fdb;
const bucket = firebase.storage;


router.post("/", async (req, res) => {

    var data = [];
    const snapshot = await db.collection('events').get();


    snapshot.forEach((doc) => {
        data.push({...doc.data(), id: doc.id});
    });


    res.send(data);
});

router.post("/join", async (req, res) => {
    
    var r = { r: 1 };
    var event_id = req.body.event_id;
    var user_id = req.body.user_id;
    console.log(req.body)
    try {
        // Get the event document
        const eventRef = db.collection('events').doc(event_id);
        const event = await eventRef.get();

        if (!event.exists) {
            r = { r: 0, message: 'Event not found' };
        } else {
            // Add new participant to the participants array
            await eventRef.update({
                participants: admin.firestore.FieldValue.arrayUnion({
                    user_id: user_id,
                    status: 0
                })
            });
            r = { r: 1, message: 'User added to participants' };
        }

    } catch (error) {
        r = { r: 0, message: 'Error updating event', error: error.message };
    }

    res.send(JSON.stringify(r));
});

router.post("/checked", async (req, res) => {
    var r = { r: 1 };
    var event_id = req.body.event_id;
    var user_id = req.body.user_id;

    try {
        // Get the event document
        const eventRef = db.collection('events').doc(event_id);
        const event = await eventRef.get();

        if (!event.exists) {
            r = { r: 0, message: 'Event not found' };
        } else {
            const participants = event.data().participants || [];

            // Find the participant by user_id and update the status
            const updatedParticipants = participants.map(participant => {
                if (participant.user_id === user_id) {
                    return { ...participant, status: 1 };
                }
                return participant;
            });

            // Update the event document with the modified participants array
            await eventRef.update({
                participants: updatedParticipants
            });

            r = { r: 1, message: 'User status updated to checked' };
        }

    } catch (error) {
        r = { r: 0, message: 'Error updating event', error: error.message };
    }

    res.send(JSON.stringify(r));
});

module.exports = router;
