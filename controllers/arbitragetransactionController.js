const { ethers } = require('ethers');

// Replace with your blockchain RPC endpoint
const RPC_URL = "https://misty-practical-scion.bsc.quiknode.pro/5a369a9a5b17a5dfc05c43f66c1ccea2befbc0d2";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// USDT contract address and PancakeSwap router address
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; // Example for BSC
const PANCAKESWAP_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // Example for PancakeSwap

// Event signature for Swap event
const SWAP_EVENT_SIGNATURE = ethers.id("Swap(address,uint256,uint256,uint256,uint256,address)");
console.log( 'dataaaaaaaaaaaaaaaaaaaa', SWAP_EVENT_SIGNATURE); // Logs the correct event signature

// Define a filter for the Swap event
const filter = {
    address: USDT_ADDRESS,
    topics: [SWAP_EVENT_SIGNATURE],
};

exports.getUSDTTransactions = async (req, res) => {
    try {
        const fromBlock = 1; // Adjust to the actual starting block you want to fetch logs from
        const toBlock = await provider.getBlockNumber(); // Get the latest block number
        console.log('get block,,,,,,,,,,,,,,, ========================> ', toBlock)
        const blockRange = 500; // Process logs in chunks of 10,000 blocks
        const swaps = [];
        const iface = new ethers.Interface([
            "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)"
        ]);

        // Loop through the block ranges
        for (let start = fromBlock; start <= toBlock; start += blockRange) {
            const end = Math.min(start + blockRange - 1, toBlock); // Ensure we don't exceed the latest block

            console.log('startttttt point ===========> ', start)
            console.log('end ..ddddddddd point ===========> ', end)
            const logs = await provider.getLogs({
                address: PANCAKESWAP_ROUTER, // Corrected filter address
                topics: ['0xd78ad95fa46c994b6551d0da85fc275fe613d25e244afca40c3f161b74e51a20'],
                fromBlock: start,
                toBlock: end,
            });


            console.log('dataaaa log ', logs)
            console.log('dataaaaaaaaaaaaaaaaaaaa', SWAP_EVENT_SIGNATURE); // Logs the correct event signature


            logs.forEach((log) => {
                const parsedLog = iface.parseLog(log);

                console.log('log datata =========> ', parsedLog)

                if (
                    parsedLog.args.amount0In.toString() !== "0" ||
                    parsedLog.args.amount0Out.toString() !== "0"
                ) {
                    swaps.push({
                        sender: parsedLog.args.sender,
                        amountIn: parsedLog.args.amount0In.toString(),
                        amountOut: parsedLog.args.amount0Out.toString(),
                        recipient: parsedLog.args.to,
                    });
                }
            });
        }

        res.json({ success: true, swaps });
    } catch (error) {
        console.error("Error fetching USDT transactions:", error);
        res.status(500).json({ success: false, message: "Error fetching USDT transactions", error });
    }
};


exports.monitorUSDTTransactions = () => {
    provider.on(filter, (log) => {
        const iface = new ethers.Interface([
            "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)"
        ]);

        const parsedLog = iface.parseLog(log);

        console.log("Real-time USDT Swap detected:");
        console.log("Sender:", parsedLog.args.sender);
        console.log("Amount In:", parsedLog.args.amount0In.toString());
        console.log("Amount Out:", parsedLog.args.amount0Out.toString());
        console.log("Recipient:", parsedLog.args.to);
    });
};
