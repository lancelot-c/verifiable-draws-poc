import fs from 'fs'
import hardhat from 'hardhat';
import { triggerDraw } from "./../scripts/launchDraw.js";

const { CONTRACT_NAME, WALLET_PRIVATE_KEY, TESTNET_CONTRACT_ADDRESS } = process.env;
const abi = JSON.parse(fs.readFileSync(`./artifacts/contracts/${CONTRACT_NAME}.sol/${CONTRACT_NAME}.json`)).abi;
const provider = new hardhat.ethers.Wallet(WALLET_PRIVATE_KEY, hardhat.ethers.provider);
const contract = new hardhat.ethers.Contract(
    TESTNET_CONTRACT_ADDRESS,
    abi,
    provider
);


export async function subscribeEvents() {

    contract.on("DrawLaunched", (cid, publishedAt, scheduledAt, entropyNeeded) => {
        let event = { cid, publishedAt, scheduledAt, entropyNeeded };
        console.log('\nDrawLaunched 💥\n', JSON.stringify(event, null, 4));

        triggerDraw(cid);
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

        const nbParticipants = 3;
        const winner = parseInt(extractedEntropy.slice(2), 16) % nbParticipants;
        let result = { cid, winner };
        console.log('\n🏅🏅🏅 Final Draw Result 🏅🏅🏅\n', JSON.stringify(result, null, 4));
    });
    console.log('Subscribed to DrawCompleted');
}