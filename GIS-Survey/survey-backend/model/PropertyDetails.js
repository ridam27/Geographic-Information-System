const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
{
  ownerName: String,
  occupierName: String,
  address: String,
  mobile: String,
  ward: String,
  zone: String,
  newPropertyNo: String,
  oldPropertyNo: String,

  usageType: String,
  constructionType: String,
  constructionYear: Number,
  area: Number,
  rate: Number,

  taxableValue: Number,
  deduction: Number,
  finalTaxableValue: Number,

  propertyTax: Number,
  educationTax: Number,
  treeTax: Number,
  fireTax: Number,
  totalTax: Number
},
{ timestamps: true }
);

module.exports = mongoose.model("PropertyDetails", propertySchema);