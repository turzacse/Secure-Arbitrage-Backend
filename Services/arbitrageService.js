const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.QUICKNODE_URL));

// Example DEX factory addresses and ABIs
const DEX_FACTORIES = {
    Pancakeswap: {
        address: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
        abi: [/* Factory ABI */],
    },
    Biswap: {
        address: "0x858E3312ed3A876947EA49d572A7C42DE08af7EE",
        abi: [/* Factory ABI */],
    },
};

// Example tokens
const TOKENS = {
    BNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
};

// Helper function: Get pair address
async function getPair(factory, tokenA, tokenB) {
    const contract = new web3.eth.Contract(factory.abi, factory.address);
    return await contract.methods.getPair(tokenA, tokenB).call();
}

// Helper function: Get price from pair
async function getPrice(pairAddress, tokenA) {
    const pairAbi = [/* Pair contract ABI */];
    const pairContract = new web3.eth.Contract(pairAbi, pairAddress);

    const reserves = await pairContract.methods.getReserves().call();
    const token0 = await pairContract.methods.token0().call();

    return tokenA.toLowerCase() === token0.toLowerCase()
        ? reserves[0] / reserves[1]
        : reserves[1] / reserves[0];
}

// Main function: Find arbitrage opportunities
exports.findArbitrageOpportunities = async () => {
    const opportunities = [];

    // Define DEX combinations
    const combinations = [
        ["Pancakeswap", "Biswap"],
        // Add other combinations
    ];

    for (const [dex1, dex2] of combinations) {
        const factory1 = DEX_FACTORIES[dex1];
        const factory2 = DEX_FACTORIES[dex2];

        const pair1 = await getPair(factory1, TOKENS.BNB, TOKENS.USDT);
        const pair2 = await getPair(factory2, TOKENS.BNB, TOKENS.USDT);

        const price1 = await getPrice(pair1, TOKENS.BNB);
        const price2 = await getPrice(pair2, TOKENS.BNB);

        const profitPercentage = Math.abs((price1 - price2) / price2) * 100;

        if (profitPercentage > 0.5) {
            opportunities.push({
                dex1,
                dex2,
                price1,
                price2,
                profitPercentage,
            });
        }
    }

    return opportunities;
};




// const { Web3 } = require('web3');
// const web3 = new Web3('https://hidden-proud-cloud.bsc.quiknode.pro/');

// const routerAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E'; // Router address of the DEX
// const BabySwap= '0x325E343f1dE602396E256B67eFd1F61C3A6B38Bd';
// const BiSwap=  '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8';
// const ApeSwap=  '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7';
// const routerABI = require('./getAmountOutABI');


// const routerContract = new web3.eth.Contract(routerABI, BabySwap);

// const fetchPrice = async (amountIn, tokenIn, tokenOut) => {
//   try {
//     const amounts = await routerContract.methods
//       .getAmountsOut(amountIn, [tokenIn, tokenOut])
//       .call();
//       const price=web3.utils.fromWei(amounts[1], 'ether');
       
//     return (price * 1000000000000000000);
//   } catch (error) {
//     console.error('Error fetching price:', error);
//   }
// };

// fetchPrice('1', '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', '0x55d398326f99059fF775485246999027B3197955')
  
//   .then(console.log)
//   .catch(console.error);