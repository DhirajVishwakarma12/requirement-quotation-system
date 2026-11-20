const mongoose = require("mongoose");
const quotationSchema = new mongoose.Schema(
  {
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
