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
// const tempLog = console.log;
// console.log = () => {};
// dotenv.config();
// console.log = tempLog;

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
import notificationRoutes from "./routes/notifications.js";
import resourceRoutes from "./routes/resources.js";
import eventRoutes from "./routes/events.js";
import operationRoutes from "./routes/operations.js";
import publicRoutes from "./routes/public.js";
import { startSubscriptionDaemon } from "./daemon/subscriptions.js";
import { startEtimsDaemon } from "./daemon/etims.js";
import { startPayoutDaemon } from "./daemon/payouts.js";
import { db } from "./dbms/mysql.js";
import { initStorage, minioClient } from "./utils/storage.js";
import { fixResourceImages } from "./scripts/fix_resource_images.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const params = JSON.parse(fs.readFileSync(path.join(__dirname, "configs/params.json"), "utf8"));

const app = express();
const PORT = params.port || 3000;

// Trust reverse proxy (Nginx, Load Balancers, etc) to capture real client IP
app.set('trust proxy', true);

// Start background tasks
startSubscriptionDaemon();
startEtimsDaemon();
startPayoutDaemon();

// Middleware
app.use(cors({
  origin: true,           // reflects the request origin (safe because we authenticate via JWT, not cookies alone)
  credentials: true,      // allow Set-Cookie headers to be sent or received
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
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/resources", resourceRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/operations", operationRoutes);
app.use("/api/v1/public", publicRoutes);

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

      const [userCols] = await db.query('DESCRIBE user');
      if (!userCols.some(c => c.Field === 'eulaAcceptedAt')) {
        await db.query('ALTER TABLE user ADD COLUMN eulaAcceptedAt DATETIME DEFAULT NULL AFTER photoUrl');
      }

      // Referral & Payout columns on tenant
      const [tenantCols] = await db.query('DESCRIBE tenant');
      const tenantColNames = tenantCols.map(c => c.Field);
      if (!tenantColNames.includes('referralCode')) {
        console.log('Adding referralCode to tenant...');
        await db.query('ALTER TABLE tenant ADD COLUMN referralCode VARCHAR(20) UNIQUE AFTER slug');
      }
      if (!tenantColNames.includes('referredById')) {
        console.log('Adding referredById to tenant...');
        await db.query('ALTER TABLE tenant ADD COLUMN referredById VARCHAR(50) AFTER referralCode');
      }
      if (!tenantColNames.includes('payoutMethod')) {
        await db.query('ALTER TABLE tenant ADD COLUMN payoutMethod VARCHAR(50) DEFAULT "MPESA" AFTER isActive');
      }
      if (!tenantColNames.includes('payoutAccount')) {
        await db.query('ALTER TABLE tenant ADD COLUMN payoutAccount VARCHAR(50) AFTER payoutMethod');
      }

      // Payout tracking columns on payment table
      const [paymentCols] = await db.query('DESCRIBE payment');
      const paymentColNames = paymentCols.map(c => c.Field);
      if (!paymentColNames.includes('payoutStatus')) {
        await db.query('ALTER TABLE payment ADD COLUMN payoutStatus INT DEFAULT 0 AFTER status');
      }
      if (!paymentColNames.includes('isRented')) {
        await db.query('ALTER TABLE payment ADD COLUMN isRented TINYINT DEFAULT 0 AFTER payoutStatus');
      }
      if (!paymentColNames.includes('meta')) {
        await db.query('ALTER TABLE payment ADD COLUMN meta JSON DEFAULT NULL');
      }

      // Universal Engine migrations for Tenant, Payment, Expense
      if (!tenantColNames.includes('businessType')) {
        await db.query('ALTER TABLE tenant ADD COLUMN businessType VARCHAR(50) DEFAULT "RETAIL"');
      }
      if (!tenantColNames.includes('activeModules')) {
        await db.query('ALTER TABLE tenant ADD COLUMN activeModules JSON DEFAULT NULL');
      }

      // Auto-assign slugs to any existing tenants missing a slug
      const [tenantsWithoutSlug] = await db.query("SELECT id, businessName FROM tenant WHERE slug IS NULL OR slug = ''");
      for (const t of tenantsWithoutSlug) {
        const baseSlug = (t.businessName || 'stay').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'stay';
        let newSlug = baseSlug;
        let [existing] = await db.query("SELECT id FROM tenant WHERE slug = ? AND id != ?", [newSlug, t.id]);
        let counter = 1;
        while (existing.length > 0) {
          newSlug = `${baseSlug}-${counter++}`;
          [existing] = await db.query("SELECT id FROM tenant WHERE slug = ? AND id != ?", [newSlug, t.id]);
        }
        await db.query("UPDATE tenant SET slug = ? WHERE id = ?", [newSlug, t.id]);
        console.log(`✅ Assigned slug '${newSlug}' to tenant '${t.businessName}'`);
      }

      if (!paymentColNames.includes('referenceType')) {
        await db.query('ALTER TABLE payment ADD COLUMN referenceType VARCHAR(50) DEFAULT "SALE" AFTER status');
      }
      if (!paymentColNames.includes('referenceId')) {
        await db.query('ALTER TABLE payment ADD COLUMN referenceId VARCHAR(50) AFTER referenceType');
      }

      const [expenseCols] = await db.query('DESCRIBE expense').catch(() => [[]]);
      const expenseColNames = expenseCols.map(c => c.Field);
      if (expenseColNames.length && !expenseColNames.includes('resourceId')) {
        await db.query('ALTER TABLE expense ADD COLUMN resourceId VARCHAR(50) AFTER description');
      }
      if (expenseColNames.length && !expenseColNames.includes('eventId')) {
        await db.query('ALTER TABLE expense ADD COLUMN eventId VARCHAR(50) AFTER resourceId');
      }

      // Universal Tables: resource, event, operation
      await db.query(`CREATE TABLE IF NOT EXISTS resource (
        id VARCHAR(50) PRIMARY KEY,
        tenantId VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        code VARCHAR(100),
        parentId VARCHAR(50),
        basePrice DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'AVAILABLE',
        meta JSON DEFAULT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenantId) REFERENCES tenant(id) ON DELETE CASCADE,
        INDEX idx_resource_tenant_type (tenantId, type),
        INDEX idx_resource_tenant_title (tenantId, title),
        INDEX idx_resource_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

      await db.query(`CREATE TABLE IF NOT EXISTS event (
        id VARCHAR(50) PRIMARY KEY,
        tenantId VARCHAR(50) NOT NULL,
        resourceId VARCHAR(50) NOT NULL,
        customerId VARCHAR(50),
        eventType VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'CONFIRMED',
        startTime DATETIME,
        endTime DATETIME,
        totalAmount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        paidAmount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        meta JSON DEFAULT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenantId) REFERENCES tenant(id) ON DELETE CASCADE,
        FOREIGN KEY (resourceId) REFERENCES resource(id) ON DELETE CASCADE,
        INDEX idx_event_tenant_type (tenantId, eventType),
        INDEX idx_event_dates (startTime, endTime),
        INDEX idx_event_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

      await db.query(`CREATE TABLE IF NOT EXISTS operation (
        id VARCHAR(50) PRIMARY KEY,
        tenantId VARCHAR(50) NOT NULL,
        resourceId VARCHAR(50) NOT NULL,
        opType VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        assignedToUserId VARCHAR(50),
        estimatedCost DECIMAL(15, 2) DEFAULT 0.00,
        actualCost DECIMAL(15, 2) DEFAULT 0.00,
        expenseId VARCHAR(50),
        meta JSON DEFAULT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenantId) REFERENCES tenant(id) ON DELETE CASCADE,
        FOREIGN KEY (resourceId) REFERENCES resource(id) ON DELETE CASCADE,
        INDEX idx_op_tenant_type (tenantId, opType)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

      // Remove UNIQUE restriction on user.phone & provider.phone to allow multiple signups with the same phone number
      try {
        const [indexes] = await db.query("SHOW INDEX FROM user WHERE Column_name = 'phone' AND Non_unique = 0");
        for (const idx of indexes) {
          if (idx.Key_name !== 'PRIMARY') {
            await db.query(`ALTER TABLE user DROP INDEX \`${idx.Key_name}\``);
            console.log(`✅ Removed unique index '${idx.Key_name}' on user(phone)`);
          }
        }
      } catch (e) {
        // Ignore if index does not exist or fails
      }

      try {
        const [provIndexes] = await db.query("SHOW INDEX FROM provider WHERE Column_name = 'phone' AND Non_unique = 0");
        for (const idx of provIndexes) {
          if (idx.Key_name !== 'PRIMARY') {
            await db.query(`ALTER TABLE provider DROP INDEX \`${idx.Key_name}\``);
            console.log(`✅ Removed unique index '${idx.Key_name}' on provider(phone)`);
          }
        }
      } catch (e) {
        // Ignore if index does not exist or fails
      }

      // Payout table
      await db.query(`CREATE TABLE IF NOT EXISTS payout (
        id VARCHAR(50) PRIMARY KEY,
        tenantId VARCHAR(50) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        type VARCHAR(20) NOT NULL,
        refereeId VARCHAR(50),
        sourceId VARCHAR(50),
        message TEXT,
        processedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenantId) REFERENCES tenant(id) ON DELETE CASCADE
      )`);

      // Request / Incoming Public Orders Table
      await db.query(`CREATE TABLE IF NOT EXISTS request (
        id VARCHAR(50) PRIMARY KEY,
        tenantId VARCHAR(50) NOT NULL,
        customerId VARCHAR(50),
        providerId VARCHAR(50),
        serviceId VARCHAR(50),
        customerName VARCHAR(255) NOT NULL,
        customerPhone VARCHAR(50) NOT NULL,
        message TEXT,
        status VARCHAR(50) DEFAULT 'PENDING',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenantId) REFERENCES tenant(id) ON DELETE CASCADE,
        INDEX idx_req_tenant (tenantId),
        INDEX idx_req_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

      await db.query("ALTER TABLE request MODIFY customerId VARCHAR(50) NULL DEFAULT NULL;").catch(() => {});
      await db.query("ALTER TABLE request MODIFY providerId VARCHAR(50) NULL DEFAULT NULL;").catch(() => {});
      await db.query("ALTER TABLE request MODIFY serviceId VARCHAR(50) NULL DEFAULT NULL;").catch(() => {});
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

      // 4. KCB Logs Table
      await db.query(`CREATE TABLE IF NOT EXISTS kcblog (
        id VARCHAR(26) PRIMARY KEY,
        merchantRequestId VARCHAR(255),
        checkoutRequestId VARCHAR(255),
        phone VARCHAR(20),
        amount DECIMAL(15,2),
        reference VARCHAR(255),
        customerName VARCHAR(255),
        initiatorName VARCHAR(255),
        tenantName VARCHAR(255),
        tenantId VARCHAR(26),
        status INT DEFAULT 2, -- 0:Success, 1:Failed, 2:Pending, 3:Cancelled, 4:Error
        resultCode VARCHAR(50),
        resultDesc TEXT,
        rawPayload MEDIUMTEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_kcb_checkout (checkoutRequestId),
        INDEX idx_kcb_tenant (tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

      const [kcbCols] = await db.query('DESCRIBE kcblog').catch(() => [[]]);
      if (kcbCols.length && !kcbCols.some(c => c.Field === 'updatedAt')) {
        await db.query("ALTER TABLE kcblog ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER createdAt");
      }

      // console.log('💰 eTIMS & KCB: Tables ready.');

      // B2C Disbursement Log Table
      await db.query(`CREATE TABLE IF NOT EXISTS b2clog (
        id VARCHAR(26) PRIMARY KEY,
        conversationId VARCHAR(255),
        originatorConversationId VARCHAR(255),
        phone VARCHAR(20),
        amount DECIMAL(15,2),
        payoutId VARCHAR(50),
        tenantId VARCHAR(50),
        remarks TEXT,
        status INT DEFAULT 2, -- 0:Success, 1:Failed, 2:Pending, 3:Timeout
        resultCode INT,
        resultDesc TEXT,
        transactionId VARCHAR(100),
        transactionReceipt VARCHAR(100),
        rawRequest MEDIUMTEXT,
        rawResponse MEDIUMTEXT,
        rawCallback MEDIUMTEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_b2c_conv (conversationId),
        INDEX idx_b2c_payout (payoutId),
        INDEX idx_b2c_tenant (tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      // console.log('💸 B2C: Log table ready.');

      // 5. Push Subscriptions Table
      await db.query(`CREATE TABLE IF NOT EXISTS push_subscriptions (
        id VARCHAR(50) PRIMARY KEY,
        userId VARCHAR(50),
        tenantId VARCHAR(50),
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_push_user (userId),
        INDEX idx_push_tenant (tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    } catch (e) {
      console.warn('⚠️ Migration Warning:', e.message);
    }

    // 3. Initialize Local Storage & Fix Resource Images
    await initStorage();
    await fixResourceImages();

    // 4. Start Listener
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
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
