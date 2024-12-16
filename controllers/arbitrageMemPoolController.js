// const axios = require("axios");
// const { ethers } = require("ethers");

// // Load environment variables
// const quickNodeUrl = process.env.QUICKNODE_URL;
// const usdtContract = process.env.USDT_CONTRACT;

// /**
//  * Fetch and filter pending transactions for USDT trades.
//  */
// exports.getUSDTTrades = async (req, res) => {
//   try {
//     const payload = {
//       jsonrpc: "2.0",
//       method: "eth_getBlockByNumber",
//       params: ["pending", true], // Fetch pending transactions
//       id: 1,
//     };

//     console.log("url of quickNode ========> ", quickNodeUrl)
//     // Fetch pending transactions from QuickNode
//     const response = await axios.post(quickNodeUrl, payload);

//     console.log("responseeeeeeeeeeeeeeeeeeeeeee ==================>>>>>>>>>> ", response)
//     const transactions = response.data.result.transactions;


//     // Filter transactions involving USDT
//     const filteredTransactions = transactions.filter((tx) => {
//       const inputData = tx.input;
//       if (!inputData) return false;

//       // Decode input data to check for "transfer(address,uint256)"
//       const methodId = inputData.slice(0, 10); // First 4 bytes
//       const isTransferMethod = methodId === "0xa9059cbb"; // BEP20 transfer method ID

//       // Check if the transaction is directed to the USDT contract
//       return (
//         isTransferMethod && tx.to.toLowerCase() === usdtContract.toLowerCase()
//       );
//     });

//     // Map filtered transactions into the required block structure
//     const trades = filteredTransactions.map((tx, index) => {
//       const decodedData = ethers.utils.defaultAbiCoder.decode(
//         ["address", "uint256"],
//         "0x" + tx.input.slice(10)
//       );

//       const [recipient, amount] = decodedData;

//       return {
//         Block: {
//           Number: tx.blockNumber || "pending",
//           Time: new Date().toISOString(), // Placeholder for pending transactions
//         },
//         ChainId: "56", // Binance Smart Chain ID
//         Trade: {
//           Amount: ethers.utils.formatUnits(amount, 18),
//           Buyer: recipient,
//           Currency: {
//             Name: "Tether USD",
//             ProtocolName: "BEP20",
//             SmartContract: usdtContract,
//             Symbol: "USDT",
//           },
//           Dex: {
//             Pair: {
//               Name: "", // Placeholder
//               Symbol: "", // Placeholder
//             },
//             ProtocolFamily: "Unknown", // Placeholder
//             ProtocolName: "Unknown", // Placeholder
//             ProtocolVersion: "Unknown", // Placeholder
//           },
//           Price: "Unknown", // Placeholder for price
//         },
//         Transaction: {
//           Hash: tx.hash,
//         },
//       };
//     });

//     res.json({
//       success: true,
//       trades,
//     });
//   } catch (error) {
//     console.error("Error fetching or processing transactions:", error.message);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch or process transactions",
//     });
//   }
// };

// controllers/bitqueryController.js
const { WebSocket } = require("ws");

const token = "ory_at_6-SvJQ5maUOLqhcmwq_e-cQy2TZUpurn065I6XGZg_o.vV_rEAuMbpqXN_MCXL07cTMYL3FriZr2ahfM9rv4tMY	"; // Replace with your actual token

const mongoose = require('mongoose');

// Define Mongoose Schema for the Trade Data
const tradeSchema = new mongoose.Schema({
  timestamp: { type: Date, required: false },
  buyAmount: { type: String, required: false },
  buyAmountUSD: { type: String, required: false },
  buyerAddress: { type: String, required: false },
  buyTokenName: { type: String, required: false },
  buyTokenAddress: { type: String, required: false },
  buyTokenPrice: { type: String, required: false },
  buyTokenPriceUSD: { type: String, required: false },
  exchange: { type: String, required: false },
  exchangeAddress: { type: String, required: false },
  sellAmount: { type: String, required: false },
  sellAmountUSD: { type: String, required: false },
  sellerAddress: { type: String, required: false },
  sellTokenName: { type: String, required: false },
  sellTokenAddress: { type: String, required: false },
  sellTokenPrice: { type: String, required: false },
  sellTokenPriceUSD: { type: String, required: false },
  transactionAddress: { type: String, required: false },
}, { timestamps: true });

