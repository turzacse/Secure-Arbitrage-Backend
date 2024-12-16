const web3 = require('../utils/web3Config');
const routerABI = require('../utils/routerABI');
require('dotenv').config();

// Router addresses of the different DEXes
const routerAddresses = {
  PancakeSwap: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  BabySwap: '0x325E343f1dE602396E256B67eFd1F61C3A6B38Bd',
  ApeSwap: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
  BiSwap: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
};


// Function to fetch price from a specific DEX router
const fetchPriceFromRouter = async (amountIn, tokenIn, tokenOut, routerName, routerAddress) => {
  try {
    const routerContract = new web3.eth.Contract(routerABI, routerAddress);
    const amounts = await routerContract.methods
      .getAmountsOut(amountIn, [tokenIn, tokenOut])
      .call();
    const price = web3.utils.fromWei(amounts[1], 'ether');
    return { routerName, price: price }; // Adjust the price to the desired format
  } catch (error) {
    console.error(`Error fetching price from ${routerName}:`, error);
    return { routerName, price: null }; // Return null if error occurs
  }
};

// Function to fetch prices from all DEX routers
const fetchPrices = async (amountIn, tokenIn, tokenOut) => {
  const promises = Object.entries(routerAddresses).map(([routerName, routerAddress]) =>
    fetchPriceFromRouter(amountIn, tokenIn, tokenOut, routerName, routerAddress)
  );

  const results = await Promise.all(promises);

  // Filter out routers where price was not fetched successfully
  const availablePrices = results.filter(({ price }) => price !== null);
  const unavailablePrices = results.filter(({ price }) => price === null);

  return { availablePrices, unavailablePrices };
};

// Function to handle API request for fetching prices
exports.fetchPrice = async (req, res) => {
  const {
    amount,  // Default is 1 token (with 18 decimals)
    tokenIn, // converted token address
    tokenOut='0x55d398326f99059fF775485246999027B3197955', // USDT
    
  } = req.body;

  const Fixedamount = 1000000000000000000;
  let amountIn = (Fixedamount * amount).toString(); // Convert to string after calculation

  try {
    const { availablePrices, unavailablePrices } = await fetchPrices(amountIn, tokenIn, tokenOut);

    res.status(200).json({
      success: true,
      prices: availablePrices,
      unavailable: unavailablePrices.map(({ routerName }) => routerName),
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch prices', error });
  }
};

