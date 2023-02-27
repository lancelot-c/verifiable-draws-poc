
const hre = require('hardhat');
const fs = require("fs");
const os = require("os");
const { CONTRACT_NAME, CHAINLINK_VRF_SUBSCRIPTION_ID } = process.env;

async function main() {

    const networkName = hre.network.name;

    await deploy(networkName);
        // .then(() => process.exit(0))
        // .catch((error) => {
        //     console.error(error);
        //     process.exit(1);
        // });
}


async function deploy(networkName) {

    const [deployer] = await ethers.getSigners();
    console.log(`Deploying contract ${CONTRACT_NAME} on ${networkName} with account ${deployer.address}`);

    const contractFactory = await hre.ethers.getContractFactory(CONTRACT_NAME);
    const contract = await contractFactory.deploy(CHAINLINK_VRF_SUBSCRIPTION_ID);
    await contract.deployed();
    
    const contractAddress = contract.address;
    console.log(`${CONTRACT_NAME} deployed to address ${contractAddress}`)
    syncContracts(networkName, contractAddress);
}

/**
 *  Sync the ABI of the deployed contracts and set the environment variables to the correct addresses
 * @param {*} networkName 
 */
const syncContracts = async (networkName, contractAddress) => {
    const envLocation = '../.env';
    const contractAddressVar = (networkName == 'mainnet') ? 'MAINNET_CONTRACT_ADDRESS' : 'TESTNET_CONTRACT_ADDRESS';

    // Update environment variables
    await setEnvValue(contractAddressVar, contractAddress, envLocation);
    console.log('.env updated for ', networkName);
    // updateABI();
}

// async function updateABI() {
//     console.log('Updating abi...');
//     const collectionsDir = path.resolve(
//         "contracts/artifacts/WinkyverseCollections_metadata.json"
//     )
//     const collectionsFile = fs.readFileSync(collectionsDir, "utf8")
//     const collectionsABI = JSON.parse(collectionsFile).output.abi

//     const collectionsPathBackend = `./app/assets/contracts/collections.json`;
//     const collectionsPathFrontend = `../nft-storefront/src/assets/contracts/collections.json`;
//     fs.writeFileSync(collectionsPathBackend, JSON.stringify({ abi: collectionsABI }));
//     fs.writeFileSync(collectionsPathFrontend, JSON.stringify({ abi: collectionsABI }));
//     console.log(`completed updating abi files`)
// }


/**
 *  Function to change the environment variables
 * @param {*} key 
 * @param {*} value 
 * @param {*} envLocation 
 */
async function setEnvValue(key, value, envLocation) {
    const ENV_VARS = fs.readFileSync(envLocation, "utf8").split(os.EOL);
    const target = ENV_VARS.indexOf(ENV_VARS.find((line) => {
        return line.match(new RegExp(key));
    }));
    ENV_VARS.splice(target, 1, `${key}='${value}'`);
    fs.writeFileSync(envLocation, ENV_VARS.join(os.EOL));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
