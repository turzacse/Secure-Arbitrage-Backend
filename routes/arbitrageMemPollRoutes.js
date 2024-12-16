const express = require("express");
const { 
        getUSDTTrades, 
        getAllTradesData,
        deleteTradeById,
        deleteAllTrades,
        getUpdatedTrades,
        updateTimestamps
     } = require("../controllers/arbitrageMemPoolController");

const router = express.Router();

// Define the route for fetching USDT trades
router.get("/usdt-trades", getUSDTTrades);
router.get("/get/trade/data", getAllTradesData);
router.delete("/delete/:id", deleteTradeById);
router.delete("/delete/all/data", deleteAllTrades);
router.get("/all/trade/random/data", getUpdatedTrades);
router.put("/update/trade/data", updateTimestamps)

module.exports = router;
