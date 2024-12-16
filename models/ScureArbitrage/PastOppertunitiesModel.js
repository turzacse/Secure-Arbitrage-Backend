const mongoose = require("mongoose");

const PastOpportunitiesSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: /^[0-3][0-9]-[0-1][0-9]-\d{4} [0-2][0-9]:[0-5][0-9]:[0-5][0-9]$/, //  DD-MM-YYYY HR:MM:SS format
      trim: true, 
    },
    digitalAsset: {
      type: String,
      required: true, 
      trim: true, 
    },
    profit: {
      type: Number,
      required: true, 
      min: 0, 
      validate: {
        validator: (value) => /^\d+(\.\d{1,6})?$/.test(value.toString()), // Validates up to 6 decimal places
        message: "Profit must have up to 6 decimal places",
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

const PastOpportunitiesModel = mongoose.model("PastOpportunitiesModel", PastOpportunitiesSchema);

module.exports = PastOpportunitiesModel;
