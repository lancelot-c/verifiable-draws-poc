const fs = require('fs');
const hre = require('hardhat');
const { CONTRACT_NAME, WALLET_PRIVATE_KEY, TESTNET_CONTRACT_ADDRESS } = process.env;
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
            let event = {
                cid,
                publishedAt,
                scheduledAt,
                entropyNeeded
            }
            console.log('DrawLaunched 💥\n', JSON.stringify(event, null, 5))
        });
        console.log('Subscribed to DrawLaunched');


        contract.on("DrawsTriggered", (data) => {
            console.log('DrawsTriggered 💥\n', data)
        });
        console.log('Subscribed to DrawsTriggered');


        contract.on("RequestSent", (data) => {
            console.log('RequestSent 💥\n', data)
        });
        console.log('Subscribed to RequestSent');


        contract.on("RequestFulfilled", (data) => {
            console.log('RequestFulfilled 💥\n', data)
        });
        console.log('Subscribed to RequestFulfilled');


        contract.on("DrawCompleted", (data) => {
            console.log('DrawCompleted 💥\n', data)
        });
        console.log('Subscribed to DrawCompleted');
    }

};
