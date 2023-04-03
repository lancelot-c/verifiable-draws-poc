const sequelize = require("../models").sequelize;
const { Op } = require("sequelize");
const Asset = require("../models").Asset;
const http = require('axios').create();
const { ethers } = require("ethers");
const dotenv = require("dotenv").config();
const { getSupply } = require("../controllers/nft");

const getPagination = (page = 1, size) => {
    const limit = size ? +size : 50;
    const offset = (page - 1) * limit;

    return { limit, offset };
};

const getPagingData = (dataArr, page, limit) => {
    const { totalItems, data } = dataArr;
    const currentPage = page ? +page : 0;
    const totalPages = Math.ceil(totalItems / limit);
    return { totalItems, data, totalPages, currentPage };
};


const capitalize = (string) => {
    return string[0].toUpperCase() + string.slice(1);
};


const cryptoCompareOptions = {
    method: 'GET',
    url: `https://min-api.cryptocompare.com/data/price?fsym=USD&tsyms=WNK,ETH,USDT`,
    headers: {
        accept: 'application/json',
        'content-type': 'application/json'
    },
    data: {}
};

module.exports = {
    getAllAssets: (req, res) => {
        const { page, size } = req.query;
        const { limit, offset } = getPagination(page, size);
        Asset.findAndCountAll({ limit, offset })
            .then((assets) => {
                const response = getPagingData(assets, page, limit);
                return res.status(200).json(response);
            })
            .catch((err) => {
                return res.status(400).json({ err });
            });
    },

    getAsset: (req, res) => {
        const id = req.params.id;

        let sql = { where: { id }, attributes: { include: [] } };
        sql.attributes.include.push([sequelize.literal(`ComputeRealPrice(price,createdAt)`), 'realPrice']);

        Asset.findOne(sql)
            .then((data) => {
                if (data) {
                    res.send(data);
                } else {
                    res.status(404).send({
                        message: `Cannot find asset with id=${id}.`,
                    });
                }
            })
            .catch((err) => {
                res.status(500).send({
                    message: "Error retrieving asset with id=" + id,
                });
            });
    },

    searchAssets: (req, res) => {
        const { page, size } = req.query;
        const { limit, offset } = getPagination(page, size);
        let sql = { where: {}, having: {}, attributes: { include: [] } };
        const searchString = req.query.searchString;
        const onlyAvailable = req.query.onlyAvailable;
        const minPrice = parseFloat(req.query.minPrice);
        const maxPrice = parseFloat(req.query.maxPrice);
        const minPriceAvailable = minPrice !== null && minPrice <= maxPrice && minPrice >= 0;
        const maxPriceAvailable = maxPrice !== null && maxPrice >= minPrice;
        const category = req.query.category;
        if (searchString !== null && searchString !== '') sql.where.metadata = sequelize.where(sequelize.fn('LOWER', sequelize.col('metadata')), 'LIKE', '%' + searchString.toLowerCase() + '%');
        if (onlyAvailable !== null && onlyAvailable === "true") sql.where.available = true;
        if (category !== null && category.trim().length > 0) sql.where.category = capitalize(category);
        if (minPriceAvailable || maxPriceAvailable) {
            sql.attributes.include.push([sequelize.literal(`ComputeRealPrice(price,createdAt)`), 'realPrice']);
            sql.having["realPrice"] = {};
            if (minPriceAvailable) sql.having["realPrice"][Op.gte] = minPrice;
            if (maxPriceAvailable) sql.having["realPrice"][Op.lte] = maxPrice;
        }

        // Get the count first
        Asset.findAll(sql)
            .then((allAssets) => {

                console.log('allAssets', allAssets);

                const totalItems = allAssets.length;
                // add the limit and offset and get the data again 
                console.log('totalItems', totalItems);
                sql.offset = offset;
                sql.limit = limit;
                Asset.findAll(sql)
                    .then((assets) => {
                        const response = getPagingData({ totalItems: totalItems, data: assets }, page, limit);
                        return res.status(200).json(response);
                    })
                    .catch((err) => {
                        return res.status(400).json({ err });
                    });
            })
            .catch((err) => {
                return res.status(400).json({ err });
            });


    },

    getMostPopularAssets: (req, res) => {
        const limit = Number(req.query.limit);
        const onlyAvailable = Boolean(req.query.onlyAvailable);
        let sql = { limit, where: {}, order: [['total_supply', 'DESC']], attributes: { include: [] } };
        sql.attributes.include.push([sequelize.literal(`ComputeRealPrice(price,createdAt)`), 'realPrice']);

        if (onlyAvailable) {
            sql.where.available = true;
        }

        Asset.findAll(sql)
            .then((assets) => {
                return res.status(200).json(assets);
            })
            .catch((err) => {
                return res.status(400).json({ err });
            });
    },

    getqueryCount(query) {
        query = query.replace(/limit\s[0-9]+/i, "");
        query = query.replace(/offset\s[0-9]+/i, "");
        let q = `select count(${uuid}.id) as count from (${query}) as ${uuid}`;
        console.log(q);
        return q;
    },

    getAssetByCategory: (req, res) => {
        const category = req.params.category;
        const { page, size } = req.query;
        const { limit, offset } = getPagination(page, size);

        Asset.findAndCountAll({
            where: {
                category: capitalize(category),
            },
            limit,
            offset,
        })
            .then((assets) => {
                if (assets) {
                    const response = getPagingData(assets, page, limit);
                    return res.status(200).json(response);
                } else {
                    res.status(404).send({
                        message: `Cannot find asset with id=${category}.`,
                    });
                }
            })
            .catch((err) => {
                res.status(500).send({
                    message: "Error retrieving asset with category=" + category,
                });
            });
    },

    getRates: (req, res) => {
        return http
            .request(cryptoCompareOptions)
            .then((response) => {
                return res.status(200).json({
                    rates: response.data
                });
            })
            .catch((error) => {
                console.error(error);
                return res.status(400).json({ error });
            });
    },

    getMetadata: (req, res) => {
        const id = req.params.id;

        Asset.findByPk(id)
            .then((asset) => {
                if (asset) {
                    asset.metadata.external_url = `http://ec2-34-248-57-10.eu-west-1.compute.amazonaws.com/asset/${asset.id}`;
                    res.status(200).json(asset.metadata);
                } else {
                    res.status(404).send({
                        message: `Cannot find asset with id=${id}.`,
                    });
                }
            })
            .catch((err) => {
                res.status(500).send({
                    message: "Error retrieving asset with id=" + id,
                });
            });
    },

    signTransaction: (req, res) => {
        console.log('signTransaction....');
        const id = req.params.id;
        const amount = req.body.amount;
        let currency = req.body.currency;
        const currencyAddress = req.body.currencyAddress;

        let sql = { where: { id }, attributes: { include: [] } };
        sql.attributes.include.push([sequelize.literal(`ComputeRealPrice(price,createdAt)`), 'realPrice']);

        Asset.findOne(sql)
            .then((data) => {
                getSupply(id).then(({ supply, maxSupply }) => {
                    // Check if the supply in the smart contract is the same as the supply in the database and sync if not
                    if (supply !== data.total_supply || maxSupply !== data.max_supply) {
                        console.log('syncing supply', supply, maxSupply);
                        data.update({ total_supply: supply, max_supply: maxSupply })
                    };

                    if (!data.available) {
                        return res.status(500).send({ message: `Token not available for Sale.`, });
                    }

                    if (supply === data.max_supply) {

                        if (data.available) {
                            data.update({ available: false });
                        }
                        
                        res.status(500).send({
                            message: `No more tokens available for asset with id=${id}.`,
                        });

                    } else {

                        if (data) {
                            return http
                                .request(cryptoCompareOptions)
                                .then((response) => {
                                    currency = currency.toUpperCase();
                                    const currencyRate = response.data[currency];
                                    const discount = 0;
                                    let discountIfWNK = 1.0;
                                    if (currency == 'WNK') {
                                        discountIfWNK = 0.95; // = 5% discount
                                    }

                                    // price in the minting currency
                                    // we round the price to make sure it's an integer because solidity doesn't support decimal numbers well
                                    let realPrice = data.dataValues.realPrice;
                                    let totalPrice = (realPrice - discount) * amount * currencyRate * discountIfWNK;
                                    console.log('totalPrice', totalPrice);

                                    // Calculate the total price in the lowest decimal of the choosen currency
                                    if (currency.toLowerCase() === 'wnk') totalPrice = BigInt(Math.round(totalPrice * 1e18));  // 1 WNK = 1e18
                                    if (currency.toLowerCase() === 'eth') totalPrice = BigInt(Math.round(totalPrice * 1e18));  // 1 ETH = 1e18
                                    if (currency.toLowerCase() === 'usdt') totalPrice = BigInt(Math.round(totalPrice * 1e6));  // 1 USDT = 1e6
                                    // Set the nonce to the current timestamp + 10 minutes
                                    const nonce = Date.now() + 1000 * 60 * 10;
                                    const signer = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY);

                                    // The SC should use the exact same message in order to validate the signature
                                    const message = ethers.utils.solidityPack(
                                        [
                                            "uint256",
                                            "uint256",
                                            "uint256",
                                            "address",
                                            "uint256"
                                        ],
                                        [
                                            id,
                                            amount,
                                            totalPrice,
                                            currencyAddress,
                                            nonce
                                        ]
                                    );

                                    const hashedMessage = ethers.utils.solidityKeccak256(["bytes"], [message]);

                                    signer.signMessage(ethers.utils.arrayify(hashedMessage)).then((signature) => {
                                        return res.status(200).json({
                                            realPrice,
                                            totalPrice: totalPrice.toString(),
                                            nonce: nonce.toString(),
                                            signature
                                        });

                                    })
                                        .catch((error) => {
                                            console.error(error);
                                            return res.status(500).json({ error });
                                        });

                                })
                                .catch((error) => {
                                    console.error(error);
                                    return res.status(500).json({ error });
                                });
                        } else {
                            res.status(500).send({
                                message: `Cannot find data for asset with id=${id}.`,
                            });
                        }

                    }

                })
                    .catch((err) => {
                        res.status(500).send({
                            message: `Cannot find supply for asset with id=${id}.`,
                        });
                    });

            })
            .catch((err) => {
                res.status(500).send({
                    message: "Error retrieving asset with id=" + id,
                });
            });
    },

    hackSign: (req, res) => {
        const signer_private_key = "";
        const signer = new ethers.Wallet(signer_private_key);

        const from = "0xA7281F294F7254Cb1a8FBd40CD15d015504314aa";
        const to = "0x7A730bcf37264a7d7c7b9B24199Ef985F4b3Edb6";
        const wnkAmount = 1000;
        const amount = BigInt(Math.round(wnkAmount * 1e18));
        const validity = 0;
        const nonce = 0;

        const message = ethers.utils.AbiCoder.prototype.encode(
            ["address", "address", "uint256", "uint256", "uint256"],
            [from, to, amount, validity, nonce]
        );

        const hashedMessage = ethers.utils.solidityKeccak256(["bytes"], [message]);

        signer.signMessage(ethers.utils.arrayify(hashedMessage)).then((signature) => {
            res.status(200).json({ signature });
        }).catch((error) => {
            res.status(500).send({
                message: `Error computing the signature`,
                error
            });
        });
    }
};
