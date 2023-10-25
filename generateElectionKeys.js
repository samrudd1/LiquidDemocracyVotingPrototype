const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { generateKey } = require('openpgp');

admin.initializeApp({
    //need firebase config
    //https://firebase.google.com/docs/web/learn-more#config-object
});
const db = admin.firestore();

exports.generateElectionKeys = functions.https.onCall(async (data, context) => {
    const secretClient = new SecretManagerServiceClient();
    const title = data.title;
    const group = data.group;
    const election = data.election;

    const { privateKey, publicKey } = await generateKey({
        format: 'armored',
        userIDs: [{ name: 'Platform Election', email: 'OnlineEllie@Community.com' }],
        curve: 'ed25519',
        passphrase: 'liquid'
    });

    const docRef = db.collection('groups').doc(group).collection('elections').doc(election);
    await docRef.update({pubKey: publicKey});
    console.log('public key successfully stored');

    const parent = `projects/208546212870`;
    const parentVersion = `projects/208546212870/secrets/${election}`;
    try {
        const [whisper] = await secretClient.createSecret({
            parent: parent,
            secretId: election,
            secret: {
                replication: {
                    automatic: {},
                },
            },
        });
    } catch (error) {
        console.log(error);
    }
    try {
        await secretClient.addSecretVersion({
            parent: parentVersion,
            payload: {
                data: Buffer.from(privateKey, 'utf8'),
            },
        });
    } catch (error) {
        console.log(error);
    }
    return { success: true };
});