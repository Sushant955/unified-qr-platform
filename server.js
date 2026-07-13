const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" })); // higher limit to allow base64 logo uploads

// API routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/user"));
app.use("/api/qr", require("./routes/qr"));

// Public short-link redirect route (what scanned dynamic QR codes hit)
app.use("/r", require("./routes/redirect"));

app.get("/", (req, res) => {
  res.json({ message: "Unified QR Platform API is running." });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
