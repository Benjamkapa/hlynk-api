import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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
import etimsRoutes from "./routes/etims.js";
import { startSubscriptionDaemon } from "./daemon/subscriptions.js";
import { startEtimsDaemon } from "./daemon/etims.js";
import { db } from "./dbms/mysql.js";
import { initStorage, minioClient } from "./utils/storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const params = JSON.parse(fs.readFileSync(path.join(__dirname, "configs/params.json"), "utf8"));

const app = express();
const PORT = params.port || 3000;

// Trust reverse proxy (Nginx, Load Balancers, etc) to capture real client IP
app.set('trust proxy', true);

// Start background tasks
startSubscriptionDaemon();
startEtimsDaemon();

// Middleware
app.use(cors({
  origin: true,           // reflects the request origin (safe because we authenticate via JWT, not cookies alone)
  credentials: true,      // allow Set-Cookie headers to be sent/received
}));

app.use(cookieParser());
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
app.use("/api/v1/etims",    etimsRoutes);

// Secure Storage Proxy (Fixes Mixed Content errors)
app.get("/api/v1/storage/:bucket/:folder/:file", async (req, res) => {
  try {
    const { bucket, folder, file } = req.params;
    const objectName = `${folder}/${file}`;
    
    // Set Content-Type based on extension
    const ext = file.split('.').pop().toLowerCase();
    const mimeTypes = { 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp' };
    if (mimeTypes[ext]) res.setHeader('Content-Type', mimeTypes[ext]);
    
    const stream = await minioClient.getObject(bucket, objectName);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    stream.pipe(res);
  } catch (err) {
    console.error(`❌ Storage Proxy Error [${req.params.folder}/${req.params.file}]:`, err.message);
    res.status(404).end();
  }
});

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

    // 2. Run Critical Migrations
    try {
      const [cols] = await db.query('DESCRIBE platformreview');
      if (!cols.some(c => c.Field === 'status')) {
        await db.query('ALTER TABLE platformreview ADD COLUMN status INT DEFAULT 0 AFTER ownerName');
      }
    } catch (e) {
      console.warn("⚠️ Migration Warning:", e.message);
    }

    // 3a. eTIMS Tables (idempotent)
    try {
      await db.query(`CREATE TABLE IF NOT EXISTS etims_credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        kra_pin VARCHAR(20) NOT NULL,
        branch_id VARCHAR(50) DEFAULT '00',
        device_serial_number VARCHAR(100) NOT NULL,
        certificate_b64 MEDIUMTEXT,
        cert_password VARCHAR(255),
        cmc_key TEXT,
        env VARCHAR(20) DEFAULT 'sandbox',
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_etims_provider (provider_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

      await db.query(`CREATE TABLE IF NOT EXISTS etims_invoices (
        id VARCHAR(26) PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        payment_id VARCHAR(255) NOT NULL,
        invoice_number INT DEFAULT NULL,
        kra_receipt_number VARCHAR(100),
        qr_code_url TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        error_message TEXT,
        retry_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_etims_inv_provider (provider_id),
        INDEX idx_etims_inv_payment (payment_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

      // Add invoice_number column if missing (upgrade from old schema)
      const [etimsCols] = await db.query('DESCRIBE etims_invoices').catch(() => [[]]);
      if (etimsCols.length && !etimsCols.some(c => c.Field === 'invoice_number')) {
        await db.query('ALTER TABLE etims_invoices ADD COLUMN invoice_number INT DEFAULT NULL AFTER payment_id');
      }
      // Upgrade etims_credentials if columns are missing
      const [credCols] = await db.query('DESCRIBE etims_credentials').catch(() => [[]]);
      
      // Ensure cert_password exists
      if (credCols.length && !credCols.some(c => c.Field === 'cert_password')) {
        await db.query("ALTER TABLE etims_credentials ADD COLUMN cert_password VARCHAR(255) AFTER kra_pin");
      }
      
      // Ensure cmc_key exists
      if (credCols.length && !credCols.some(c => c.Field === 'cmc_key')) {
        await db.query("ALTER TABLE etims_credentials ADD COLUMN cmc_key TEXT AFTER kra_pin"); 
      }

      // Ensure env exists
      if (credCols.length && !credCols.some(c => c.Field === 'env')) {
        await db.query("ALTER TABLE etims_credentials ADD COLUMN env VARCHAR(20) DEFAULT 'sandbox' AFTER kra_pin");
      }

      // 3. Ensure retry_count exists in invoices
      const [invCols] = await db.query('DESCRIBE etims_invoices').catch(() => [[]]);
      if (invCols.length && !invCols.some(c => c.Field === 'retry_count')) {
        await db.query("ALTER TABLE etims_invoices ADD COLUMN retry_count INT DEFAULT 0 AFTER error_message");
      }

      console.log('💰 eTIMS: Tables ready.');
    } catch (e) {
      console.warn('⚠️ eTIMS Migration Warning:', e.message);
    }

    // 3. Initialize Local Storage
    await initStorage();

    // 4. Start Listener
    app.listen(PORT, () => {
      console.log(`🚀 hlynk Server running on http://localhost:${PORT}`);
      if (process.send) {
        process.send('ready');
      }
    });
  } catch (err) {
    console.error("🔴 Database: Connection Failed!");
    console.error(err.message);
    process.exit(1);
  }
};


// Global Error Listeners for silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔴 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🔴 Uncaught Exception:', err);
  process.exit(1);
});

startServer();
