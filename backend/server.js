require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const app = express();

const allowedOrigins = [
  "https://requirement-quotation-system-knurx87kd-paradox16.vercel.app",
  "http://localhost:5173",
  "https://requirement-quotation-system.vercel.app",

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error("CORS blocked: " + origin));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.get("/", (req, res) =>
  res.json({ message: "Requirement & Quotation API is running" }),
);
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});
const PORT = process.env.PORT || 5000;
connectDB()
  .then(() =>
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`)),
  )
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });
