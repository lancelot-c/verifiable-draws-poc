import http from 'axios'
http.create()
import * as dotenv from 'dotenv'
dotenv.config()
import { createDraw, triggerDraw } from "./../../scripts/launchDraw.js";


export async function create(req, res) {

    const drawTitle = req.body.drawTitle;
    const drawRules = req.body.drawRules;
    const drawParticipants = req.body.drawParticipants;
    const drawNbWinners = req.body.drawNbWinners;
    const drawScheduledAt = req.body.drawScheduledAt;

    const [ipfsCidString, drawFilename] = await createDraw(drawTitle, drawRules, drawParticipants, drawNbWinners, drawScheduledAt);

    return res.status(200).json({
        ipfsCidString,
        drawFilename
    });
}

export async function launch(req, res) {

    const cid = req.body.cid;
    const response = await triggerDraw(cid);

    return res.status(200).json({
        response
    });
}
