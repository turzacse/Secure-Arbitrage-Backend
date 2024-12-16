const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        walletAddress: {
            type: String,
        },
        email: {
            type: String,
        },
        subscriptionStart: {
            type: String,
        },
        subscriptionEnd: {
            type: String
        },
        botStart: {
            type: String,
        },
        botEnd: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const model = mongoose.model("UseArbitrage", userSchema);
module.exports = model;