// Create a Mongoose Model
const Trade = mongoose.model('Trade', tradeSchema);

// WebSocket Data Processing and Saving Function
exports.getUSDTTrades = async (req, res) => {
  try {
    const bitqueryConnection = new WebSocket(
      `wss://streaming.bitquery.io/graphql?token=${token}`,
      ["graphql-ws"]
    );

    bitqueryConnection.on("open", () => {
      console.log("Connected to Bitquery.");

      const initMessage = JSON.stringify({ type: "connection_init" });
      bitqueryConnection.send(initMessage);
    });

    bitqueryConnection.on("message", async (data) => {
      const response = JSON.parse(data);

      if (response.type === "connection_ack") {
        const subscriptionMessage = JSON.stringify({
          type: "start",
          id: "1",
          payload: {
            query: `
              subscription {
                EVM(network: bsc, mempool: true) {
                DEXTrades(
                  orderBy: {ascending: Transaction_Time}
                  limit: {count: 10, offset: 0}
                  where: {Trade: {Buy: {}, Sell: {Currency: {SmartContract: {is: "0x55d398326f99059fF775485246999027B3197955"}}}}}
                ) {
                Trade {
                  Dex {
                    ProtocolFamily
                    ProtocolName
                    ProtocolVersion
                    SmartContract
                    Pair {
                      Name
                      SmartContract
                      Symbol
                    }
                    OwnerAddress
                  }
                  Buy {
                    Amount
                    AmountInUSD
                    Buyer
                    Price
                    PriceInUSD
                    Seller
                    URIs
                    Currency {
                      Name
                      ProtocolName
                      SmartContract
                      Symbol
                    }
                  }
                  Fees {
                    Amount
                    AmountInUSD
                    Recipient
                    Payer
                    Currency {
                      Name
                      ProtocolName
                      SmartContract
                      Symbol
                    }
                  }
                  Sender
                  Sell {
                    Amount
                    AmountInUSD
                    Buyer
                    Price
                    PriceInUSD
                    Seller
                    Currency {
                      SmartContract
                      ProtocolName
                      Name
                      Symbol
                    }
                  }
                }
                Fee {
                  Burnt
                  BurntInUSD
                  EffectiveGasPrice
                  EffectiveGasPriceInUSD
                  GasRefund
                  SenderFee
                  SenderFeeInUSD
                  PriorityFeePerGasInUSD
                  PriorityFeePerGas
                  MinerRewardInUSD
                  MinerReward
                }
                Block {
                  GasUsed
                  GasLimit
                  Hash
                  BaseFee
                  Date
                  Time
                }
                Transaction {
                  Gas
                  GasPrice
                  Value
                  Time
                  Hash
                  Nonce
                  GasFeeCapInUSD
                  GasFeeCap
                  Cost
                  From
                  CostInUSD
                  GasPriceInUSD
                }
                TransactionStatus {
                  Success
                  FaultError
                  EndError
                }
              }
              }
             }
            `,
          },
        });
        bitqueryConnection.send(subscriptionMessage);
      }

      if (response.type === "data") {
        const dexTrades = response.payload?.data?.EVM?.DEXTrades || [];

        for (const trade of dexTrades) {
          const tradeData = new Trade({
            timestamp: trade.Block?.Time,
            buyAmount: trade.Trade?.Buy?.Amount,
            buyAmountUSD: trade.Trade?.Buy?.AmountInUSD,
            buyerAddress: trade.Trade?.Buy?.Buyer,
            buyTokenName: trade.Trade?.Buy?.Currency?.Symbol,
            buyTokenAddress: trade.Trade?.Buy?.Currency?.SmartContract,
            buyTokenPrice: trade.Trade?.Buy?.Price,
            buyTokenPriceUSD: trade.Trade?.Buy?.PriceInUSD,
            exchange: trade.Trade?.Dex?.ProtocolFamily,
            exchangeAddress: trade.Trade?.Dex?.SmartContract,
            sellAmount: trade.Trade?.Sell?.Amount,
            sellAmountUSD: trade.Trade?.Sell?.AmountInUSD,
            sellerAddress: trade.Trade?.Sell?.Buyer,
            sellTokenName: trade.Trade?.Sell?.Currency?.Symbol,
            sellTokenAddress: trade.Trade?.Sell?.Currency?.SmartContract,
            sellTokenPrice: trade.Trade?.Sell?.Price,
            sellTokenPriceUSD: trade.Trade?.Sell?.PriceInUSD,
            transactionAddress: trade.Transaction?.Hash,
          } 
        );

          await tradeData.save();
        }

        console.log("Data saved to the database.");
      }

      if (response.type === "ka") {
        console.log("Keep-alive message received.");
      }

      if (response.type === "error") {
        console.error("Error message received:", response.payload.errors);
      }
    });

    bitqueryConnection.on("close", () => {
      console.log("Disconnected from Bitquery.");
    });

    bitqueryConnection.on("error", (error) => {
      console.error("WebSocket Error:", error);
    });

    res.status(200).json({ message: "Listening for trades and saving to database." });
  } catch (error) {
    console.error("Error establishing WebSocket connection:", error);
    res.status(500).json({ error: "Failed to establish WebSocket connection." });
  }
};



