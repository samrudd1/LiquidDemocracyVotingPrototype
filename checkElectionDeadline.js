const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp({
    //need firebase config
    //https://firebase.google.com/docs/web/learn-more#config-object
});

exports.checkElectionDeadline = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.fromDate(new Date()); // Convert to Firestore Timestamp
    // Query elections where the deadline has passed
    const querySnapshot = await db.collectionGroup('elections').where('deadline', '<=', now).get();
    // Collect all update promises
    const updatePromises = [];
    querySnapshot.forEach((doc) => {
        // Update the 'ended' field of each document
        const updatePromise = doc.ref.update({ ended: true });
        updatePromises.push(updatePromise);
    });
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    return null;
});