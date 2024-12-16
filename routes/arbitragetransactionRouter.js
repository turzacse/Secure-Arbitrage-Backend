const express = require("express");
const transactionController = require("../controllers/arbitragetransactionController");

const router = express.Router();

router.get("/usdt", transactionController.getUSDTTransactions);

module.exports = router;
