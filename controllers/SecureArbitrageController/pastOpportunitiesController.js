const axios = require("axios");
const PastOpportunitiesModel = require("../../models/ScureArbitrage/PastOppertunitiesModel");
let fetchedData = []; 
const MAX_ENTRIES = 8640; 

const formatDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0'); 
    const month = String(now.getMonth() + 1).padStart(2, '0'); 
    const year = now.getFullYear(); 
    const hours = String(now.getHours()).padStart(2, '0'); 
    const minutes = String(now.getMinutes()).padStart(2, '0'); 
    const seconds = String(now.getSeconds()).padStart(2, '0'); 
  
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  };

const fetchDataOnce = async () => {
  try {
    const response = await axios.get("https://backend.dsl.sg/tokens-coin");

    fetchedData = response.data;
    // console.log('Response from getting ====>>>', response);

    if (fetchedData.length > 0) {
      console.log("Data fetched successfully from API!");
    } else {
      // console.log("No data found in the API response!");
    }
  } catch (error) {
    if (error.response) {
      // console.error(`Error fetching data from API: ${error.response.status} - ${error.response.statusText}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
};

const generateLoanAmount = () => {
  const isMaxTime = Math.random() < 0.5; // 50% chance for max or min time range

  if (isMaxTime) {
    // Max time: Between 100 and 1000
    return parseFloat((Math.random() * (1000 - 100) + 100).toFixed(6));
  } else {
    // Min time: Between 1000 and 1,000,000
    return parseFloat((Math.random() * (1000000 - 1000) + 1000).toFixed(6));
  }
};

const calculateProfit = async (price) => {
    // const services = [0.0007, 0.0010, 0.0030, 0.0020];
    const services = [0.0080, 0.0080, 0.0080, 0.0080];
    let exFeeA, exFeeB, loanAmount, reducedPrice, increasePrice;
  
    // Random loan amount between 100 and 1,000,000 with 6 decimals
    // loanAmount = parseFloat((Math.random() * (1000000 - 100) + 100).toFixed(6));
    loanAmount = generateLoanAmount();
  
    const numericPrice = parseFloat(price);
    reducedPrice = parseFloat((numericPrice - numericPrice * 0.02).toFixed(6)); // Reduced by 2%
    increasePrice = parseFloat((numericPrice + numericPrice * 0.02).toFixed(6)); // Increased by 2%
  
    // Randomly select two different service fees
    if (services.length > 1) {
      const firstIndex = Math.floor(Math.random() * services.length);
      let secondIndex;
      do {
        secondIndex = Math.floor(Math.random() * services.length);
      } while (secondIndex === firstIndex);
  
      exFeeA = services[firstIndex];
      exFeeB = services[secondIndex];
    }
  
    // Perform calculations
    const balanceA = parseFloat((loanAmount - exFeeA).toFixed(6));
    const DAB = parseFloat((balanceA / reducedPrice).toFixed(6)); 
    const balanceB = parseFloat((DAB - exFeeB).toFixed(6));
    const UR = parseFloat((balanceB * increasePrice).toFixed(6)); 
  
    const TEF = parseFloat((exFeeA + exFeeB * increasePrice).toFixed(6)); 
    const TGF = 0.105022 + 0.105022; 
    let LF;
    if (loanAmount > 1000) {
      LF = loanAmount;
    } else {
      LF = parseFloat((loanAmount * 1.005).toFixed(6)); 
    }
    const BSF = 1.0;
  
    
    const TotalExpenses = parseFloat((TEF + TGF + LF + BSF).toFixed(6));
  
    // Calculate profit
    const profit = parseFloat((UR - TotalExpenses).toFixed(6));
    return profit; 
  };

  const maintainDataLimit = async () => {
    try {
      const count = await PastOpportunitiesModel.countDocuments(); // Get total count of entries
  
      if (count > MAX_ENTRIES) {
        const excessCount = count - MAX_ENTRIES;
  
        // Find and delete the oldest entries
        const oldestEntries = await PastOpportunitiesModel.find()
          .sort({ _id: 1 }) // Sort by oldest (ascending order by _id)
          .limit(excessCount);
  
        const idsToDelete = oldestEntries.map((entry) => entry._id);
        await PastOpportunitiesModel.deleteMany({ _id: { $in: idsToDelete } });
  
        console.log(`${excessCount} old entries deleted successfully!`);
      }
    } catch (error) {
      console.error("Error maintaining data limit:", error.message);
    }
  };
  
const postRandomData = async () => {
  // const cachedTokens = tokenCache.get("topDexTokens");
  // console.log('Data is ===>>>', cachedTokens);
  try {
    if (fetchedData.length === 0) {
      console.log("No data available to post. Fetch data first.");
      return;
    }
    const randomIndex = Math.floor(Math.random() * fetchedData.length);
    const randomEntry = fetchedData[randomIndex];

    const price = parseFloat(randomEntry.price || 0);

    const estimatedProfit = await calculateProfit(price);

    const newEntry = new PastOpportunitiesModel({
      date: formatDate(), // Current timestamp in "DD-MM-YYYY HR:MM:SS" format
      digitalAsset: randomEntry.symbol ,
      profit: estimatedProfit,
    });

    await newEntry.save();
    await maintainDataLimit();

    console.log("Random data posted successfully!", randomEntry);
  } catch (error) {
    console.error("Error posting random data:", error.message);
  }
};

// Function to retrieve all stored data
const getAllData = async (req, res) => {
  try {
    const data = await PastOpportunitiesModel.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const deleteAllData = async (req, res) => {
  try {
    const result = await PastOpportunitiesModel.deleteMany(); // Deletes all documents
    res.status(200).json({
      message: "All data has been successfully deleted!",
      deletedCount: result.deletedCount, // Returns the number of deleted documents
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Fetch data once on initialization
// fetchDataOnce();
setInterval(fetchDataOnce, 2000);

// Start posting random data every 10 seconds
setInterval(postRandomData, 10000);

module.exports = {
  getAllData,
  deleteAllData
};