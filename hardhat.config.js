/** @type import('hardhat/config').HardhatUserConfig */
require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require("hardhat-gas-reporter");
const { INFURA_TESTNET_API_URL, INFURA_MAINNET_API_URL, WALLET_PRIVATE_KEY, COIN_MARKETCAP_API_KEY, HARDHAT_PRIVATE_KEY, ALCHEMY_TESTNET_API_URL } = process.env;


module.exports = {
    defaultNetwork: "sepolia",
    networks: {
        hardhat: {
            accounts:  [{privateKey: `${HARDHAT_PRIVATE_KEY}`, balance: '1000000000000000000000'}]
        },
        sepolia: {
            chainId: 11155111,
            url      : INFURA_TESTNET_API_URL,
            accounts : [`${WALLET_PRIVATE_KEY}`]
        },
        mainnet: {
            url      : INFURA_MAINNET_API_URL,
            accounts : [`${WALLET_PRIVATE_KEY}`]
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
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
        coinmarketcap: COIN_MARKETCAP_API_KEY || "",
        token: "ETH"
    }
}
