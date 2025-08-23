require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rfs = require("rotating-file-stream"); // for log rotation
const fs = require("fs");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const workerRoutes = require("./routes/workerRoutes");
const { PrismaClient } = require("@prisma/client");
const cookieParser = require("cookie-parser");

const app = express();

// ─────────────────────────────────────────────────────────────
// 🔧 Create logs directory if not exists
const logDirectory = path.join(__dirname, "logs");
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// 🌀 Setup rotating log stream: daily rotation + compression
const accessLogStream = rfs.createStream("access.log", {
  interval: "1d", // rotate daily
  path: logDirectory,
  compress: "gzip", // compress old logs
  maxFiles: 90, // keep only last 90 logs (optional)
});

// Use morgan with file stream and console output
app.use(morgan("dev")); // to console
app.use(morgan("combined", { stream: accessLogStream })); // to file
// ─────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: "http://localhost:8081", // your frontend origin
    credentials: true, // important for cookies
  })
);
app.use(express.json());
app.use(cookieParser()); // Add this line

const prisma = new PrismaClient();
prisma
  .$connect()
  .then(() => {
    console.log("✅ Database connected");
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err);
  });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/worker", workerRoutes);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
