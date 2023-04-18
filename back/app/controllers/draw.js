const sequelize = require("../models").sequelize;
const { Op } = require("sequelize");
const Draw = require("../models").Draw;
const http = require('axios').create();
const { ethers } = require("ethers");
const dotenv = require("dotenv").config();
const { launchDraw } = require("./../../scripts/launchDraw");

module.exports = {
    createDraw: async (req, res) => {

        const drawTitle = req.body.drawTitle;
        const drawRules = req.body.drawRules;
        const drawParticipants = req.body.drawParticipants;
        const drawNbWinners = req.body.drawNbWinners;
        const drawScheduledAt = req.body.drawScheduledAt;

        const ipfsCidString = await launchDraw(drawTitle, drawRules, drawParticipants, drawNbWinners, drawScheduledAt);

        return res.status(200).json({
            ipfsCidString
        });
        
        // entry.total_supply = 0;
        // entry.thumbnail_url = `${batch}/${filename}`;
        // entry.metadata.launched_at = new Date();
        // entry.metadata.image = `ipfs://${ipfsHash}`;
        // entry.createdAt = new Date();
        // entry.updatedAt = new Date();
        // await Asset.upsert(entry);

        // Draw.findAndCountAll({ limit, offset })
        //     .then((assets) => {
        //         const response = getPagingData(assets, page, limit);
        //         return res.status(200).json(response);
        //     })
        //     .catch((err) => {
        //         return res.status(400).json({ err });
        //     });
    }
};
