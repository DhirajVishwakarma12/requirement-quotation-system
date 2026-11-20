const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    emailVerified: { type: Boolean, default: true },
    otpHash: { type: String, select: false },
    otpPurpose: { type: String, enum: ["verify-email", "login"], select: false },
    otpExpiresAt: { type: Date, select: false },
    otpSentAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpChallengeHash: { type: String, select: false },
    role: {
      type: String,
      enum: ["client", "admin", "developer"],
      default: "client",
    },
  },
  { timestamps: true },
);
module.exports = mongoose.model("User", userSchema);
