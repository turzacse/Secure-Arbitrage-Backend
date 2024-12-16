const { Web3 } = require('web3');
require('dotenv').config();

const web3 = new Web3(process.env.QUICKNODE_URL);

module.exports = web3;
