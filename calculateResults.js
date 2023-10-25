const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const openpgp = require('openpgp');

admin.initializeApp({
    //need firebase config
    //https://firebase.google.com/docs/web/learn-more#config-object
});
const db = admin.firestore();

exports.calculateResults = functions.https.onCall(async (data, context) => {
    const group = data.group;
    const secretClient = new SecretManagerServiceClient();
    const projectID = 'liquiddemocracyprototype1';
    const secretID = data.election;
    const title = data.title;
    const optionsLength = data.optionsLength;
    const encrypted = data.encrypted;
    const voters = data.voters;
    const voteArr = [];

    const secretName = `projects/208546212870/secrets/${secretID}/versions/latest`;
    const [secret] = await secretClient.accessSecretVersion({ name: secretName });
    const payload = secret.payload?.data?.toString('utf8');

    // Parse the private key
    const privateKey = await openpgp.readPrivateKey({ armoredKey: payload });
    // Decrypt the private key using the passphrase
    const decryptedPrivateKey = await openpgp.decryptKey({ privateKey: privateKey, passphrase: 'liquid' });

    // Loop through each encrypted Message to decrypt it
    for (const encryptedMessage of encrypted) {

        const mess = await openpgp.readMessage({ armoredMessage: encryptedMessage });
        const { data: decrypted } = await openpgp.decrypt({ message: mess, decryptionKeys: [decryptedPrivateKey] });

        // Convert the decrypted Message to a JSON object
        const messageObject = JSON.parse(decrypted);
        voteArr.push(messageObject);
        // Do something with the decrypted Message object (e.g., log it to the console)
        console.log(messageObject);
    }

    const docRef = db.collection('groups').doc(group).collection('elections').doc(secretID);
    const voterCollection = db.collection('groups').doc(group).collection('elections').doc(secretID).collection('voters');

    // 1. Initialize variables
    const voteCounts = Array(optionsLength).fill(0);

    // 2. Retrieve all voter data from Firestore
    const voterSnapshot = await voterCollection.get();
    voterSnapshot.forEach((doc) => {
        const voter = doc.data();
        if (!(voter.unique in voters)) {
            voter.weight = 1; // setting initial weight
            voteArr.push(voter);
            voters.push(voter.unique);
        }
    });
    // 3. Resolve Delegations
    // Identify cycles and update the delegations as needed
    voteArr.forEach(voter => {
        voter.delegated = new Set(); // Initialize the set of voters who delegated to this voter
        const visited = new Set();
        let currentVoter = voter;
        while (currentVoter.delegation !== "") {
            if (visited.has(currentVoter.unique)) {
                currentVoter.delegation = ""; // Break the cycle
                currentVoter.vote = 0; // Set vote to 0
                break;
            }
            visited.add(currentVoter.unique);
            currentVoter = voters.find(v => v === currentVoter.delegation) || currentVoter;
        }
    });
    // Process delegation chains, allowing for merging
    voteArr.forEach(voter => {
        let currentVoter = voter;
        while (currentVoter.delegation !== "") {
            currentVoter = voteArr.find(v => v.unique === currentVoter.delegation) || currentVoter;
            currentVoter.delegated.add(voter.unique);
            currentVoter.delegated = new Set([...currentVoter.delegated, ...voter.delegated]);
        }
    });
    // 4. Calculate the vote tally based on weights
    let totalWeight = 0;
    voteArr.forEach(voter => {
        voter.weight = voter.delegated.size + 1; // Set the weight as the size of the set plus 1
        let delegateString = Array.from(voter.delegated).join (", ");
        console.log(`Voter: ${voter.unique}, weight: ${voter.weight}, vote: ${voter.vote}, delegation: ${voter.delegation}, delegates: ${delegateString}`);
        if ((voter.delegation === "") && (voter.vote < voteCounts.length)) {
            voteCounts[voter.vote] += voter.weight;
            totalWeight += voter.weight;
        }
    });
    // Check that totalWeight matches voters.length
    if (totalWeight !== voters.length) {
        console.error(`Error in calculating weights, calc: ${totalWeight}, total: ${voters.length}`);
    }
    // 5. Calculate the percentage vote for each option and update
    const percentageVotes = voteCounts.map(count => {
        const percentage = (count / totalWeight) * 100;
        return Number(percentage.toFixed(1)); // round to one decimal place
    });

    await docRef.update({ counts: voteCounts, percentages: percentageVotes });

    // In a Cloud Function, you typically return a result to indicate completion
    return { success: true, percentages: percentageVotes };

});