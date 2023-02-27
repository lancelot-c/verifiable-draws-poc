const fs = require('fs');
const pinataSDK = require('@pinata/sdk');
const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });

const filepath = `${imgDirectoryPath}/${filename}`;
console.log(`Uploading ${filename} to IPFS...`);
const readableStreamForFile = fs.createReadStream(filepath);
const response = await pinata.pinFileToIPFS(readableStreamForFile, { pinataMetadata: { name: filename } });
console.log('Pinata response', response);
ipfsHash = response.IpfsHash;