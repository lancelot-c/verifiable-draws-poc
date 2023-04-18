/** @type import('hardhat/config').HardhatUserConfig */
require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require("hardhat-gas-reporter");
const { INFURA_TESTNET_API_URL, INFURA_MAINNET_API_URL, WALLET_PRIVATE_KEY, COIN_MARKETCAP_API_KEY } = process.env;


module.exports = {
    defaultNetwork: "sepolia",
    networks: {
        sepolia: {
            url      : INFURA_TESTNET_API_URL,
            accounts : [`${WALLET_PRIVATE_KEY}`]
        },
        mainnet: {
            url      : INFURA_MAINNET_API_URL,
            accounts : [`${WALLET_PRIVATE_KEY}`]
        }
    },
    solidity: {
        version: "0.8.19",
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
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
        coinmarketcap: COIN_MARKETCAP_API_KEY || "",
        token: "ETH"
    }
}
