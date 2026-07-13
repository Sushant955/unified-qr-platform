const express = require("express");
const path = require("path");
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

// Simple health check, kept separate from the frontend's root route
app.get("/api/health", (req, res) => {
  res.json({ message: "Unified QR Platform API is running." });
});

// Serve the frontend dashboard (public/index.html, style.css, app.js)
app.use(express.static(path.join(__dirname, "public")));

// Any non-API route falls through to the dashboard (client-side routing safe)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/r/")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 404 handler (only reached for unmatched /api or /r routes)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));l