exports.getAllTradesData = async (req, res) =>{
  try {
    const trades = await Trade.find();
    res.status(200).json(trades);
  } catch (error) {
    console.error("Error fetching trades:", error);
    res.status(500).json({ error: "Failed to fetch trades." });
  }
}


exports.deleteTradeById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTrade = await Trade.findByIdAndDelete(id);

    if (!deletedTrade) {
      return res.status(404).json({ error: "Trade not found." });
    }

    res.status(200).json({ message: "Trade deleted successfully.", deletedTrade });
  } catch (error) {
    console.error("Error deleting trade:", error);
    res.status(500).json({ error: "Failed to delete trade." });
  }
};

exports.deleteAllTrades = async (req, res) => {
  try {
    const result = await Trade.deleteMany({}); // Deletes all documents in the Trade collection

    res.status(200).json({
      message: "All trades deleted successfully.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting all trades:", error);
    res.status(500).json({ error: "Failed to delete all trades." });
  }
};


const moment = require('moment');

// Helper function to generate unique random indices
const generateRandomIndices = (max, count) => {
  const indices = new Set();
  while (indices.size < count) {
    const randomIndex = Math.floor(Math.random() * max); // 0-based index
    indices.add(randomIndex);
  }
  return Array.from(indices);
};

exports.updateTimestamps = async (req, res) => {
  try {
    // Count the total number of documents in the collection
    const totalDocs = await Trade.countDocuments();
    if (totalDocs === 0) {
      return res.status(404).json({ message: "No trades found to update." });
    }

    // Generate 20 unique random indices
    const randomIndices = generateRandomIndices(totalDocs, 4);

    // Fetch all trades and map the random indices to actual documents
    const allTrades = await Trade.find().select("_id"); // Fetch only the _id field for performance
    const tradesToUpdate = randomIndices.map((index) => allTrades[index]);

    // Get the current timestamp in the required format
    const currentTime = new Date().toISOString(); // Format: 2024-12-11T14:56:42.000Z

    // Prepare bulk operations to update timestamps
    const bulkOps = tradesToUpdate.map((trade) => ({
      updateOne: {
        filter: { _id: trade._id },
        update: { timestamp: currentTime },
      },
    }));

    // Perform the bulk update
    if (bulkOps.length > 0) {
      await Trade.bulkWrite(bulkOps);
    }

  } catch (error) {
    console.error("Error updating timestamps:", error);
  }
};

// Use setInterval to call this function every 5 seconds
setInterval(async () => {
  try {
    await exports.updateTimestamps({});
  } catch (error) {
    console.error("Error in scheduled timestamp update:", error);
  }
}, 1000);



exports.getUpdatedTrades = async (req, res) => {
  try {
    // Get the 20 most recently updated entries
    const trades = await Trade.find({})
      .sort({ updatedAt: -1 })
      .limit(20)
      .select("timestamp buyAmount buyAmountUSD buyTokenName transactionAddress");

    res.status(200).json(trades);
  } catch (error) {
    console.error("Error fetching updated trades:", error);
    res.status(500).json({ error: "Failed to fetch updated trades." });
  }
};


// exports.getUSDTTrades = async (req, res) => {
//   try {
//     const bitqueryConnection = new WebSocket(
//       `wss://streaming.bitquery.io/graphql?token=${token}`,
//       ["graphql-ws"]
//     );

//     let receivedData = []; // Temporary storage for WebSocket data

//     bitqueryConnection.on("open", () => {
//       console.log("Connected to Bitquery.");

//       // Send initialization message (connection_init)
//       const initMessage = JSON.stringify({ type: "connection_init" });
//       bitqueryConnection.send(initMessage);
//     });

//     bitqueryConnection.on("message", (data) => {
//       const response = JSON.parse(data);

//       // Handle connection acknowledgment (connection_ack)
//       if (response.type === "connection_ack") {
//         console.log("Connection acknowledged by server.");

//         // Send subscription message after receiving connection_ack
//         const subscriptionMessage = JSON.stringify({
//           type: "start",
//           id: "1",
//           payload: {
//             query: `
//              subscription {
//               EVM(network: bsc, mempool: true) {
//               DEXTrades(
//                 orderBy: {ascending: Transaction_Time}
//                 limit: {count: 10, offset: 0}
//                 where: {Trade: {Buy: {}, Sell: {Currency: {SmartContract: {is: "0x55d398326f99059fF775485246999027B3197955"}}}}}
//               ) {
//                 Trade {
//                   Dex {
//                     ProtocolFamily
//                     ProtocolName
//                     ProtocolVersion
//                     SmartContract
//                     Pair {
//                       Name
//                       SmartContract
//                       Symbol
//                     }
//                     OwnerAddress
//                   }
//                   Buy {
//                     Amount
//                     AmountInUSD
//                     Buyer
//                     Price
//                     PriceInUSD
//                     Seller
//                     URIs
//                     Currency {
//                       Name
//                       ProtocolName
//                       SmartContract
//                       Symbol
//                     }
//                   }
//                   Fees {
//                     Amount
//                     AmountInUSD
//                     Recipient
//                     Payer
//                     Currency {
//                       Name
//                       ProtocolName
//                       SmartContract
//                       Symbol
//                     }
//                   }
//                   Sender
//                   Sell {
//                     Amount
//                     AmountInUSD
//                     Buyer
//                     Price
//                     PriceInUSD
//                     Seller
//                     Currency {
//                       SmartContract
//                       ProtocolName
//                       Name
//                       Symbol
//                     }
//                   }
//                 }
//                 Fee {
//                   Burnt
//                   BurntInUSD
//                   EffectiveGasPrice
//                   EffectiveGasPriceInUSD
//                   GasRefund
//                   SenderFee
//                   SenderFeeInUSD
//                   PriorityFeePerGasInUSD
//                   PriorityFeePerGas
//                   MinerRewardInUSD
//                   MinerReward
//                 }
//                 Block {
//                   GasUsed
//                   GasLimit
//                   Hash
//                   BaseFee
//                   Date
//                   Time
//                 }
//                 Transaction {
//                   Gas
//                   GasPrice
//                   Value
//                   Time
//                   Hash
//                   Nonce
//                   GasFeeCapInUSD
//                   GasFeeCap
//                   Cost
//                   From
//                   CostInUSD
//                   GasPriceInUSD
//                 }
//                 TransactionStatus {
//                   Success
//                   FaultError
//                   EndError
//                 }
//               }
//               }
//              }
//             `,
//           },
//         });

//         bitqueryConnection.send(subscriptionMessage);
//         console.log("Subscription message sent.");
//       }

//       // Handle received data
//       if (response.type === "data") {
//         console.log("Received data from Bitquery: ", response.payload.data);
//         receivedData.push(response.payload.data); // Store the data in the array
//       }

//       // Handle keep-alive messages (ka)
//       if (response.type === "ka") {
//         console.log("Keep-alive message received.");
//       }

//       // Handle errors
//       if (response.type === "error") {
//         console.error("Error message received:", response.payload.errors);
//       }
//     });

//     bitqueryConnection.on("close", () => {
//       console.log("Disconnected from Bitquery.");
//     });

//     bitqueryConnection.on("error", (error) => {
//       console.error("WebSocket Error:", error);
//     });

//     // Wait for data to accumulate for a short period before sending a response
//     setTimeout(() => {
//       if (receivedData.length > 0) {
//         res.status(200).json({
//           message: "Data received from Bitquery",
//           data: receivedData,
//         });
//       } else {
//         res.status(200).json({
//           message: "No data received within the given timeframe.",
//           data: [],
//         });
//       }
//       bitqueryConnection.close(); // Close the WebSocket connection
//     }, 6000); // Adjust timeout duration as needed (e.g., 5000ms = 5 seconds)
//   } catch (error) {
//     console.error("Error establishing WebSocket connection:", error);
//     res.status(500).json({ error: "Failed to establish WebSocket connection." });
//   }
// };




