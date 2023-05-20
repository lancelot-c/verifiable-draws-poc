/** @type import('hardhat/config').HardhatUserConfig */
require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require("hardhat-gas-reporter");
const { HARDHAT_DEFAULT_NETWORK, TESTNET_API_URL, MAINNET_API_URL, WALLET_PRIVATE_KEY, COIN_MARKETCAP_API_KEY } = process.env;


module.exports = {
    defaultNetwork: HARDHAT_DEFAULT_NETWORK,
    networks: {
        testnet: {
            url      : TESTNET_API_URL,
            accounts : [`${WALLET_PRIVATE_KEY}`]
        },
        mainnet: {
            url      : MAINNET_API_URL,
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
