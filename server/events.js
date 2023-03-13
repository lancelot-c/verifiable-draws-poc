const fs = require('fs');
const hre = require('hardhat');
const { CONTRACT_NAME, WALLET_PRIVATE_KEY, TESTNET_CONTRACT_ADDRESS } = process.env;
const { getIpfsHashFromBytes32 } = require("../utils/ipfs");
const abi = JSON.parse(fs.readFileSync(`./artifacts/contracts/${CONTRACT_NAME}.sol/${CONTRACT_NAME}.json`)).abi;
const provider = new hre.ethers.Wallet(WALLET_PRIVATE_KEY, hre.ethers.provider);
const contract = new hre.ethers.Contract(
    TESTNET_CONTRACT_ADDRESS,
    abi,
    provider
);


module.exports = {

    subscribeEvents: async () => {

        contract.on("DrawLaunched", (cid, publishedAt, scheduledAt, entropyNeeded) => {
            let event = { cid, publishedAt, scheduledAt, entropyNeeded };
            console.log('\nDrawLaunched 💥\n', JSON.stringify(event, null, 4));
        });
        console.log('Subscribed to DrawLaunched');


        contract.on("DrawsTriggered", (performData) => {
            let event = { performData };
            console.log('\nDrawsTriggered 💥\n', JSON.stringify(event, null, 4));
        });
        console.log('Subscribed to DrawsTriggered');


        contract.on("RequestSent", (requestId, cids, numWords, keyHash, s_subscriptionId, requestConfirmations, callbackGasLimit) => {
            let event = { requestId, cids, numWords, keyHash, s_subscriptionId, requestConfirmations, callbackGasLimit };
            console.log('\nRequestSent 💥\n', JSON.stringify(event, null, 4));
        });
        console.log('Subscribed to RequestSent');


        contract.on("RequestFulfilled", (requestId, randomWords) => {
            let event = { requestId, randomWords };
            console.log('\nRequestFulfilled 💥\n', JSON.stringify(event, null, 4));
        });
        console.log('Subscribed to RequestFulfilled');


        contract.on("DrawCompleted", (cid, extractedEntropy) => {
            let event = { cid, extractedEntropy };
            console.log('\nDrawCompleted 💥\n', JSON.stringify(event, null, 4));

            const nbWinners = 1;
            const nbParticipants = 3;
            const ipfsCID = getIpfsHashFromBytes32(cid);
            const winner = parseInt(extractedEntropy.slice(2), 16) % nbParticipants;
            let result = { ipfsCID, winner };
            console.log('\n🏅🏅🏅 Final Draw Result 🏅🏅🏅\n', JSON.stringify(result, null, 4));
        });
        console.log('Subscribed to DrawCompleted');
    }

};
