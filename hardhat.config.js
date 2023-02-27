/** @type import('hardhat/config').HardhatUserConfig */
require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require("hardhat-gas-reporter");
const { INFURA_TESTNET_API_URL, ALCHEMY_MAINNET_API_URL, PRIVATE_KEY } = process.env;


module.exports = {
    defaultNetwork: "sepolia",
    networks: {
        sepolia: {
            gas: 30000000,
            gasPrice: 8000000000,
            url      : INFURA_TESTNET_API_URL,
            accounts : [`${PRIVATE_KEY}`]
        },
        mainnet: {
            url      : ALCHEMY_MAINNET_API_URL,
            accounts : [`${PRIVATE_KEY}`]
        }
    },
    solidity: {
        version: "0.8.17",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
      }  
    },
    contractSizer: {
        runOnCompile: false,
        strict: false,
    }
}
