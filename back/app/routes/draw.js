const express = require("express");
const router = express.Router();
const { createDraw } = require("./../controllers/draw");

router.post("/create", createDraw);

module.exports = router;