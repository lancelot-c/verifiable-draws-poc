const fs = require('fs');
const { ethers } = require('ethers');
const alchemyConfig = require("../config/alchemy.config.js");
const abi = JSON.parse(fs.readFileSync('./app/assets/contracts/collections.json')).abi;
const provider = new ethers.providers.JsonRpcProvider(alchemyConfig[alchemyConfig.selected].rpc.rpcUrl, alchemyConfig[alchemyConfig.selected].rpc.chainId);
const contract = new ethers.Contract(alchemyConfig[alchemyConfig.selected].contracts.collections, abi, provider);


const updateSupply = async (tokenId) => {
    Asset.findByPk(tokenId).then((asset) => {
        if (asset) {
            contract.getTokenSupply(tokenId).then((response) => {
                const supply = parseInt(BigInt(response[0]._hex))
                let available = true;
                if(supply === asset.max_supply){
                    available = false;
                }
                asset.update({ total_supply: supply, available: available });
            })            
        }
    })
}

module.exports = {

    subscribeEvents: async () => {
        console.log('subscribeEvents called for contracts:', alchemyConfig[alchemyConfig.selected].contracts.collections);
        
        contract.on("TransferSingle", (address, from, to, id, value) => {
            const tokenId = parseInt(BigInt(id._hex));
            console.log('TransferSingle event received', tokenId);
            updateSupply(tokenId);
        });

        contract.on("TransferBatch", (address, from, to, ids, values) => {
            for (let i = 0; i < ids.length; i++) {
                const tokenId = parseInt(BigInt(ids[i]._hex));
                console.log('TransferBatch event received', tokenId);
                updateSupply(tokenId);
            }
        });
    }

};
