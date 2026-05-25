import express from "express";
import cors from "cors";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Enhanced Logger with Timestamps
const formatLog = (msg, ...args) => {
  const timestamp = new Date().toLocaleString('en-GB', { hour12: false });
  return [`[${timestamp}] ${msg}`, ...args];
};

const originalLog = console.log;
const originalError = console.error;

console.log = (msg, ...args) => originalLog(...formatLog(msg, ...args));
console.error = (msg, ...args) => originalError(...formatLog(msg, ...args));

// Suppress redundant env injection logs during init
const tempLog = console.log;
console.log = () => {};
dotenv.config();
console.log = tempLog;

// Route imports
import authRoutes from "./routes/auth.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import paymentRoutes from "./routes/payments.js";
import providerRoutes from "./routes/providers.js";
import staffRoutes from "./routes/staff.js";
import inventoryRoutes from "./routes/inventory.js";
import salesRoutes from "./routes/sales.js";
import expenseRoutes from "./routes/expenses.js";
import customerRoutes from "./routes/customers.js";
import adminRoutes from "./routes/admin.js";
import serviceRoutes from "./routes/services.js";
import requestRoutes from "./routes/requests.js";
import platformRoutes from "./routes/platform.js";
import { startSubscriptionDaemon } from "./daemon/subscriptions.js";
import { db } from "./dbms/mysql.js";
import { initStorage } from "./utils/storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const params = JSON.parse(fs.readFileSync(path.join(__dirname, "configs/params.json"), "utf8"));

const app = express();
const PORT = params.port || 3000;

// Trust reverse proxy (Nginx, Load Balancers, etc) to capture real client IP
app.set('trust proxy', true);

// Start background tasks
startSubscriptionDaemon();

// Middleware
app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

import fileUpload from 'express-fileupload';
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set COOP header for Google Auth popups
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/providers", providerRoutes);
app.use("/api/v1/staff", staffRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/sales", salesRoutes);
app.use("/api/v1/expenses", expenseRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/services", serviceRoutes);
app.use("/api/v1/requests", requestRoutes);
app.use("/api/v1/platform", platformRoutes);

// Home route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "hlynk API is running.",
  });
});

// 404 Route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Start server with DB check
const startServer = async () => {
  try {
    // 1. Check Database Connection
    await db.query("SELECT 1");
    console.log("✅ Database: Connected Successfully");

    // 2. Run Critical Migrations (Nuclear Option)
    try {
      const [cols] = await db.query('DESCRIBE platformreview');
      if (!cols.some(c => c.Field === 'status')) {
        await db.query('ALTER TABLE platformreview ADD COLUMN status INT DEFAULT 0 AFTER ownerName');
      }
    } catch (e) {
      console.warn("⚠️ Migration Warning:", e.message);
    }

    // 3. Initialize MinIO Storage
    await initStorage();

    // 4. Start Listener
    app.listen(PORT, () => {
      console.log(`🚀 hlynk Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("🔴 Database: Connection Failed!");
    // console.error("💥 Fuck!", err.message);
    console.error(err.message);
    process.exit(1);
  }
};

startServer();