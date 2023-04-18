const hre = require('hardhat');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const readline = require('readline');
const { createHash } = require('crypto');
const { CONTRACT_NAME, WALLET_PRIVATE_KEY, TESTNET_CONTRACT_ADDRESS, PINATA_JWT } = process.env;
const { getBytes32FromIpfsHash } = require("../utils/ipfs");
const pinataSDK = require('@pinata/sdk');
const pinata = new pinataSDK({ pinataJWTKey: PINATA_JWT });
const abi = JSON.parse(fs.readFileSync(`./artifacts/contracts/${CONTRACT_NAME}.sol/${CONTRACT_NAME}.json`)).abi;
const provider = new hre.ethers.Wallet(WALLET_PRIVATE_KEY, hre.ethers.provider);
const contract = new hre.ethers.Contract(
    TESTNET_CONTRACT_ADDRESS,
    abi,
    provider
);

async function main() {

    // Extract draws infos
    const drawTitle = process.env.npm_config_drawTitle;
    const drawRules = process.env.npm_config_drawRules;
    const drawParticipants = process.env.npm_config_drawParticipants;
    const drawNbWinners = process.env.npm_config_drawNbWinners;
    const drawScheduledAt = process.env.npm_config_drawScheduledAt;


    await launchDraw(drawTitle, drawRules, drawParticipants, drawNbWinners, drawScheduledAt);

}

async function launchDraw(drawTitle, drawRules, drawParticipants, drawNbWinners, drawScheduledAt) {
    try {

        console.log(`drawTitle = \n"${drawTitle}"\n\n`);
        console.log(`drawRules = \n"${drawRules}"\n\n`);
        console.log(`drawParticipants = \n"${drawParticipants}"\n\n`);
        console.log(`drawNbWinners = \n"${drawNbWinners}"\n\n`);
        console.log(`drawScheduledAt = \n"${drawScheduledAt}"\n\n`);

        if (!drawTitle || !drawRules || !drawParticipants || !drawNbWinners || !drawScheduledAt) {
            throw Error('You need to specify all draw parameters.');
        }

        // Generate draw file
        const drawFilepath = await generateDrawFile(drawTitle, drawRules, drawParticipants, drawNbWinners, drawScheduledAt);

        // Pin draw file on IPFS
        const [ipfsCidString, ipfsCidBytes32] = await pinOnIPFS(drawFilepath);

        // Rename draw file to match IPFS CID
        await renameFileToIPFS_CID(drawFilepath, ipfsCidString);

        // Compute entropy needed
        const drawNbParticipants = drawParticipants.length;
        const entropyNeeded = await computeEntropyNeeded(drawNbParticipants, drawNbWinners);

        // Publish draw on smart contract
        await publishOnSmartContract(ipfsCidBytes32, drawScheduledAt, entropyNeeded);

        // Trigger the draw right away
        triggerDraw(ipfsCidBytes32);

        return ipfsCidString;

    } catch (err) {
        console.error(err);
    }
}

async function generateDrawFile(drawTitle, drawRules, drawParticipants, drawNbWinners, unix_timestamp) {
    const templateFilepath = './draws/template.html';

    const content = await fsPromises.readFile(templateFilepath, 'utf8');

    drawParticipants = drawParticipants.split('\n');
    drawParticipantsList = `'${drawParticipants.join('\',\'')}'`;

    // Replace placeholders with draw parameters
    const newContent = content.replaceAll('{{ contractAddress }}', TESTNET_CONTRACT_ADDRESS)
        .replaceAll('{{ drawTitle }}', drawTitle)
        .replaceAll('{{ drawScheduledAt }}', unix_timestamp)
        .replaceAll('{{ drawRules }}', drawRules.replaceAll('\n', '<br />'))
        .replaceAll('{{ drawNbParticipants }}', drawParticipants.length)
        .replaceAll('{{ drawParticipants }}', drawParticipantsList)
        .replaceAll('{{ drawNbWinners }}', drawNbWinners);

    const fileHash = sha256(newContent);
    drawTempFilepath = `./draws/${fileHash}.html`;

    await fsPromises.writeFile(drawTempFilepath, newContent, 'utf8');
    return drawTempFilepath;

}

function sha256(message) {
    return Buffer.from(createHash('sha256').update(message).digest('hex')).toString('base64');
}

async function pinOnIPFS(filepath) {
    const filename = path.basename(filepath);
    console.log(`Uploading ${filepath} to IPFS...\n`);
    const readableStreamForFile = fs.createReadStream(filepath);
    const response = await pinata.pinFileToIPFS(readableStreamForFile, { pinataMetadata: { name: filename } });
    console.log('Pinata response : ', response, '\n');
    const ipfsCidString = response.IpfsHash;
    console.log(`Draw pinned on IPFS with CID ${ipfsCidString}\n`);
    
    const ipfsCidBytes32 = getBytes32FromIpfsHash(ipfsCidString);
    console.log(`ipfsCidBytes32 = ${ipfsCidBytes32}\n`);

    return [ipfsCidString, ipfsCidBytes32];
}
  
async function renameFileToIPFS_CID(drawFilepath, ipfsCidString) {
    const newFilepath = drawFilepath.replace(path.basename(drawFilepath), `${ipfsCidString}.html`);

    fs.rename(drawFilepath, newFilepath, (err) => {
        if (err) {
            console.error(err);
            return 0;
        } else {
            return newFilepath;
        }
    });
}

async function computeEntropyNeeded(nbParticipants, nbWinners) {

    let entropyNeeded = 0;

    // Simple method
    entropyNeeded = nbWinners * Math.ceil(Math.log2(nbParticipants) / 8); // in bytes

    // Optimised using Information Theory
    // for (let i = 0; i < nbWinners; i++) {
    //     entropyNeeded += Math.ceil(Math.log2(nbParticipants - i) / 8); // in bytes
    // }

    console.log(`${entropyNeeded} bytes of entropy needed\n`);
    return entropyNeeded;
}

async function publishOnSmartContract(ipfsCidBytes32, scheduledAt, entropyNeeded) {
    const launchDraw = await contract.launchDraw(ipfsCidBytes32, scheduledAt, entropyNeeded);
    await launchDraw.wait();

    console.log(`Draw ${ipfsCidBytes32} published on smart contract ${TESTNET_CONTRACT_ADDRESS}\n`);
}

async function triggerDraw(ipfsCidBytes32) {
    const abi = hre.ethers.utils.defaultAbiCoder;
    const params = abi.encode(
        ["bytes32[]"],
        [[ipfsCidBytes32]]
    );
    console.log(`call performUpkeep(${params})\n`);

    const performUpkeep = await contract.performUpkeep(params);
    await performUpkeep.wait();

    console.log(`performUpkeep call done\n`);
}

function isNumeric(str) {
    if (typeof str != "string") return false; // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str)); // ...and ensure strings of whitespace fail
}


// main()
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error)
//         process.exit(1)
//     });


module.exports = { launchDraw };