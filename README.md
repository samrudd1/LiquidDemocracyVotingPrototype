This repo contains the source code created for a prototype of a voting platform that uses the paradigm of liquid democracy.

The voting platform allows users to create and join groups, where they can then participate in elections.
These elections allow each voter to either vote directly for their chosen option, or they can delegate their vote to another group member.
The platform also explores voting security, and gives users the option to encrypt their votes with PGP keys and upload them to an election's smart contract on a local Ethereum testing environment.
Cloud functions are also used for security critical tasks, such as creating an elections PGP keys, or calculating election results.
Election Private keys are also stored with Google's Secret Manager, these can then only be retrieved by a cloud function.
All other data is stored in a Firebase database.

To run your own platform, create a firebase instance and add the config details where outlined in src/firebase.ts
config details can be found with this link: https://firebase.google.com/docs/web/learn-more#config-object
I then recommend creating an instance of each cloud function, namely: calculateResults, checkElectionDeadline, and generateElectionKeys
The source code for each can be found in the .js files with the above names in the repo. Each functions dependencies should be put in their package.json file, with the recommended dependencies included in a comment at the bottom of each file.
Some of the cloud function do require your firebase config details, this is outlined in a comment in the cloud functions source code, showing where to put the config information.
If you plan to use the local Ethereum instance then I recommend using Ganache to run a local Ethereum instance, the platform is set up to access this instance with network ID of 5777 and using port 8545 on your local network.

This project was developed to explore secure online voting principles and liquid democracy for my master's dissertation. It also served as a great introduction to web development, with it being my first larger project that had a heavy focus on front-end development. It also helped me understand and utilise Google's cloud environment and the services it offers for running web based platforms.

Thanks for having a look at my liquid democracy voting platform prototype!
