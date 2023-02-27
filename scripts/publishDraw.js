const db = require("../app/models");
const Asset = require("../app/models").Asset;
const hre = require('hardhat');
const fs = require('fs');
const path = require('path');
const pinataSDK = require('@pinata/sdk');
const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });
const nftConfig = require("../app/config/nftapi.js");
const abi = JSON.parse(fs.readFileSync('./app/assets/contracts/collections.json')).abi;


async function main() {
    // provider
    const provider = new hre.ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, hre.ethers.provider);

    // location of json file with token data
    const batch = process.env.npm_config_batch;
    if (!batch) {
        throw Error('You need to specify a batch name');
    }
    const limit = process.env.npm_config_limit;
    let ipfsHash = process.env.npm_config_use_ipfs_hash;
    const noContract = !!process.env.npm_config_no_contract;
    const noDb = !!process.env.npm_config_no_db;
    

    const jsonLocation = `scripts/data/tokens/${batch}.json`;
    const imgDirectoryPath = `./../nft-storefront/public/tokens/default/${batch}`;

    // start DB
    await db.sequelize.sync({ alter: true });
    console.log(`\nDb is synced with models.\n`);

    // Setup collections contract
    const collection = new hre.ethers.Contract(
        nftConfig[nftConfig.selected].contracts.collections,
        abi,
        provider
    );


    try {
        const data = await fs.readFileSync(jsonLocation);
        const records = JSON.parse(data).assets;
        let recordsProcessed = 0;

        launchLoop:
        for (const entry of records) {
            recordsProcessed++;

            if (recordsProcessed > limit) {
                break launchLoop;
            }

            const recordsLength = limit ? limit : records.length;
            console.log(`\n\n------ Launching token ${recordsProcessed} of ${recordsLength}, tokenID: ${entry.id} ------\n`);

            // Pinning on IPFS
            const filename = path.basename(entry.metadata.image);
            if (!ipfsHash) {
                const filepath = `${imgDirectoryPath}/${filename}`;
                console.log(`Uploading ${filename} to IPFS...`);
                const readableStreamForFile = fs.createReadStream(filepath);
                const response = await pinata.pinFileToIPFS(readableStreamForFile, { pinataMetadata: { name: filename }});
                console.log('Pinata response', response);
                ipfsHash = response.IpfsHash;
            }

            // Token launch on smart contract
            if (!noContract) {
                const tokenLaunch = await collection.launchToken(entry.id, entry.max_supply, entry.max_mint_per_tx, true, entry.id.toString());
                await tokenLaunch.wait();
            }
            
            // Add token to the db
            if (!noDb) {
                entry.total_supply = 0;
                entry.thumbnail_url = `${batch}/${filename}`;
                entry.metadata.launched_at = new Date();
                entry.metadata.image = `ipfs://${ipfsHash}`;
                entry.createdAt = new Date();
                entry.updatedAt = new Date();
                await Asset.upsert(entry);
            }
            console.log('Launched token number', recordsProcessed, entry);
        }
    } catch (err) {
        console.error('Error: ', err);
    }

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    });