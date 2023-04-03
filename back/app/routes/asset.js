const express = require("express");
const router = express.Router();
const { getAllAssets, getAsset, searchAssets, getMostPopularAssets, getAssetByCategory, getRates, signTransaction, getMetadata, hackSign } = require("../controllers/asset");

router.get("/getAll", getAllAssets);
router.get("/search-assets", searchAssets);
router.get("/most-popular", getMostPopularAssets);
router.get("/getByCategory/:category", getAssetByCategory);
router.get("/getMetadata/:id", getMetadata);
router.get("/hackSign", hackSign);
router.get("/getRates", getRates); // Make sure this route is located before the "/:id" route, otherwise it will never be called
router.get("/:id", getAsset);
router.post("/:id/sign", signTransaction);

module.exports = router;
