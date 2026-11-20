const mongoose = require("mongoose");
const { randomBytes } = require("crypto");
const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      required: true,
      unique: true,
      default: () => `QT-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    version: { type: Number, required: true },
    items: [
      { description: String, amount: { type: Number, min: 0, required: true } },
    ],
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    notes: String,
    sentAt: Date,
    sentTo: [String],
  },
  { timestamps: true },
);
module.exports = mongoose.model("Quotation", quotationSchema);
