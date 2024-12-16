const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const path = require("path");
const NodeCache = require("node-cache");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
var cron = require('node-cron');
const port = 9096;
const app = express();
const http = require("http");
const axios = require('axios');
//app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

app.use(cookieParser());
app.use(express.raw({ type: 'text/event-stream' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.urlencoded({ extended: true }));

global.__basedir = "public/"; // set base directory

// MongoDB configuration
const db = require("./config/db");

mongoose.set("strictQuery", false);

mongoose
  .connect(db.mongoURIDev)
  .then(() => console.log("Mongodb Connected"))
  .catch((err) => console.log(err));
//Use Routes


const BSC_API_KEY = "YMQWA5J4541HGBJU32GGN65EVK6PKIUQAI";
// Store gas fees in memory (or you can use a database for persistence)
let gasFees = null;

// Function to fetch gas fees and calculate
const calculateGasFees = async (bnbAmount) => {
  try {
    // Fetch gas prices from BscScan
    const gasResponse = await axios.get(
      `https://api.bscscan.com/api?module=gastracker&action=gasoracle&apikey=${BSC_API_KEY}`
    );

    if (gasResponse.data.status !== "1") {
      throw new Error("Failed to fetch gas fees from BscScan");
    }

    const { SafeGasPrice, ProposeGasPrice, FastGasPrice } =
      gasResponse.data.result;

    // Fetch BNB USD price from CoinGecko
    const priceResponse = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd"
    );

    const bnbUsdPrice =
      priceResponse.data.binancecoin && priceResponse.data.binancecoin.usd;

    if (!bnbUsdPrice) {
      throw new Error("Failed to fetch BNB price from CoinGecko");
    }

    // Define the gas limit for a sample transaction
    const gasLimit = 21000; // Typical gas limit for a standard transaction

    // Gas prices in Gwei
    const gasPrices = {
      safe: parseFloat(SafeGasPrice),
      propose: parseFloat(ProposeGasPrice),
      fast: parseFloat(FastGasPrice),
    };

    // Convert gas price to BNB
    const calculateFee = (gasPrice) =>
      (gasPrice * gasLimit * 1e-9).toFixed(8); // Gas Price in BNB

    const fees = {
      safe: {
        bnb: calculateFee(gasPrices.safe),
        usd: (calculateFee(gasPrices.safe) * bnbUsdPrice).toFixed(2),
      },
      propose: {
        bnb: calculateFee(gasPrices.propose),
        usd: (calculateFee(gasPrices.propose) * bnbUsdPrice).toFixed(2),
      },
      fast: {
        bnb: calculateFee(gasPrices.fast),
        usd: (calculateFee(gasPrices.fast) * bnbUsdPrice).toFixed(2),
      },
    };

    // Total cost for buying `bnbAmount`
    const totalCost = {
      safe: {
        bnb: (parseFloat(fees.safe.bnb) + bnbAmount).toFixed(8),
        usd: (
          parseFloat(fees.safe.usd) +
          bnbAmount * bnbUsdPrice
        ).toFixed(2),
      },
      propose: {
        bnb: (parseFloat(fees.propose.bnb) + bnbAmount).toFixed(8),
        usd: (
          parseFloat(fees.propose.usd) +
          bnbAmount * bnbUsdPrice
        ).toFixed(2),
      },
      fast: {
        bnb: (parseFloat(fees.fast.bnb) + bnbAmount).toFixed(8),
        usd: (
          parseFloat(fees.fast.usd) +
          bnbAmount * bnbUsdPrice
        ).toFixed(2),
      },
    };

    return { fees, totalCost };
  } catch (error) {
    console.error("Error fetching gas fees:", error.message);
    throw error;
  }
};

// Endpoint to calculate fees for a given amount of BNB
app.get("/calculate-gas-fees/:bnbAmount", async (req, res) => {
  const bnbAmount = parseFloat(req.params.bnbAmount); // Amount in BNB

  if (isNaN(bnbAmount) || bnbAmount <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid BNB amount. Provide a positive number." });
  }

  try {
    const result = await calculateGasFees(bnbAmount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate gas fees" });
  }
});


// Initialize the cache
const tokenCache = new NodeCache();

const fetchTopDexTokens = async () => {
  try {
    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=5000",
      {
        headers: {
          "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
        },
      }
    );

    const tokenPrices = response.data.data
      .map((token) => ({
        id: token.id, // Include the token's ID
        name: token.name,
        symbol: token.symbol,
        price: token.quote.USD.price,
        marketCap: token.quote.USD.market_cap,
        tags: token.tags,
      }))
      .filter((token) => {
        const price = parseFloat(token.price);
        return (
          price >= 0.000001 &&
          token.tags &&
          token.tags.some((tag) => tag.toLowerCase().includes("-dex-token"))
        );
      })
      .slice(0, 100);

    
    tokenCache.set("topDexTokens", tokenPrices);

    console.log("Updated top 100 DEX tokens in cache with contract addresses.");
  } catch (error) {
    console.error("Error fetching tokens:", error.message);
  }
};



// Schedule the cron job to update tokens every 4 hours
// Schedule the task
cron.schedule(
  '0 0,4,8,12,16,20 * * *',
  () => {
    console.log("Running scheduled task");
    fetchTopDexTokens(); // Your function to fetch the data
  },
  { timezone: "Asia/Singapore" } // Set the timezone
);

// Fetch data initially on server start
fetchTopDexTokens();

// API endpoint to get token data
app.get("/tokens-coin", (req, res) => {
  const cachedTokens = tokenCache.get("topDexTokens");
  if (!cachedTokens) {
    return res.status(404).json({ message: "Token data not available." });
  }
  res.json(cachedTokens);
});

app.get("/tokens-coin-hit", (req, res) => {
  fetchTopDexTokens();
  res.json(tokenPrices);

});



const serverUrl = 'https://backend.superdapps.net/'; 


const checkServerStatus = async () => {
  try {
    const data = {
      from: {
          email: "no-reply@dsl.sg"
      },
      to: [
          {
              email: "priya@dsl.sg"
          },
           {
            email: "shajjadhossan111@gmail.com"
          },
          {
            email: "hossainaquib20@gmail.com"
          },
          {
            email: "support@dslegends.org"
          },
          {
            email: "sam@dsl.sg"
          }
      ],
      subject: "SUPERDAPPS SERVER DETAILS ",
      html: `<html>

                  <head>
                      <style>
                          @media only screen and (max-width: 620px) {
                              table.body h1 {
                                  font-size: 28px !important;
                                  margin-bottom: 10px !important;
                              }

                              table.body p,
                              table.body ul,
                              table.body ol,
                              table.body td,
                              table.body span,
                              table.body a {
                                  font-size: 16px !important;
                              }

                              table.body .wrapper,
                              table.body .article {
                                  padding: 10px !important;
                              }

                              table.body .content {
                                  padding: 0 !important;
                              }

                              table.body .container {
                                  padding: 0 !important;
                                  width: 100% !important;
                              }

                              table.body .main {
                                  border-left-width: 0 !important;
                                  border-radius: 0 !important;
                                  border-right-width: 0 !important;
                              }

                              table.body .btn table {
                                  width: 100% !important;
                              }

                              table.body .btn a {
                                  width: 100% !important;
                              }

                              table.body .img-responsive {
                                  height: auto !important;
                                  max-width: 100% !important;
                                  width: auto !important;
                              }
                          }

                          @media all {
                              .ExternalClass {
                                  width: 100%;
                              }

                              .ExternalClass,
                              .ExternalClass p,
                              .ExternalClass span,
                              .ExternalClass font,
                              .ExternalClass td,
                              .ExternalClass div {
                                  line-height: 100%;
                              }

                              .apple-link a {
                                  color: inherit !important;
                                  font-family: inherit !important;
                                  font-size: inherit !important;
                                  font-weight: inherit !important;
                                  line-height: inherit !important;
                                  text-decoration: none !important;
                              }

                              #MessageViewBody a {
                                  color: inherit;
                                  text-decoration: none;
                                  font-size: inherit;
                                  font-family: inherit;
                                  font-weight: inherit;
                                  line-height: inherit;
                              }

                              .btn-primary table td:hover {
                                  background-color: #34495e !important;
                              }

                              .btn-primary a:hover {
                                  background-color: #34495e !important;
                                  border-color: #34495e !important;
                              }
                          }
                      </style>
                  </head>
                  
                  <body style="background-color: #f6f6f6; font-family: sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f6f6f6; width: 100%;" width="100%" bgcolor="#f6f6f6">
                          <tr>
                              <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                              <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; margin: 0 auto;"
                                  width="580" valign="top">
                                  <div class="content" style="box-sizing: border-box; display: block; margin: 0 auto; max-width: 580px; padding: 10px;">

                                      <!-- START CENTERED WHITE CONTAINER -->
                                      <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background: #ffffff; border-radius: 3px; width: 100%;" width="100%">
                                          <tr>
                                              <td style="background-color: #d6d6d6; padding: 4px 0px; width: 100%; text-align: center;">
                                                  <img src="https://i.ibb.co/KxL0Hrj/7.jpg" alt="logo" border="0"
                                                      style="width: 100%; max-width: 120px; height: auto;" width="120">
                                              </td>
                                          </tr>

                                          <!-- START MAIN CONTENT AREA -->
                                          <tr>
                                              <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top">
                                                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;" width="100%">
                                                      <tr>
                                                          <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;"valign="top">
                                                              <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                                                                  Hello Team,</p>
                                                              <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                                                                  Supper D Apps
                                                              </p>
                                                              <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; box-sizing: border-box; width: 100%;" width="100%">
                                                                  <tbody>
                                                                      <tr>
                                                                          <td align="left" style="font-family: sans-serif; font-size: 14px; vertical-align: top; padding-bottom: 15px;"
                                                                              valign="top">
                                                                              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto;">
                                                                                  <tbody>
                                                                                      <tr>
                                                                                          <td style="font-family: sans-serif; font-size: 14px; vertical-align: top; border-radius: 5px; text-align: center; background-color: #3498db;" valign="top" align="center" bgcolor="#3498db"> 
                                                                                              <div style="border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; cursor: pointer; display: inline-block; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 25px; text-decoration: none; text-transform: capitalize; background-color: #3498db; border-color: #3498db; color: #ffffff;">
                                                                                             The server is off
                                                                                              </div>
                                                                                          </td>
                                                                                      </tr>
                                                                                  </tbody>
                                                                              </table>
                                                                          </td>
                                                                      </tr>
                                                                  </tbody>
                                                              </table>
                                                          </td>
                                                      </tr>
                                                  </table>
                                              </td>
                                          </tr>
                                          <!-- END MAIN CONTENT AREA -->
                                      </table>
                                      <!-- END CENTERED WHITE CONTAINER -->
                                      <!-- START FOOTER -->
                                      <div class="footer" style="clear: both; margin-top: 10px; text-align: center; width: 100%;">
                                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;"
                                              width="100%">
                                              <tr>
                                                  <td class="content-block" style="font-family: sans-serif; vertical-align: top; padding-bottom: 10px; padding-top: 10px; color: #999999; font-size: 12px; text-align: center;" valign="top" align="center">
                                                      <p class="apple-link" style="color: #999999; font-size: 16px; text-align: center;">
                                                          Regards,<br>
                                                          dsl.sg Team <br>
                                                          support@dsl.sg
                                                      </p>
                                                  </td>
                                              </tr>
                                          </table>
                                      </div>
                                      <!-- END FOOTER -->

                                  </div>

                              </td>
                              <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                          </tr>
                      </table>
                  </body>
              </html>`

  }



    const response = await axios.head(serverUrl);
    if (response.status === 200) {
      console.log('Server is online');
    } else {
      const sendMail = await axios({
        method: "POST",
        url: "https://api.mailersend.com/v1/email",
        data: data,
        headers: {
            "content-Type": "application/json",
            "authorization": `Bearer ${process.env.MAILER_SEND_TOKEN}`
        }
    })
      console.log(`Server is online but returned status code: ${response.status}`);
    }
  } catch (error) {
    const sendMail = await axios({
      method: "POST",
      url: "https://api.mailersend.com/v1/email",
      data: data,
      headers: {
          "content-Type": "application/json",
          "authorization": `Bearer ${process.env.MAILER_SEND_TOKEN}`
      }
  })
    console.error('Server is offline or unreachable');
    console.error(error.message);
  }
};


// cron.schedule('0 * * * *', () => {
//   console.log('running a task every minute');
//   checkServerStatus();
// });



app.use("/api/v1/arbitrage/user", require("./routes/arbitrageWalletloginRouter"));
app.use("/api/v1/arbitrage", require("./routes/arbitrageRoutes"));
app.use("/api/v1/arbitrage/mempool", require("./routes/arbitrageMemPollRoutes"));
app.use("/api/v1/arbitrage/swap", require("./routes/arbitragetransactionRouter"));

app.use("/api/v1/securearbitrage", require("./routes/SecureArbitrage/PastOppertunitiesRouter"));

app.get("/api", (req, res) => {
  res.send("Server Running...");
});
app.get("/", (req, res) => {
  res.send("Server Running...");
});

app.use("/public", express.static(path.join(__dirname, "public")));

// app.use('/public', express.static(path.join(__dirname, 'public'), {
//   setHeaders: function (res, path, stat) {
//       // console.log("ckuck", path)
//       res.set('Access-Control-Allow-Origin', '*');
//     }
//   }));

app.use("/BufferData", express.static(path.join(__dirname, "BufferData")));
app.use("/.well-known", express.static(path.join(__dirname, ".well-known")));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
