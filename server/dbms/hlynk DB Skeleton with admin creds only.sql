SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `hlynk00`;

USE `hlynk00`;

DROP TABLE IF EXISTS `activationcode`;

CREATE TABLE `activationcode` (
  `id` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `planName` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `durationDays` int NOT NULL,
  `assignedPhone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maxUses` int DEFAULT '1',
  `usedCount` int DEFAULT '0',
  `createdBy` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `expiresAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `activitylog`;

CREATE TABLE `activitylog` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ipAddress` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actionId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_userId` (`userId`),
  KEY `idx_tenant_createdAt` (`tenantId`,`createdAt` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `activitylog` (`id`, `tenantId`, `userId`, `action`, `logName`, `details`, `ipAddress`, `actionId`, `createdAt`) VALUES 
('01M4DABCKSP4HZ7BV6XS4P8Q90', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'Token Reuse Attack Detected', 'Security', 'Invalid or reused token for user 01KS2T0792YWYJ9VHWDB74Y923. All active sessions invalidated.', '::1', NULL, '2026-10-08 11:33:49.000'),
('01M4DABCM3BMQ4E1WGE5E3298K', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'Token Reuse Attack Detected', 'Security', 'Invalid or reused token for user 01KS2T0792YWYJ9VHWDB74Y923. All active sessions invalidated.', '::1', NULL, '2026-10-08 11:33:49.000'),
('01M4DABCMJ521QHNDY8YSJ8AZV', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'Token Reuse Attack Detected', 'Security', 'Invalid or reused token for user 01KS2T0792YWYJ9VHWDB74Y923. All active sessions invalidated.', '::1', NULL, '2026-10-08 11:33:49.000'),
('01M4DAC5RS0VNTF8KKHG6PG75K', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'User Login', 'Auth', 'Okombe Mabenjo (mkapabenjamin254@gmail.com) logged in from ::1 on Chrome 154 on Windows 10', '::1', '01M4DAC5R7HDH6JVXNKAMHH34N', '2026-10-08 11:34:14.000');

DROP TABLE IF EXISTS `aireport`;

CREATE TABLE `aireport` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prompt` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `report` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `providerName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `b2clog`;

CREATE TABLE `b2clog` (
  `id` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `conversationId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `originatorConversationId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `payoutId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenantId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `status` int DEFAULT '2',
  `resultCode` int DEFAULT NULL,
  `resultDesc` text COLLATE utf8mb4_unicode_ci,
  `transactionId` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transactionReceipt` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rawRequest` mediumtext COLLATE utf8mb4_unicode_ci,
  `rawResponse` mediumtext COLLATE utf8mb4_unicode_ci,
  `rawCallback` mediumtext COLLATE utf8mb4_unicode_ci,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_b2c_conv` (`conversationId`),
  KEY `idx_b2c_payout` (`payoutId`),
  KEY `idx_b2c_tenant` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `customer`;

CREATE TABLE `customer` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `preferences` json DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `etims_credentials`;

CREATE TABLE `etims_credentials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kra_pin` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cmc_key` text COLLATE utf8mb4_unicode_ci,
  `cert_password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '00',
  `device_serial_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `api_key` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `communication_key` text COLLATE utf8mb4_unicode_ci,
  `env` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'sandbox',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_etims_provider` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `etims_invoices`;

CREATE TABLE `etims_invoices` (
  `id` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` int DEFAULT NULL,
  `kra_receipt_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qr_code_url` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `retry_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_etims_inv_provider` (`provider_id`),
  KEY `idx_etims_inv_payment` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `event`;

CREATE TABLE `event` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resourceId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `eventType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'CONFIRMED',
  `startTime` datetime DEFAULT NULL,
  `endTime` datetime DEFAULT NULL,
  `totalAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `paidAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `balance` decimal(15,2) NOT NULL DEFAULT '0.00',
  `meta` json DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `resourceId` (`resourceId`),
  KEY `idx_event_tenant_type` (`tenantId`,`eventType`),
  KEY `idx_event_dates` (`startTime`,`endTime`),
  KEY `idx_event_status` (`status`),
  CONSTRAINT `event_ibfk_1` FOREIGN KEY (`tenantId`) REFERENCES `tenant` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_ibfk_2` FOREIGN KEY (`resourceId`) REFERENCES `resource` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `expense`;

CREATE TABLE `expense` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(26) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resourceId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `eventId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `date` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `kcblog`;

CREATE TABLE `kcblog` (
  `id` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `merchantRequestId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkoutRequestId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `initiatorName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenantName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenantId` varchar(26) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` int DEFAULT '2',
  `resultCode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resultDesc` text COLLATE utf8mb4_unicode_ci,
  `rawPayload` mediumtext COLLATE utf8mb4_unicode_ci,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kcb_checkout` (`checkoutRequestId`),
  KEY `idx_kcb_tenant` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `mpesalog`;

CREATE TABLE `mpesalog` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `merchantRequestId` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkoutRequestId` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `initiatorName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenantName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenantId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` tinyint DEFAULT NULL COMMENT '0: INITIATION, 1: CALLBACK, 2: QUERY',
  `isRented` tinyint DEFAULT '0',
  `status` tinyint DEFAULT NULL COMMENT '0: SUCCESS, 1: FAILED, 2: PENDING, 3: CANCELLED, 4: ERROR',
  `resultCode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resultDesc` text COLLATE utf8mb4_unicode_ci,
  `rawPayload` json DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_checkout` (`checkoutRequestId`),
  KEY `idx_reference` (`reference`),
  KEY `idx_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `notification`;

CREATE TABLE `notification` (
  `id` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(26) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint(1) DEFAULT '0',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `relatedTenantId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referenceId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referenceType` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `operation`;

CREATE TABLE `operation` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resourceId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `opType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `assignedToUserId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estimatedCost` decimal(15,2) DEFAULT '0.00',
  `actualCost` decimal(15,2) DEFAULT '0.00',
  `expenseId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `resourceId` (`resourceId`),
  KEY `idx_op_tenant_type` (`tenantId`,`opType`),
  CONSTRAINT `operation_ibfk_1` FOREIGN KEY (`tenantId`) REFERENCES `tenant` (`id`) ON DELETE CASCADE,
  CONSTRAINT `operation_ibfk_2` FOREIGN KEY (`resourceId`) REFERENCES `resource` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `partner`;

CREATE TABLE `partner` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referralCode` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referralCode` (`referralCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `partnercommission`;

CREATE TABLE `partnercommission` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `partnerId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `payment`;

CREATE TABLE `payment` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plan` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mpesaReceipt` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mpesaRequestId` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `message` text COLLATE utf8mb4_unicode_ci,
  `status` tinyint DEFAULT '2',
  `referenceType` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'SALE',
  `referenceId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transactionType` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'SUBSCRIPTION',
  `isRented` tinyint DEFAULT '0',
  `payoutStatus` tinyint DEFAULT '0',
  `rawResponse` longtext COLLATE utf8mb4_unicode_ci,
  `merchantRequestId` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `meta` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_payment_status` (`status`),
  KEY `idx_payment_ref` (`reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `payout`;

CREATE TABLE `payout` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refereeId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sourceId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `processedAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenantId` (`tenantId`),
  CONSTRAINT `payout_ibfk_1` FOREIGN KEY (`tenantId`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `platformreview`;

CREATE TABLE `platformreview` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating` int NOT NULL,
  `reviewText` text COLLATE utf8mb4_unicode_ci,
  `businessName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ownerName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` int DEFAULT '0',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `tenantId` (`tenantId`),
  KEY `userId` (`userId`),
  CONSTRAINT `PlatformReview_ibfk_1` FOREIGN KEY (`tenantId`) REFERENCES `tenant` (`id`) ON DELETE CASCADE,
  CONSTRAINT `PlatformReview_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `product`;

CREATE TABLE `product` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `imageUrl` longtext COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) NOT NULL,
  `buyingPrice` decimal(10,2) DEFAULT NULL,
  `stockLevel` int DEFAULT '0',
  `minLevel` int DEFAULT '5',
  `isPerishable` tinyint(1) DEFAULT '0',
  `expiryDate` datetime(3) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'GOOD',
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_product_tenant_name` (`tenantId`,`name`),
  KEY `idx_product_tenant_category` (`tenantId`,`category`),
  KEY `idx_product_tenant_sku` (`tenantId`,`sku`),
  KEY `idx_product_stock` (`stockLevel`),
  KEY `idx_product_expiry` (`expiryDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `provider`;

CREATE TABLE `provider` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `businessName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `county` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `photoUrl` longtext COLLATE utf8mb4_unicode_ci,
  `settings` json DEFAULT NULL,
  `operationalSettings` json DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `description` text COLLATE utf8mb4_unicode_ci,
  `whatsapp` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `workingHours` json DEFAULT NULL,
  `notificationSettings` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `push_subscriptions`;

CREATE TABLE `push_subscriptions` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenantId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endpoint` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `p256dh` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `auth` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_push_user` (`userId`),
  KEY `idx_push_tenant` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `receipt`;

CREATE TABLE `receipt` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `saleId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `receiptNumber` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerPhone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerEmail` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `htmlContent` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `sentEmailAt` datetime(3) DEFAULT NULL,
  `sentSmsAt` datetime(3) DEFAULT NULL,
  `sentPhoneAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `saleId` (`saleId`),
  UNIQUE KEY `receiptNumber` (`receiptNumber`),
  KEY `idx_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `reportschedule`;

CREATE TABLE `reportschedule` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `columns` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `filters` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `frequency` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipients` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastRun` datetime(3) DEFAULT NULL,
  `nextRun` datetime(3) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `request`;

CREATE TABLE `request` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `providerId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serviceId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerPhone` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_providerId` (`providerId`),
  KEY `idx_customerId` (`customerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `resource`;

CREATE TABLE `resource` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parentId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `basePrice` decimal(15,2) NOT NULL DEFAULT '0.00',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'AVAILABLE',
  `meta` json DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_resource_tenant_type` (`tenantId`,`type`),
  KEY `idx_resource_status` (`status`),
  KEY `idx_resource_tenant_title` (`tenantId`,`title`),
  KEY `idx_resource_tenant_type_title` (`tenantId`,`type`,`title`),
  CONSTRAINT `resource_ibfk_1` FOREIGN KEY (`tenantId`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sale`;

CREATE TABLE `sale` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `totalAmount` decimal(10,2) NOT NULL,
  `paymentMethod` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'CASH',
  `source` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'In-Store',
  `mpesaReceipt` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mpesaRequestId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `status` tinyint DEFAULT '2',
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_customerId` (`customerId`),
  KEY `idx_tenant_createdAt` (`tenantId`,`createdAt` DESC),
  KEY `idx_sale_status` (`status`),
  KEY `idx_sale_tenant` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `saleitem`;

CREATE TABLE `saleitem` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `saleId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `buyingPrice` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `idx_saleId` (`saleId`),
  KEY `idx_productId` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `service`;

CREATE TABLE `service` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) NOT NULL,
  `duration` int DEFAULT '60',
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `session`;

CREATE TABLE `session` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `userAgent` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ipAddress` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastActive` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `isActive` tinyint(1) DEFAULT '1',
  `isImpersonation` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `displacedBy` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `session` (`id`, `userId`, `token`, `userAgent`, `ipAddress`, `lastActive`, `isActive`, `isImpersonation`, `createdAt`, `displacedBy`) VALUES 
('01M4DAC5R7HDH6JVXNKAMHH34N', '01KS2T0792YWYJ9VHWDB74Y923', '5760f1a583aa5f36ba283dea92ed7c783bc61d53bfdd6631a7184cda4c1af5d2', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36', '::1', '2026-10-08 11:35:25.000', 1, 0, '2026-10-08 11:34:14.000', NULL);

DROP TABLE IF EXISTS `subscription`;

CREATE TABLE `subscription` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `planName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'STARTER',
  `startDate` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `endDate` datetime(3) DEFAULT NULL,
  `trialEndDate` datetime(3) NOT NULL,
  `isTrial` tinyint(1) DEFAULT '0',
  `hasUsedTrial` tinyint(1) DEFAULT '0',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `status` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenantId` (`tenantId`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_sub_status` (`status`),
  KEY `idx_sub_tenant` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `subscription` (`id`, `tenantId`, `planName`, `startDate`, `endDate`, `trialEndDate`, `isTrial`, `hasUsedTrial`, `createdAt`, `updatedAt`, `status`) VALUES 
('01KS2T079PKH4AC4R5FYXY36S1', '01KS2T078ZP2F30RMBZW23WPTX', 'MAX', '2026-10-08 11:33:03.649', '2099-12-31 23:59:59.000', '2099-12-31 23:59:59.000', 0, 0, '2026-10-08 11:33:03.649', '2026-10-08 11:33:03.649', 1);

DROP TABLE IF EXISTS `systemevent`;

CREATE TABLE `systemevent` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'INFO',
  `category` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `method` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `path` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statusCode` int DEFAULT NULL,
  `durationMs` int DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_category` (`category`),
  KEY `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `systemnotification`;

CREATE TABLE `systemnotification` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenantId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `isRead` tinyint(1) DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenantId`),
  KEY `idx_user` (`userId`),
  KEY `idx_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `systemsetting`;

CREATE TABLE `systemsetting` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `dataType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'STRING',
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `systemsettings`;

CREATE TABLE `systemsettings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `maintenanceMode` tinyint(1) DEFAULT '0',
  `allowNewProviders` tinyint(1) DEFAULT '1',
  `platformFeePercentage` decimal(5,2) DEFAULT '5.00',
  `supportEmail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `systemsettings` (`id`, `maintenanceMode`, `allowNewProviders`, `platformFeePercentage`, `supportEmail`, `updatedAt`) VALUES 
(1, 0, 1, '5.00', 'info@hlynk.co.ke', '2026-10-08 11:33:03.000');

DROP TABLE IF EXISTS `tenant`;

CREATE TABLE `tenant` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referralCode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referredById` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `businessName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `payoutMethod` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'MPESA',
  `payoutAccount` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isTrial` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `referredBy` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `businessType` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'RETAIL',
  `activeModules` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `referralCode` (`referralCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tenant` (`id`, `slug`, `referralCode`, `referredById`, `businessName`, `isActive`, `payoutMethod`, `payoutAccount`, `isTrial`, `createdAt`, `updatedAt`, `referredBy`, `businessType`, `activeModules`) VALUES 
('01KS2T078ZP2F30RMBZW23WPTX', 'hlynk', 'EDUKNYJB', NULL, 'hlynk Inc', 1, 'MPESA', NULL, 0, '2026-10-08 11:33:03.632', '2026-10-08 11:33:03.632', NULL, 'RETAIL', NULL);

DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'CUSTOMER',
  `otp` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otpExpiresAt` datetime(3) DEFAULT NULL,
  `phoneVerified` tinyint(1) DEFAULT '0',
  `photoUrl` longtext COLLATE utf8mb4_unicode_ci,
  `eulaAcceptedAt` datetime DEFAULT NULL,
  `permissions` json DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `commissionType` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'NONE',
  `commissionRate` decimal(10,2) DEFAULT '0.00',
  `baseSalary` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `user` (`id`, `tenantId`, `name`, `phone`, `email`, `passwordHash`, `role`, `otp`, `otpExpiresAt`, `phoneVerified`, `photoUrl`, `eulaAcceptedAt`, `permissions`, `isActive`, `createdAt`, `updatedAt`, `commissionType`, `commissionRate`, `baseSalary`) VALUES 
('01KS2T0792YWYJ9VHWDB74Y923', '01KS2T078ZP2F30RMBZW23WPTX', 'Okombe Mabenjo', '0790590653', 'mkapabenjamin254@gmail.com', 'GOOGLE_AUTH', 'SUPER_ADMIN', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocJc3N4SJ4j44dr46yhkEYnwc9s1RV1rG8H6ie1z21OLf0d8AJWZ=s96-c', NULL, NULL, 1, '2026-10-08 11:33:03.639', '2026-10-08 11:34:14.000', 'NONE', '0.00', '0.00');

SET FOREIGN_KEY_CHECKS = 1;