const hre = require('hardhat');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bs58 = require('bs58');
const { CONTRACT_NAME, WALLET_PRIVATE_KEY, TESTNET_CONTRACT_ADDRESS, PINATA_JWT } = process.env;
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

    // Location of the file containing the draw specs
    const drawFilename = process.env.npm_config_draw;
    if (!drawFilename) {
        throw Error('You need to specify a draw');
    }
    const drawFilepath = `./draws/${drawFilename}.txt`;

    try {

        // Pin draw on IPFS
        const [ipfsCidString, ipfsCidBytes32] = await pinOnIPFS(drawFilepath);

        // Extract draws infos
        const [scheduledAt, nbWinners, nbParticipants] = await extractDrawInfos(drawFilepath);

        // Computing entropy needed
        const entropyNeeded = await computeEntropyNeeded(nbParticipants, nbWinners);

        // Publish draw on smart contract
        await launchDraw(ipfsCidBytes32, scheduledAt, entropyNeeded);

        // We trigger the draw right away
        await triggerDraw(ipfsCidBytes32);
        
    } catch (err) {
        console.error(err);
    }

}

async function pinOnIPFS(filepath) {
    const filename = path.basename(filepath);
    console.log(`Uploading ${filepath} to IPFS...`);
    const readableStreamForFile = fs.createReadStream(filepath);
    const response = await pinata.pinFileToIPFS(readableStreamForFile, { pinataMetadata: { name: filename } });
    console.log('Pinata response', response);
    const ipfsCidString = response.IpfsHash;
    console.log(`Draw pinned on IPFS with CID ${ipfsCidString}`);
    const ipfsCidBytes32 = getBytes32FromIpfsHash(ipfsCidString);
    console.log(`ipfsCidBytes32 = ${ipfsCidBytes32}`);
    return [ipfsCidString, ipfsCidBytes32];
}

async function extractDrawInfos(drawFilepath) {
    let scheduledAt = Math.floor(Date.now()/1000) + 60; // Scheduled in 1min by default
    let nbWinners = 1; // 1 winner by default
    let nbParticipants = 0;
    let nextLineIsScheduledDate = false;
    let nextLineIsNbWinners = false;
    let nextLineIsParticipant = false;
    const rl = readline.createInterface({
        input: fs.createReadStream(drawFilepath),
        output: process.stdout,
        terminal: false
    });

    for await (const line of rl) {
        if (nextLineIsScheduledDate && isNumeric(line)) {
            scheduledAt = parseInt(line);
            nextLineIsScheduledDate = false;
        } else if (nextLineIsNbWinners && isNumeric(line)) {
            nbWinners = parseInt(line);
            nextLineIsNbWinners = false;
        } else if (nextLineIsParticipant) {
            nbParticipants++;
        } else if (line === '*** SCHEDULED AT TIMESTAMP (GMT) ***') {
            nextLineIsScheduledDate = true;
        } else if (line === '*** NUMBER OF WINNERS ***') {
            nextLineIsNbWinners = true;
        } else if (line === '*** PARTICIPANTS ***') {
            nextLineIsParticipant = true;
        }
    }

    console.log(`Draw scheduled at timestamp (GMT): ${scheduledAt}`);
    console.log(`${nbWinners} winner needed`);
    console.log(`${nbParticipants} participants detected`);
    return [scheduledAt, nbWinners, nbParticipants];
}

async function computeEntropyNeeded(nbParticipants, nbWinners) {
    
    let entropyNeeded = 0;

    for (let i = 0; i < nbWinners; i++) {
        entropyNeeded += Math.ceil(Math.log2(nbParticipants - i));
    }

    console.log(`${entropyNeeded} bytes of entropy needed`);
    return entropyNeeded;
}

async function launchDraw(ipfsCidBytes32, scheduledAt, entropyNeeded) {
    const launchDraw = await contract.launchDraw(ipfsCidBytes32, scheduledAt, entropyNeeded);
    await launchDraw.wait();

    console.log(`Draw published on smart contract`);
}

async function triggerDraw(ipfsCidBytes32) {
    const performUpkeep = await contract.performUpkeep(ipfsCidBytes32);
    await performUpkeep.wait();

    console.log(`performUpkeep call done`);
}


// Return bytes32 hex string from base58 encoded ipfs hash,
// stripping leading 2 bytes from 34 byte IPFS hash
// Assume IPFS defaults: function:0x12=sha2, size:0x20=256 bits
// E.g. "QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcCLAL" -->
// "0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231"

function getBytes32FromIpfsHash(ipfsListing) {
    return "0x" + bs58.decode(ipfsListing).slice(2).toString('hex');
}

// Return base58 encoded ipfs hash from bytes32 hex string,
// E.g. "0x017dfd85d4f6cb4dcd715a88101f7b1f06cd1e009b2327a0809d01eb9c91f231"
// --> "QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcCLAL"

function getIpfsHashFromBytes32(bytes32Hex) {
    // Add our default ipfs values for first 2 bytes:
    // function:0x12=sha2, size:0x20=256 bits
    // and cut off leading "0x"
    const hashHex = "1220" + bytes32Hex.slice(2);
    const hashBytes = Buffer.from(hashHex, 'hex');
    const hashStr = bs58.encode(hashBytes);
    return hashStr;
}


function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
           !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
  }


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    });