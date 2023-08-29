import fs from 'fs'
import hardhat from 'hardhat';
// import { triggerDraw } from "./../scripts/launchDraw.js";

const { CONTRACT_NAME, WALLET_PRIVATE_KEY, MAINNET_CONTRACT_ADDRESS, TESTNET_CONTRACT_ADDRESS } = process.env;
const abi = JSON.parse(fs.readFileSync(`./artifacts/contracts/${CONTRACT_NAME}.sol/${CONTRACT_NAME}.json`)).abi;
const provider = new hardhat.ethers.Wallet(WALLET_PRIVATE_KEY, hardhat.ethers.provider);
const network = hardhat.network.name;
const contractAddress = (network == 'mainnet') ? MAINNET_CONTRACT_ADDRESS : TESTNET_CONTRACT_ADDRESS;

const contract = new hardhat.ethers.Contract(
    contractAddress,
    abi,
    provider
);


export async function subscribeEvents() {

    contract.on("DrawLaunched", (cid, publishedAt, scheduledAt, entropyNeeded) => {
        let event = { cid, publishedAt, scheduledAt, entropyNeeded };
        console.log('\nDrawLaunched 💥\n', JSON.stringify(event, null, 4));

        // triggerDraw(cid);
    });
    console.log('Subscribed to DrawLaunched');


    contract.on("RandomnessRequested", (requestId, cids, numWords, keyHash, s_subscriptionId, requestConfirmations, callbackGasLimit) => {
        let event = { requestId, cids, numWords, keyHash, s_subscriptionId, requestConfirmations, callbackGasLimit };
        console.log('\RandomnessRequested 💥\n', JSON.stringify(event, null, 4));
    });
    console.log('Subscribed to RandomnessRequested');


    contract.on("RandomnessFulfilled", (requestId, randomWords) => {
        let event = { requestId, randomWords };
        console.log('\nRandomnessFulfilled 💥\n', JSON.stringify(event, null, 4));
    });
    console.log('Subscribed to RandomnessFulfilled');


    contract.on("DrawsCompleted", (cids) => {
        let event = { cids };
        console.log('\nDrawsCompleted 💥\n', JSON.stringify(event, null, 4));
    });
    console.log('Subscribed to DrawsCompleted');
}