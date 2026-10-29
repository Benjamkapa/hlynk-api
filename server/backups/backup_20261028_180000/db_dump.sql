SET FOREIGN_KEY_CHECKS = 0;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `activationcode`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `activationcode` (
  `id` varchar(26) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `planName` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `durationDays` int NOT NULL,
  `assignedPhone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maxUses` int DEFAULT '1',
  `usedCount` int DEFAULT '0',
  `createdBy` varchar(26) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `expiresAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `activitylog`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `activitylog` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `logName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ipAddress` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actionId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_userId` (`userId`),
  KEY `idx_tenant_createdAt` (`tenantId`,`createdAt` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `activitylog` (`id`, `tenantId`, `userId`, `action`, `logName`, `details`, `ipAddress`, `actionId`, `createdAt`) VALUES 
('01M5EK3EE4WKW2N7BM47Q3ABNQ', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'Token Reuse Attack Detected', 'Security', 'Invalid or reused token for user 01KS2T0792YWYJ9VHWDB74Y923. All active sessions invalidated.', '::1', NULL, '2026-10-21 09:41:42.000'),
('01M5F9NDKEQ4C60KQAXV15C01Q', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'User Login', 'Auth', 'Okombe Mabenjo (mkapabenjamin254@gmail.com) logged in from ::1 on Chrome 155 on Windows 10', '::1', '01M5F9NDJKSMZNFMP8GPTFQG1K', '2026-10-21 16:15:59.000'),
('01M5FA3N0X7H0P15R4T7BFHSVF', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'POST /api/v1/notifications/broadcast', 'Operation', 'Okombe Mabenjo performed POST /api/v1/notifications/broadcast (POST /api/v1/notifications/broadcast)', '::1', '01M5F9NDJKSMZNFMP8GPTFQG1K', '2026-10-21 16:23:46.000'),
('01M5FAA0ES4E23PQCTS3X8QWN7', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'POST /api/v1/notifications/broadcast', 'Operation', 'Okombe Mabenjo performed POST /api/v1/notifications/broadcast (POST /api/v1/notifications/broadcast)', '::1', '01M5F9NDJKSMZNFMP8GPTFQG1K', '2026-10-21 16:27:14.000'),
('01M5FAAH4PHS0SES4R2RMJH39Z', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'POST /api/v1/notifications/broadcast', 'Operation', 'Okombe Mabenjo performed POST /api/v1/notifications/broadcast (POST /api/v1/notifications/broadcast)', '::1', '01M5F9NDJKSMZNFMP8GPTFQG1K', '2026-10-21 16:27:31.000'),
('01M5FAMBTVNXSXJDC42519BVV5', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'User Logout', 'Auth', 'Okombe Mabenjo (N/A) ended session', '::1', '01M5F9NDJKSMZNFMP8GPTFQG1K', '2026-10-21 16:32:53.000'),
('01M5H7MZWF68A5R596KAXCAPNQ', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'User Login', 'Auth', 'Okombe Mabenjo (mkapabenjamin254@gmail.com) logged in from ::1 on Chrome 155 on Windows 10', '::1', '01M5H7MZV50QM1630RCPPYYAHK', '2026-10-22 10:19:17.000'),
('01M5KNQ9B3FS0JEKGS29TNTJGG', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'User Logout', 'Auth', 'Okombe Mabenjo (N/A) ended session', '::1', '01M5H7MZV50QM1630RCPPYYAHK', '2026-10-23 09:03:41.000'),
('01M5PBDETZA8MCPFQYTY7PQK40', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'User Login', 'Auth', 'Okombe Mabenjo (mkapabenjamin254@gmail.com) logged in from ::1 on Chrome 156 on Windows 10', '::1', '01M5PBDESD1SKKBG4J1AY6G8PX', '2026-10-24 10:01:17.000'),
('01M5PBE4Z2ZMXCZ3PWTNSA5WBJ', 'SYSTEM', '01KS2T0792YWYJ9VHWDB74Y923', 'Platform Report Exported', 'Maintenance', 'Admin exported intelligence report (0 tx, 17 vendors, 13 activity entries)', NULL, NULL, '2026-10-24 10:01:39.000'),
('01M5PFHQPAH3DQBHZH9NJ9PJRB', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'User Login', 'Auth', 'Okombe Mabenjo (mkapabenjamin254@gmail.com) logged in from ::1 on Chrome 156 on Windows 10', '::1', '01M5PFHQMGV7QWMDSS3Q44FFBB', '2026-10-24 11:13:31.000'),
('01M5PFHQQR4BSAB8FH9TG44NX2', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'Concurrent Admin Login Alert', 'Security', 'Concurrent admin login for mkapabenjamin254@gmail.com from IP ::1 (Chrome 156 on Windows 10). Prior 1 active session(s) were kept alive.', '::1', NULL, '2026-10-24 11:13:31.000'),
('01M5PFKX2Q2YX7FDYEKJR5SCT5', 'SYSTEM', '01KS2T0792YWYJ9VHWDB74Y923', 'User Deleted', 'Danger', 'Deleted user ID: 01KSFKPESPZ01X5T0YHRMN3AJX', NULL, NULL, '2026-10-24 11:14:42.000'),
('01M5PFKX3DZBP31BR75Q2ZFF4J', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', '❌ Delete User', 'Admin', 'Okombe Mabenjo performed ❌ Delete User (DELETE /api/v1/admin/users/01KSFKPESPZ01X5T0YHRMN3AJX)', '::1', '01M5PFHQMGV7QWMDSS3Q44FFBB', '2026-10-24 11:14:42.000'),
('01M5PFN13CSWR2NRNGT1W331MW', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', '🎭 Impersonate User', 'Security', 'Okombe Mabenjo performed 🎭 Impersonate User (POST /api/v1/admin/users/01M49NKSVV5PDTEE3ACSEPJ7F3/impersonate)', '::1', '01M5PFHQMGV7QWMDSS3Q44FFBB', '2026-10-24 11:15:19.000'),
('01M60J3DT9122DQ5GCJPNPQVJN', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'User Login', 'Auth', 'Okombe Mabenjo (mkapabenjamin254@gmail.com) logged in from ::1 on Chrome 156 on Windows 10', '::1', '01M60J3DRZ8XGSK64YEE55E874', '2026-10-28 09:10:32.000'),
('01M60J3DVV6MF63DJG9WJEXT40', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'Concurrent Admin Login Alert', 'Security', 'Concurrent admin login for mkapabenjamin254@gmail.com from IP ::1 (Chrome 156 on Windows 10). Prior 2 active session(s) were kept alive.', '::1', NULL, '2026-10-28 09:10:32.000'),
('01M60Z0HJ2HEC5BRP8N595RKR7', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'DELETE /api/v1/admin/tenants/01M4T6ECE60B8F3B681158YYNQ', 'Operation', 'Okombe Mabenjo performed DELETE /api/v1/admin/tenants/01M4T6ECE60B8F3B681158YYNQ (DELETE /api/v1/admin/tenants/01M4T6ECE60B8F3B681158YYNQ)', '::1', '01M60J3DRZ8XGSK64YEE55E874', '2026-10-28 12:56:09.000'),
('01M60Z0RZ2NV2SYR4PZFHJME2T', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'DELETE /api/v1/admin/tenants/01M49NKSVTA48XGXHB042P78QK', 'Operation', 'Okombe Mabenjo performed DELETE /api/v1/admin/tenants/01M49NKSVTA48XGXHB042P78QK (DELETE /api/v1/admin/tenants/01M49NKSVTA48XGXHB042P78QK)', '::1', '01M60J3DRZ8XGSK64YEE55E874', '2026-10-28 12:56:17.000'),
('01M61949KJ63BXYMZXN5G0F06D', '01M25M6D3AKMZMZNR9YWNFSSYS', '01KS2T0792YWYJ9VHWDB74Y923', 'Impersonation Access', 'Security', 'Super Admin access murumbamercy20@gmail.com', NULL, NULL, '2026-10-28 15:52:58.000'),
('01M61949MB35D8KW33N8S7JG6M', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', '🎭 Impersonate User', 'Security', 'Okombe Mabenjo performed 🎭 Impersonate User (POST /api/v1/admin/users/01M25M6D3ASYFNYRHS204T2RTY/impersonate)', '::1', '01M60J3DRZ8XGSK64YEE55E874', '2026-10-28 15:52:58.000');
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `aireport`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `aireport` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `report` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `providerName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `b2clog`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `b2clog` (
  `id` varchar(26) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `conversationId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `originatorConversationId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `payoutId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` int DEFAULT '2',
  `resultCode` int DEFAULT NULL,
  `resultDesc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `transactionId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transactionReceipt` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rawRequest` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rawResponse` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rawCallback` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_b2c_conv` (`conversationId`),
  KEY `idx_b2c_payout` (`payoutId`),
  KEY `idx_b2c_tenant` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `b2clog` (`id`, `conversationId`, `originatorConversationId`, `phone`, `amount`, `payoutId`, `tenantId`, `remarks`, `status`, `resultCode`, `resultDesc`, `transactionId`, `transactionReceipt`, `rawRequest`, `rawResponse`, `rawCallback`, `createdAt`, `updatedAt`) VALUES 
('01KTNVQA70WRVM441M8WPFTDZJ', 'AG_20260609_010017830qy568ep0xhb', '09a4-4786-8c19-2ce88cc7bd0a65', '254790590653', '5.00', NULL, NULL, 'Hlynk Diagnostic Test', 1, 2001, 'The initiator information is invalid.', 'UF90000000', NULL, '{\"InitiatorName\":\"api_initiator\",\"SecurityCredential\":\"placeholder\",\"CommandID\":\"BusinessPayment\",\"Amount\":5,\"PartyA\":\"4003431\",\"PartyB\":\"254790590653\",\"Remarks\":\"Hlynk Diagnostic Test\",\"QueueTimeOutURL\":\"https://api.hlynk.co.ke/api/v1/payments/mpesa/b2c/timeout\",\"ResultURL\":\"https://api.hlynk.co.ke/api/v1/payments/mpesa/b2c/result\",\"Occasion\":\"Withdrawal\"}', '{\"ConversationID\":\"AG_20260609_010017830qy568ep0xhb\",\"OriginatorConversationID\":\"09a4-4786-8c19-2ce88cc7bd0a65\",\"ResponseCode\":\"0\",\"ResponseDescription\":\"Accept the service request successfully.\"}', '{\"Result\":{\"ResultType\":0,\"ResultCode\":2001,\"ResultDesc\":\"The initiator information is invalid.\",\"OriginatorConversationID\":\"09a4-4786-8c19-2ce88cc7bd0a65\",\"ConversationID\":\"AG_20260609_010017830qy568ep0xhb\",\"TransactionID\":\"UF90000000\",\"ReferenceData\":{\"ReferenceItem\":{\"Key\":\"QueueTimeoutURL\",\"Value\":\"http://internalapi.safaricom.co.ke/mpesa/b2cresults/v1/submit\"}}}}', '2026-06-09 12:34:23.000', '2026-06-09 12:34:23.000'),
('01KV3VVWF1FN0QP6AXY80RACPP', 'AG_20260614_010010411dile9skppwh', '7181-467c-86b3-5604e758b65419469', '254790590653', '10.00', NULL, NULL, 'Hlynk Diagnostic Test', 2, NULL, NULL, NULL, NULL, '{\"InitiatorName\":\"api_initiator\",\"SecurityCredential\":\"placeholder\",\"CommandID\":\"BusinessPayment\",\"Amount\":10,\"PartyA\":\"174379\",\"PartyB\":\"254790590653\",\"Remarks\":\"Hlynk Diagnostic Test\",\"QueueTimeOutURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/timeout\",\"ResultURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/result\",\"Occasion\":\"Withdrawal\"}', '{\"ConversationID\":\"AG_20260614_010010411dile9skppwh\",\"OriginatorConversationID\":\"7181-467c-86b3-5604e758b65419469\",\"ResponseCode\":\"0\",\"ResponseDescription\":\"Accept the service request successfully.\"}', NULL, '2026-06-14 23:06:14.000', '2026-06-14 23:06:14.000'),
('01KV3VWP5WR7K6WWYRESAC82HM', 'AG_20260614_010010411dj5w6k83vnj', '7181-467c-86b3-5604e758b65419476', '254790590653', '10.00', NULL, NULL, 'Hlynk Diagnostic Test', 2, NULL, NULL, NULL, NULL, '{\"InitiatorName\":\"api_initiator\",\"SecurityCredential\":\"placeholder\",\"CommandID\":\"BusinessPayment\",\"Amount\":10,\"PartyA\":\"174379\",\"PartyB\":\"254790590653\",\"Remarks\":\"Hlynk Diagnostic Test\",\"QueueTimeOutURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/timeout\",\"ResultURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/result\",\"Occasion\":\"Withdrawal\"}', '{\"ConversationID\":\"AG_20260614_010010411dj5w6k83vnj\",\"OriginatorConversationID\":\"7181-467c-86b3-5604e758b65419476\",\"ResponseCode\":\"0\",\"ResponseDescription\":\"Accept the service request successfully.\"}', NULL, '2026-06-14 23:06:40.000', '2026-06-14 23:06:40.000'),
('01KV3WMFNJQ2RPHXJZT1KHEP7T', 'AG_20260614_010010411dzvchcfk6sf', '7181-467c-86b3-5604e758b65419883', '254790590653', '10.00', NULL, NULL, 'Hlynk Diagnostic Test', 2, NULL, NULL, NULL, NULL, '{\"InitiatorName\":\"api_initiator\",\"SecurityCredential\":\"placeholder\",\"CommandID\":\"BusinessPayment\",\"Amount\":10,\"PartyA\":\"174379\",\"PartyB\":\"254790590653\",\"Remarks\":\"Hlynk Diagnostic Test\",\"QueueTimeOutURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/timeout\",\"ResultURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/result\",\"Occasion\":\"Withdrawal\"}', '{\"ConversationID\":\"AG_20260614_010010411dzvchcfk6sf\",\"OriginatorConversationID\":\"7181-467c-86b3-5604e758b65419883\",\"ResponseCode\":\"0\",\"ResponseDescription\":\"Accept the service request successfully.\"}', NULL, '2026-06-14 23:19:40.000', '2026-06-14 23:19:40.000'),
('01KV3WQ9QX7W5X1V5M079E2J70', 'AG_20260614_010010411e1va62g6ey9', '7181-467c-86b3-5604e758b65419929', '254790590653', '10.00', NULL, NULL, 'Hlynk Diagnostic Test', 2, NULL, NULL, NULL, NULL, '{\"InitiatorName\":\"api_initiator\",\"SecurityCredential\":\"placeholder\",\"CommandID\":\"BusinessPayment\",\"Amount\":10,\"PartyA\":\"174379\",\"PartyB\":\"254790590653\",\"Remarks\":\"Hlynk Diagnostic Test\",\"QueueTimeOutURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/timeout\",\"ResultURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/result\",\"Occasion\":\"Withdrawal\"}', '{\"ConversationID\":\"AG_20260614_010010411e1va62g6ey9\",\"OriginatorConversationID\":\"7181-467c-86b3-5604e758b65419929\",\"ResponseCode\":\"0\",\"ResponseDescription\":\"Accept the service request successfully.\"}', NULL, '2026-06-14 23:21:13.000', '2026-06-14 23:21:13.000'),
('01KV3WX00XDQH8BX3GEMEJG83N', 'AG_20260614_010010411e5uhpedelwp', '7181-467c-86b3-5604e758b65420041', '254790590653', '10.00', NULL, NULL, 'Hlynk Diagnostic Test', 2, NULL, NULL, NULL, NULL, '{\"InitiatorName\":\"api_initiator\",\"SecurityCredential\":\"placeholder\",\"CommandID\":\"BusinessPayment\",\"Amount\":10,\"PartyA\":\"174379\",\"PartyB\":\"254790590653\",\"Remarks\":\"Hlynk Diagnostic Test\",\"QueueTimeOutURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/timeout\",\"ResultURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/result\",\"Occasion\":\"Withdrawal\"}', '{\"ConversationID\":\"AG_20260614_010010411e5uhpedelwp\",\"OriginatorConversationID\":\"7181-467c-86b3-5604e758b65420041\",\"ResponseCode\":\"0\",\"ResponseDescription\":\"Accept the service request successfully.\"}', NULL, '2026-06-14 23:24:19.000', '2026-06-14 23:24:19.000'),
('01KVC6D29CS24QAM8D6DSH4G0N', 'AG_20260618_010010410a5gxz9mwtre', '1d03-457a-a3a2-f4d835d11bc66312', '254790590653', '10.00', NULL, NULL, 'Hlynk Diagnostic Test', 2, NULL, NULL, NULL, NULL, '{\"InitiatorName\":\"api_initiator\",\"SecurityCredential\":\"placeholder\",\"CommandID\":\"BusinessPayment\",\"Amount\":10,\"PartyA\":\"174379\",\"PartyB\":\"254790590653\",\"Remarks\":\"Hlynk Diagnostic Test\",\"QueueTimeOutURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/timeout\",\"ResultURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/result\",\"Occasion\":\"Withdrawal\"}', '{\"ConversationID\":\"AG_20260618_010010410a5gxz9mwtre\",\"OriginatorConversationID\":\"1d03-457a-a3a2-f4d835d11bc66312\",\"ResponseCode\":\"0\",\"ResponseDescription\":\"Accept the service request successfully.\"}', NULL, '2026-06-18 04:44:20.000', '2026-06-18 04:44:20.000'),
('01KVC6D6K0539YPKVJBMQ3G947', 'AG_20260618_010010410a5k4s46fteb', '1d03-457a-a3a2-f4d835d11bc66313', '254790590653', '10.00', NULL, NULL, 'Hlynk Diagnostic Test', 2, NULL, NULL, NULL, NULL, '{\"InitiatorName\":\"api_initiator\",\"SecurityCredential\":\"placeholder\",\"CommandID\":\"BusinessPayment\",\"Amount\":10,\"PartyA\":\"174379\",\"PartyB\":\"254790590653\",\"Remarks\":\"Hlynk Diagnostic Test\",\"QueueTimeOutURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/timeout\",\"ResultURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/result\",\"Occasion\":\"Withdrawal\"}', '{\"ConversationID\":\"AG_20260618_010010410a5k4s46fteb\",\"OriginatorConversationID\":\"1d03-457a-a3a2-f4d835d11bc66313\",\"ResponseCode\":\"0\",\"ResponseDescription\":\"Accept the service request successfully.\"}', NULL, '2026-06-18 04:44:24.000', '2026-06-18 04:44:24.000'),
('01KVC6DD0A8B1P26EHRECGQ2DV', 'AG_20260618_010010410a5pg35xw7m9', 'c83f-48e7-aa61-d21fea2b8c1b7360', '254790590653', '10.00', NULL, NULL, 'Hlynk Diagnostic Test', 2, NULL, NULL, NULL, NULL, '{\"InitiatorName\":\"api_initiator\",\"SecurityCredential\":\"placeholder\",\"CommandID\":\"BusinessPayment\",\"Amount\":10,\"PartyA\":\"174379\",\"PartyB\":\"254790590653\",\"Remarks\":\"Hlynk Diagnostic Test\",\"QueueTimeOutURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/timeout\",\"ResultURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/result\",\"Occasion\":\"Withdrawal\"}', '{\"ConversationID\":\"AG_20260618_010010410a5pg35xw7m9\",\"OriginatorConversationID\":\"c83f-48e7-aa61-d21fea2b8c1b7360\",\"ResponseCode\":\"0\",\"ResponseDescription\":\"Accept the service request successfully.\"}', NULL, '2026-06-18 04:44:31.000', '2026-06-18 04:44:31.000'),
('01KVC6DK13XPVFDZ2BCM5HM5C2', 'AG_20260618_010010410a5u6zww6iy5', '1d03-457a-a3a2-f4d835d11bc66316', '254790590653', '10.00', NULL, NULL, 'Hlynk Diagnostic Test', 2, NULL, NULL, NULL, NULL, '{\"InitiatorName\":\"api_initiator\",\"SecurityCredential\":\"placeholder\",\"CommandID\":\"BusinessPayment\",\"Amount\":10,\"PartyA\":\"174379\",\"PartyB\":\"254790590653\",\"Remarks\":\"Hlynk Diagnostic Test\",\"QueueTimeOutURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/timeout\",\"ResultURL\":\"https://0657-102-0-8-34.ngrok-free.app/api/v1/payments/mpesa/b2c/result\",\"Occasion\":\"Withdrawal\"}', '{\"ConversationID\":\"AG_20260618_010010410a5u6zww6iy5\",\"OriginatorConversationID\":\"1d03-457a-a3a2-f4d835d11bc66316\",\"ResponseCode\":\"0\",\"ResponseDescription\":\"Accept the service request successfully.\"}', NULL, '2026-06-18 04:44:37.000', '2026-06-18 04:44:37.000'),
('01KVDARNBMC7APPJHM3CKEP0CV', 'AG_20260618_010017830wuv6386zzj9', 'a7ed-4959-aff0-340f2d1d7ec86769', '254790590653', '5.00', NULL, NULL, 'Hlynk Diagnostic Test', 1, 2001, 'The initiator information is invalid.', 'UFI0000000', NULL, '{\"InitiatorName\":\"api_initiator\",\"SecurityCredential\":\"placeholder\",\"CommandID\":\"BusinessPayment\",\"Amount\":5,\"PartyA\":\"4003431\",\"PartyB\":\"254790590653\",\"Remarks\":\"Hlynk Diagnostic Test\",\"QueueTimeOutURL\":\"https://api.hlynk.co.ke/api/v1/payments/mpesa/b2c/timeout\",\"ResultURL\":\"https://api.hlynk.co.ke/api/v1/payments/mpesa/b2c/result\",\"Occasion\":\"Withdrawal\"}', '{\"ConversationID\":\"AG_20260618_010017830wuv6386zzj9\",\"OriginatorConversationID\":\"a7ed-4959-aff0-340f2d1d7ec86769\",\"ResponseCode\":\"0\",\"ResponseDescription\":\"Accept the service request successfully.\"}', '{\"Result\":{\"ResultType\":0,\"ResultCode\":2001,\"ResultDesc\":\"The initiator information is invalid.\",\"OriginatorConversationID\":\"a7ed-4959-aff0-340f2d1d7ec86769\",\"ConversationID\":\"AG_20260618_010017830wuv6386zzj9\",\"TransactionID\":\"UFI0000000\",\"ReferenceData\":{\"ReferenceItem\":{\"Key\":\"QueueTimeoutURL\",\"Value\":\"http://internalapi.safaricom.co.ke/mpesa/b2cresults/v1/submit\"}}}}', '2026-06-18 15:19:47.000', '2026-06-18 15:19:48.000'),
('01M421NHRD5TANDFF5BSJD5DAM', 'AG_20261004_0100178305dhh94s7q1f', '596d-4b8a-8f93-4dbc9cca9a7812625928', '254790590653', '5.00', NULL, NULL, 'hlynk Diagnostic Test', 1, 2001, 'The initiator information is invalid.', 'UJ40000000', NULL, '{\"InitiatorName\":\"api_initiator\",\"SecurityCredential\":\"placeholder\",\"CommandID\":\"BusinessPayment\",\"Amount\":5,\"PartyA\":\"4003431\",\"PartyB\":\"254790590653\",\"Remarks\":\"hlynk Diagnostic Test\",\"QueueTimeOutURL\":\"https://api.hlynk.co.ke/api/v1/payments/mpesa/b2c/timeout\",\"ResultURL\":\"https://api.hlynk.co.ke/api/v1/payments/mpesa/b2c/result\",\"Occasion\":\"Withdrawal\"}', '{\"ConversationID\":\"AG_20261004_0100178305dhh94s7q1f\",\"OriginatorConversationID\":\"596d-4b8a-8f93-4dbc9cca9a7812625928\",\"ResponseCode\":\"0\",\"ResponseDescription\":\"Accept the service request successfully.\"}', '{\"Result\":{\"ResultType\":0,\"ResultCode\":2001,\"ResultDesc\":\"The initiator information is invalid.\",\"OriginatorConversationID\":\"596d-4b8a-8f93-4dbc9cca9a7812625928\",\"ConversationID\":\"AG_20261004_0100178305dhh94s7q1f\",\"TransactionID\":\"UJ40000000\",\"ReferenceData\":{\"ReferenceItem\":{\"Key\":\"QueueTimeoutURL\",\"Value\":\"http://internalapi.safaricom.co.ke/mpesa/b2cresults/v1/submit\"}}}}', '2026-10-04 02:30:27.000', '2026-10-04 02:30:28.000');
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `customer`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `customer` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `preferences` json DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `etims_credentials`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `etims_credentials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `kra_pin` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cmc_key` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cert_password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '00',
  `device_serial_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `api_key` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `communication_key` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `env` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'sandbox',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_etims_provider` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `etims_invoices`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `etims_invoices` (
  `id` varchar(26) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` int DEFAULT NULL,
  `kra_receipt_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qr_code_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `retry_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_etims_inv_provider` (`provider_id`),
  KEY `idx_etims_inv_payment` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `event`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `event` (
  `id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resourceId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `eventType` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'CONFIRMED',
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
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `expense`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `expense` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(26) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resourceId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `eventId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `date` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `expense` (`id`, `tenantId`, `userId`, `category`, `description`, `resourceId`, `eventId`, `amount`, `date`, `createdAt`) VALUES 
('01KWQ71NJH3V0S52EG7PVSYFJ0', '01KVGJF6YRSCQEGM4WHFPQ34ER', '01KVGJF6Z5P8Q0XDXGXKBXE2WE', 'Staff Wages', 'jaluedo', NULL, NULL, '1000.00', '2026-07-04 03:00:00.000', '2026-07-04 21:42:54.000'),
('01KWV1Y2H4Y9R0V46DBQMSB48Z', '01KVGJF6YRSCQEGM4WHFPQ34ER', '01KVGJF6Z5P8Q0XDXGXKBXE2WE', 'Utilities', 'drgretert', NULL, NULL, '3.00', '2026-07-06 03:00:00.000', '2026-07-06 09:30:31.000'),
('01KWV2EG00VCAS63FNVDRE8RP5', '01KVGJF6YRSCQEGM4WHFPQ34ER', '01KVGJF6Z5P8Q0XDXGXKBXE2WE', 'Utilities', 'dedddd', NULL, NULL, '9990.00', '2026-07-06 09:39:29.793', '2026-07-06 09:39:29.000'),
('01M25ME7AJQNVA5FAVZXQ0DW90', '01M25M6D3AKMZMZNR9YWNFSSYS', '01M25M6D3ASYFNYRHS204T2RTY', 'Utilities', 'Electric bill', NULL, NULL, '10.00', '2026-09-10 15:24:48.722', '2026-09-10 15:24:48.000');
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `kcblog`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `kcblog` (
  `id` varchar(26) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `merchantRequestId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkoutRequestId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `reference` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `initiatorName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenantName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenantId` varchar(26) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` int DEFAULT '2',
  `resultCode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resultDesc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rawPayload` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kcb_checkout` (`checkoutRequestId`),
  KEY `idx_kcb_tenant` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `kcblog` (`id`, `merchantRequestId`, `checkoutRequestId`, `phone`, `amount`, `reference`, `customerName`, `initiatorName`, `tenantName`, `tenantId`, `status`, `resultCode`, `resultDesc`, `rawPayload`, `createdAt`, `updatedAt`) VALUES 
('01KTEBEJXK7ZBQEFPN8KR523Z8', NULL, '01KTEBEJXH2ZVH73BY55Z2HEYM', '254790590653', '2.00', 'KCB-715295', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 2, NULL, NULL, '\"\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n \\n\\n \\n\\n    \\n    \\n<!DOCTYPE html PUBLIC \\\"-//W3C//DTD XHTML 1.0 Transitional//EN\\\" \\\"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\\\">\\n<html xmlns=\\\"http://www.w3.org/1999/xhtml\\\">\\n\\n\\n<head>\\n    <meta http-equiv=\\\"content-type\\\" content=\\\"text/html;charset=utf-8\\\"/>\\n    \\n    <title>WSO2 API Manager</title>\\n    \\n    <link href=\\\"../admin/css/global.css\\\" rel=\\\"stylesheet\\\" type=\\\"text/css\\\" media=\\\"all\\\"/>\\n\\n    <link href=\\\"../styles/css/main.css\\\" rel=\\\"stylesheet\\\" type=\\\"text/css\\\" media=\\\"all\\\"/>\\n    <link href=\\\"../dialog/css/jqueryui/jqueryui-themeroller.css\\\" rel=\\\"stylesheet\\\" type=\\\"text/css\\\"\\n          media=\\\"all\\\"/>\\n    <link href=\\\"../dialog/css/dialog.css\\\" rel=\\\"stylesheet\\\" type=\\\"text/css\\\" media=\\\"all\\\"/>\\n    <link rel=\\\"stylesheet\\\" href=\\\"../admin/css/carbonFormStyles.css\\\">\\n    <!--[if gte IE 8]>\\n    <link href=\\\"../dialog/css/dialog-ie8.css\\\" rel=\\\"stylesheet\\\" type=\\\"text/css\\\" media=\\\"all\\\"/>        \\n    <![endif]-->\\n    <!--[if gte IE 7]>\\n    <link href=\\\"../dialog/css/dialog-ie8.css\\\" rel=\\\"stylesheet\\\" type=\\\"text/css\\\" media=\\\"all\\\"/>\\n    <![endif]-->\\n    <link rel=\\\"icon\\\" href=\\\"../admin/images/favicon.ico\\\" type=\\\"image/x-icon\\\"/>\\n    <link rel=\\\"shortcut icon\\\" href=\\\"../admin/images/favicon.ico\\\" type=\\\"image/x-icon\\\"/>\\n\\n    \\n            <script type=\\\"text/javascript\\\" src=\\\"../admin/js/csrfPrevention.js\\\"></script>\\n    \\n    <script type=\\\"text/javascript\\\" src=\\\"../admin/js/jquery-3.6.0.min.js\\\"></script>\\n    <script type=\\\"text/javascript\\\" src=\\\"../admin/js/jquery-migrate-3.3.2.js\\\"></script>\\n    <script type=\\\"text/javascript\\\" src=\\\"../admin/js/jquery.form.js\\\"></script>\\n    <script type=\\\"text/javascript\\\" src=\\\"../dialog/js/jqueryui/jquery-ui.min.js\\\"></script>\\n    <script type=\\\"text/javascript\\\" src=\\\"../admin/js/jquery.validate.js\\\"></script>    \\n    <script type=\\\"text/javascript\\\" src=\\\"../admin/js/jquery.cookie.js\\\"></script>\\n    <script type=\\\"text/javascript\\\" src=\\\"../admin/js/jquery.ui.core.min.js\\\"></script>\\n    <script type=\\\"text/javascript\\\" src=\\\"../admin/js/jquery.ui.widget.min.js\\\"></script>\\n    <script type=\\\"text/javascript\\\" src=\\\"../admin/js/jquery.ui.tabs.min.js\\\"></script>\\n    <script type=\\\"text/javascript\\\" src=\\\"../admin/js/main.js\\\"></script>\\n    <script type=\\\"text/javascript\\\" src=\\\"../admin/js/WSRequest.js\\\"></script>\\n    <script type=\\\"text/javascript\\\" src=\\\"../admin/js/cookies.js\\\"></script>\\n\\n    <script type=\\\"text/javascript\\\" src=\\\"../admin/js/customControls.js\\\"></script>\\n</head>\\n\\n\\t\\t<script type=\\\"text/javascript\\\">\\n\\t\\tif(getCookie(\'region1_configure_menu\') == null){\\nif (window.location.protocol == \\\"https:\\\"){\\n  setCookie(\'region1_configure_menu\', \'none\',\'\',\'\',\'secure\');\\n} else {  setCookie(\'region1_configure_menu\', \'none\');\\n}\\n}\\nif(getCookie(\'region3_registry_menu\') == null){\\nif (window.location.protocol == \\\"https:\\\"){\\n  setCookie(\'region3_registry_menu\', \'none\',\'\',\'\',\'secure\');\\n} else {  setCookie(\'region3_registry_menu\', \'none\');\\n}\\n}\\nif(getCookie(\'region4_monitor_menu\') == null){\\nif (window.location.protocol == \\\"https:\\\"){\\n  setCookie(\'region4_monitor_menu\', \'none\',\'\',\'\',\'secure\');\\n} else {  setCookie(\'region4_monitor_menu\', \'none\');\\n}\\n}\\nif(getCookie(\'region5_tools_menu\') == null){\\nif (window.location.protocol == \\\"https:\\\"){\\n  setCookie(\'region5_tools_menu\', \'none\',\'\',\'\',\'secure\');\\n} else {  setCookie(\'region5_tools_menu\', \'none\');\\n}\\n}\\n\\n\\t\\t</script>\\n\\t\\t\\n<body>\\n<noscript>\\r\\n<div class=\\\"something-wrong\\\">\\r\\n\\t<div class=\\\"title\\\">JavaScript is disabled on your browser</div>\\r\\n\\t<div class=\\\"content\\\">Please enable JavaScript or upgrade to a JavaScript-capable browser to use WSO2 Products.</div>\\r\\n</div>\\r\\n</noscript>\\r\\n<!--[if lte IE 6]>\\r\\n<div class=\\\"something-wrong\\\">\\r\\n\\t<div class=\\\"title\\\">Did you know that your Internet Explorer is out of date?</div>\\r\\n\\t<div class=\\\"content\\\">To get the best possible experience using our website we recommend that you upgrade to a newer version.</div>\\r\\n</div>\\r\\n<![endif]-->\\r\\n\\n<div id=\\\"dcontainer\\\"></div>\\n<script type=\\\"text/javascript\\\" src=\\\"../dialog/js/dialog.js\\\"></script>\\n\\n<!-- JS imports for collapsible menu -->\\n<script src=\\\"../yui/build/yahoo-dom-event/yahoo-dom-event.js\\\" type=\\\"text/javascript\\\"></script>\\n<script src=\\\"../yui/build/animation/animation-min.js\\\" type=\\\"text/javascript\\\"></script>\\n<script src=\\\"../admin/js/template.js\\\" type=\\\"text/javascript\\\"></script>\\n<script src=\\\"../yui/build/yahoo/yahoo-min.js\\\" type=\\\"text/javascript\\\"></script>\\n<script src=\\\"../yui/build/selector/selector-min.js\\\" type=\\\"text/javascript\\\"></script>\\n\\n<table id=\\\"main-table\\\" border=\\\"0\\\" cellspacing=\\\"0\\\">\\n    <tr>\\n        <td id=\\\"header\\\" colspan=\\\"3\\\">\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n<!--[IF IE 7]>\\n\\t<style>\\n\\t\\tdiv#header-div div.right-links{\\n\\t\\t\\tposition:absolute;\\n\\t\\t}\\n\\t</style>\\n<![endif]-->\\n\\n\\n    <div id=\\\"header-div\\\">\\n        <div class=\\\"right-logo\\\">Management Console</div>\\n        <div class=\\\"left-logo\\\">\\n            <a href=\\\"../admin/index.jsp\\\" class=\\\"header-home\\\"><img src=\\\"../admin/images/1px.gif\\\" width=\\\"300px\\\" height=\\\"32px\\\"/></a>\\n        </div>\\n        <div class=\\\"middle-ad\\\">\\n            \\n\\n\\n\\n\\n        </div>\\n        <div class=\\\"header-links\\\">\\n\\t\\t<div class=\\\"right-links\\\">            \\n\\t\\t\\t<ul>\\n\\t\\t                \\n\\t\\t                <li class=\\\"right\\\">\\n\\t\\t                    <a href=\\\"../admin/login.jsp\\\">Sign-in</a>\\n\\t\\t                </li>\\n\\t\\t                \\n\\t\\t                <li class=\\\"middle\\\">|</li>\\n\\t\\t                <li class=\\\"middle\\\">\\n\\t\\t                    <a target=\\\"_blank\\\" href=\\\"https://apim.docs.wso2.com/en/4.2.0/\\\">Docs</a>\\n\\t\\t                </li>\\n\\t\\t\\t\\t<li class=\\\"middle\\\">|</li>\\n\\t\\t\\t\\t\\n\\t\\t                <li class=\\\"left\\\">\\n\\t\\t                    <a target=\\\"_blank\\\" href=\\\"../product/about.html\\\">About</a>\\n\\t\\t                </li>\\n\\t\\t            </ul>\\n\\t\\t</div>\\n        </div>\\n    </div>\\n\\n\\n        </td>\\n    </tr>\\n    <tr>\\n        <td class=\\\"vertical-menu-container\\\" id=\\\"vertical-menu-container\\\" style=\\\"display:none;\\\">\\n            <div id=\\\"menu-panel-button0\\\"></div>\\n            <div id=\\\"menu-panel-button1\\\" class=\\\"menu-panel-buttons\\\"></div>\\n            <div id=\\\"menu-panel-button2\\\" class=\\\"menu-panel-buttons\\\"></div>\\n            <div id=\\\"menu-panel-button3\\\" class=\\\"menu-panel-buttons\\\"></div>\\n            <div id=\\\"menu-panel-button4\\\" class=\\\"menu-panel-buttons\\\"></div>\\n            <div id=\\\"menu-panel-button5\\\" class=\\\"menu-panel-buttons\\\"></div>\\n            <div id=\\\"menu-panel-button_dummy\\\" style=\\\"display:none\\\"></div>\\n        </td>\\n        <td id=\\\"menu-panel\\\" valign=\\\"top\\\">\\n            <table id=\\\"menu-table\\\" border=\\\"0\\\" cellspacing=\\\"0\\\">\\n                <tr>\\n                    <td id=\\\"region1\\\">\\n\\n\\n\\n\\n\\n\\n\\n\\n        <div id=\\\"menu\\\"> <ul class=\\\"main\\\"><li><a href=\\\"../admin/index.jsp\\\" class=\\\"menu-home\\\">Home</a></li> </ul></div>\\n\\n\\n</td>\\n                </tr>\\n                <tr>\\n                    <td id=\\\"region2\\\">\\n\\n\\n\\n        <div id=\\\"menu\\\"> <ul class=\\\"main\\\"> </ul></div>\\n</td>\\n                </tr>\\n                <tr>\\n                    <td id=\\\"region3\\\">\\n\\n\\n\\n        <div id=\\\"menu\\\"> <ul class=\\\"main\\\"> </ul></div>\\n\\n</td>\\n                </tr>\\n                <tr>\\n                    <td id=\\\"region4\\\">\\n\\n\\n\\n        <div id=\\\"menu\\\"> <ul class=\\\"main\\\"> </ul></div>\\n\\n</td>\\n                </tr>\\n                <tr>\\n                    <td id=\\\"region5\\\">\\n\\n\\n\\n        <div id=\\\"menu\\\"> <ul class=\\\"main\\\"> </ul></div>\\n</td>\\n                </tr>\\n                <tr>\\n                    <td><img src=\\\"../admin/images/1px.gif\\\" width=\\\"225px\\\" height=\\\"1px\\\"/></td>\\n                </tr>\\n            </table>\\n        </td>\\n        <td id=\\\"middle-content\\\">\\n            <table id=\\\"content-table\\\" border=\\\"0\\\" cellspacing=\\\"0\\\">\\n                <tr>\\n                    <td id=\\\"page-header-links\\\">\\n\\n\\n\\n\\n\\n\\t<table class=\\\"page-header-links-table\\\" cellspacing=\\\"0\\\">\\n\\t\\t<tr>\\n\\t\\t\\t<td class=\\\"breadcrumbs\\\">\\n\\t\\t\\t<table class=\\\"breadcrumb-table\\\" cellspacing=\\\"0\\\">\\n\\t\\t\\t\\t<tr>\\t\\t\\t\\t\\t\\t\\t\\t \\n\\t\\t\\t\\t    <td>\\n\\t\\t\\t\\t\\t    <div id=\\\"breadcrumb-div\\\"></div>\\n                    </td>\\n\\t\\t\\t\\t</tr>\\n\\n\\t\\t\\t</table>\\n\\t\\t\\t</td>\\n\\n\\t\\t\\t<td class=\\\"page-header-help\\\"><a href=\\\"./docs/userguide.html\\\"\\n\\t\\t\\t\\ttarget=\\\"_blank\\\">Help</a></td>\\n\\n\\t\\t</tr>\\n\\t</table>\\n</td>\\n                </tr>\\n                <tr>\\n                    <td id=\\\"body\\\">\\n                        <img src=\\\"../admin/images/1px.gif\\\" width=\\\"735px\\\" height=\\\"1px\\\"/>\\n                        \\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n<script type=\\\"text/javascript\\\">\\n    var msgId;\\n    \\n    msgId = \'MSG17807457185550.25458357113770425\';\\n    \\n</script>\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n     <script type=\\\"text/javascript\\\">\\n\\n        function doValidation() {\\n            var reason = \\\"\\\";\\n\\n            var userNameEmpty = isEmptyCheckWithoutTrim(\\\"username\\\");\\n            var passwordEmpty = isEmptyCheckWithoutTrim(\\\"password\\\");\\n\\n            if (userNameEmpty || passwordEmpty) {\\n                CARBON.showWarningDialog(\'Please enter a valid user name and a password.\');\\n                document.getElementById(\'txtUserName\').focus();\\n                return false;\\n            }\\n\\n            return true;\\n        }\\n\\n    </script>\\n\\n    \\n     <script type=\\\"text/javascript\\\">\\n    \\tfunction getSafeText(text){\\n    \\t\\ttext = text.replace(/</g,\'&lt;\');\\n    \\t\\treturn text.replace(/>/g,\'&gt\');\\n    \\t}\\n    \\n        function checkInputs(){\\n        \\tvar loginForm = document.getElementById(\'loginForm\');\\n        \\tvar backendUrl = document.getElementById(\\\"txtbackendURL\\\");\\n        \\tvar username = document.getElementById(\\\"txtUserName\\\");\\n        \\t\\n        \\tbackendUrl.value = getSafeText(backendUrl.value);\\n        \\tusername.value = getSafeText(username.value);\\n        \\tloginForm.submit();\\n        }\\n    </script>\\n    <div id=\\\"middle\\\">\\n        <table cellspacing=\\\"0\\\" width=\\\"100%\\\">\\n            <tr>\\n                <td>\\n                    <div id=\\\"features\\\">\\n                        <table cellspacing=\\\"0\\\">\\n                            <tr class=\\\"feature feature-top\\\">\\n                                <td>\\n                                    <a target=\\\"_blank\\\" href=\\\"https://apim.docs.wso2.com/en/4.2.0/\\\" rel=\\\"noopener noreferrer\\\"><img\\n                                            src=\\\"../admin/images/user-guide.gif\\\"/></a>\\n                                </td>\\n                                <td>\\n                                    <h3><a target=\\\"_blank\\\" href=\\\"https://apim.docs.wso2.com/en/4.2.0/\\\"\\n                                           rel=\\\"noopener noreferrer\\\">User Guide</a>\\n                                    </h3>\\n\\n                                    <p>WSO2 Carbon user guide.</p>\\n                                </td>\\n                            </tr>\\n                            <tr class=\\\"feature\\\">\\n                                <td>\\n                                    <a target=\\\"_blank\\\" href=\\\"https://wso2.com/community\\\" rel=\\\"noopener noreferrer\\\"><img\\n                                            src=\\\"../admin/images/forum.gif\\\"/></a>\\n                                </td>\\n                                <td>\\n                                    <h3><a target=\\\"_blank\\\" href=\\\"https://wso2.com/community\\\"\\n                                           rel=\\\"noopener noreferrer\\\">Community</a>\\n                                    </h3>\\n\\n                                    <p>To foster a healthy community through open collaboration and feedback to help each developer and teams.</p>\\n                                </td>\\n                            </tr>\\n                            <tr class=\\\"feature\\\">\\n                                <td>\\n                                    <a target=\\\"_blank\\\"\\n                                       href=\\\"https://github.com/wso2/api-manager/issues\\\" rel=\\\"noopener noreferrer\\\"><img\\n                                            src=\\\"../admin/images/issue-tracker.gif\\\"/></a>\\n                                </td>\\n                                <td>\\n                                    <h3><a target=\\\"_blank\\\"\\n                                           href=\\\"https://github.com/wso2/api-manager/issues\\\" rel=\\\"noopener noreferrer\\\">\\n                                        Issue Tracker</a></h3>\\n\\n                                    <p>Users are encouraged to report issues & suggest improvements using the issue tracker. In addition, users can observe the status of the reported issues in progress.</p>\\n\\n                                </td>\\n                            </tr>\\n                        </table>\\n                    </div>\\n                </td>\\n                <td width=\\\"20%\\\">\\n                    <div id=\\\"loginbox\\\">\\n                        <h2>Sign-in</h2>\\n\\n                        <form action=\'../admin/login_action.jsp\' method=\\\"POST\\\" onsubmit=\\\"return doValidation();\\\" target=\\\"_self\\\" onsubmit=\\\"checkInputs()\\\">\\n                            <table>\\n                                 \\n                                <tr>\\n                                    <td>\\n                                        <label for=\\\"txtUserName\\\">Username</label>\\n                                    </td>\\n                                    <td>\\n                                        <input type=\\\"text\\\" id=\\\"txtUserName\\\" name=\\\"username\\\"\\n                                               class=\\\"user\\\" tabindex=\\\"1\\\"  autocomplete=\\\"off\\\" />\\n                                    </td>\\n                                </tr>\\n                                <tr>\\n                                    <td>\\n                                        <label for=\\\"txtPassword\\\">Password</label>\\n                                    </td>\\n                                    <td>\\n                                        <input type=\\\"password\\\" id=\\\"txtPassword\\\" name=\\\"password\\\"\\n                                               class=\\\"password\\\" tabindex=\\\"2\\\"  autocomplete=\\\"off\\\"/>\\n                                    </td>\\n                                </tr>\\n                                <tr>\\n                                    <td>\\n                                        \\n                                    </td>\\n                                    <td>\\n                                    \\t<input type=\\\"checkbox\\\" name=\\\"rememberMe\\\" \\n                                        \\t\\t\\t\\tvalue=\\\"rememberMe\\\" tabindex=\\\"3\\\"/>\\n                                        <label for=\\\"txtRememberMe\\\">Remember Me</label>\\n                                    </td>\\n                                </tr>\\n                                <tr>\\n                                    <td>&nbsp;</td>\\n                                    <td>\\n                                        <input type=\\\"submit\\\" value=\\\"Sign-in\\\"\\n                                               class=\\\"button\\\" tabindex=\\\"3\\\"/>\\n                                    </td>\\n                                </tr>\\n                            </table>\\n                        </form>\\n                        <br/>\\n\\t\\t\\t            <a target=\\\"_blank\\\" href=\\\"../docs/signin_userguide.html\\\" tabindex=\\\"4\\\">\\n                            Sign-in Help\\n                        </a>\\n                    </div>\\n                </td>\\n            </tr>\\n        </table>\\n    </div>\\n    <script type=\\\"text/javascript\\\">\\n        function init(loginStatus) {\\n            // intialize the code and call to the back end\\n            /*wso2.wsf.Util.initURLs();*/\\n            /*Initialize the XSLT cache*/\\n            /*wso2.wsf.XSLTHelper.init();*/\\n\\n            if (loginStatus == \'true\') {\\n            } else if (loginStatus == \'null\') {\\n            } else if (loginStatus == \'false\') {\\n                wso2.wsf.Util.alertWarning(\\\"Login failed. Please recheck the user name and password and try again\\\")\\n            } \\n        }\\n        document.getElementById(\'txtUserName\').focus();\\n    </script>\\n\\n\\n\\n                    </td>\\n                </tr>\\n            </table>\\n        </td>\\n    </tr>\\n    <tr>\\n        <td id=\\\"footer\\\" colspan=\\\"3\\\">\\n\\n<div id=\\\"footer-div\\\">\\n\\t<div class=\\\"footer-content\\\">\\n\\t\\t<div class=\\\"copyright\\\">\\n\\t\\t    &copy; <script>document.write(new Date().getFullYear());</script> WSO2 LLC. All Rights Reserved.\\n\\t\\t</div>\\n\\t\\t<!--div class=\\\"poweredby\\\">\\n\\t\\t</div-->\\n\\t</div>\\n</div>\\n                        \\n</td>\\n    </tr>\\n</table>\\n<script type=\\\"text/javascript\\\">\\nif (Function(\'/*@cc_on return document.documentMode===10@*/\')()){\\n    document.documentElement.className+=\' ie10\';\\n}\\n</script>\\n</body>\\n</html>\\n\\n\"', '2026-06-06 14:35:18.000', '2026-06-07 23:38:18.000'),
('01KTEBXQEZG8B7TWM5N8YB2W3M', NULL, NULL, '0790590653', '1.00', 'KCB-211100', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, 'KCB Gateway returned an error page (HTML). Please check API subscriptions.', NULL, '2026-06-06 14:43:34.000', '2026-06-07 23:38:18.000'),
('01KTEC4KXE89EGVSCDW1YSQAVW', NULL, NULL, '0790590653', '2.00', 'KCB-435812', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, 'KCB Gateway returned an error page (HTML). Please check API subscriptions.', NULL, '2026-06-06 14:47:20.000', '2026-06-07 23:38:18.000'),
('01KTEDW5PDWPY6KZWCHEHYW66W', NULL, NULL, '0790590653', '4.00', 'KCB-257921', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, 'Runtime Error', NULL, '2026-06-06 15:17:41.000', '2026-06-07 23:38:18.000'),
('01KTEEANZXRVR4BYB4FAFN89JG', NULL, NULL, '0790590653', '5.00', 'KCB-733451', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, 'Runtime Error', NULL, '2026-06-06 15:25:36.000', '2026-06-07 23:38:18.000'),
('01KTEEJQX52SXGM1CFYJ70G3P0', NULL, NULL, '0790590653', '5.00', 'KCB-999073', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, 'Runtime Error', NULL, '2026-06-06 15:30:00.000', '2026-06-07 23:38:18.000'),
('01KTEFA35XVA3F5P25GT3T5JYC', NULL, NULL, '0790590653', '1.00', 'KCB-761206', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, 'Runtime Error', NULL, '2026-06-06 15:42:45.000', '2026-06-07 23:38:18.000'),
('01KTEFN0SD35RGZ9PMMTBB8PFC', NULL, NULL, '0790590653', '1.00', 'KCB-119674', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, 'Runtime Error', NULL, '2026-06-06 15:48:43.000', '2026-06-07 23:38:18.000'),
('01KTEG4S2SYM8BGCYJ8P7M3WH0', NULL, NULL, '0790590653', '1.00', 'KCB-631638', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, 'Runtime Error', NULL, '2026-06-06 15:57:20.000', '2026-06-07 23:38:18.000'),
('01KTEGE6W95CVWSJYHJ7ZGKATD', NULL, NULL, '0790590653', '2.00', 'KCB-946813', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, 'Runtime Error', NULL, '2026-06-06 16:02:29.000', '2026-06-07 23:38:18.000'),
('01KTEGMQT6SJD9660AMV9TKKSS', NULL, NULL, '0790590653', '1.00', 'KCB-149792', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, '[404] Runtime Error', NULL, '2026-06-06 16:06:03.000', '2026-06-07 23:38:18.000'),
('01KTEJ08QDQX49AC5SB28XVPSB', NULL, NULL, '0790590653', '1.00', 'KCB-587005', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, '[ERR] amount is not defined', NULL, '2026-06-06 16:29:49.000', '2026-06-07 23:38:18.000'),
('01KTEJ3GYSB6MY3D83TZBV4NP8', NULL, NULL, '0790590653', '1.00', 'KCB-694636', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, '[ERR] amount is not defined', NULL, '2026-06-06 16:31:36.000', '2026-06-07 23:38:18.000'),
('01KTEJ46CBZRW54FGBRMB6NH3B', NULL, NULL, '0790590653', '1.00', 'KCB-717043', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, '[500] Request failed with status code 500', NULL, '2026-06-06 16:31:58.000', '2026-06-07 23:38:18.000'),
('01KTEJ4MRF9TF5JZ01KZVPS730', NULL, NULL, '0790590653', '1.00', 'KCB-731671', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, NULL, '[500] Runtime Error', NULL, '2026-06-06 16:32:12.000', '2026-06-07 23:38:18.000'),
('01KTEJMP95BB6ED2WGMDBDMM6R', '3dbc-450c-a895-2387f154a65a96100', '01KTEJMP95GBPTG5MGYNX7V3S0', '254790590653', '2.00', 'KCB-255806', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 2, NULL, NULL, '{\"header\":{\"statusCode\":\"0\",\"statusDescription\":\"Success. Request accepted for processing\"},\"response\":{\"MerchantRequestID\":\"3dbc-450c-a895-2387f154a65a96100\",\"ResponseCode\":\"0\",\"CustomerMessage\":\"Success. Request accepted for processing\",\"CheckoutRequestID\":\"ws_CO_06062026164058377790590653\",\"ResponseDescription\":\"Success. Request accepted for processing\"}}', '2026-06-06 16:40:58.000', '2026-06-07 23:38:18.000'),
('01KTEJPVKTCQMPGTY1B3ARMXZR', '22fb-4ea6-8ef0-321f9f4be3da52904', '01KTEJPVKTYWKFXM7YR64N30VW', '254790590653', '2.00', 'KCB-328499', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 2, NULL, NULL, '{\"header\":{\"statusCode\":\"0\",\"statusDescription\":\"Success. Request accepted for processing\"},\"response\":{\"MerchantRequestID\":\"22fb-4ea6-8ef0-321f9f4be3da52904\",\"ResponseCode\":\"0\",\"CustomerMessage\":\"Success. Request accepted for processing\",\"CheckoutRequestID\":\"ws_CO_06062026164209338790590653\",\"ResponseDescription\":\"Success. Request accepted for processing\"}}', '2026-06-06 16:42:09.000', '2026-06-07 23:38:18.000'),
('01KTEMHEKXAFCY1KN7E3XW9NSW', '62be-4520-b958-62f8dfa934cf27', '01KTEMHEKXF23VN1XQVF7GHFZE', '254790590653', '1.00', 'KCB-246968', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 2, NULL, NULL, '{\"header\":{\"statusCode\":\"0\",\"statusDescription\":\"Success. Request accepted for processing\"},\"response\":{\"MerchantRequestID\":\"62be-4520-b958-62f8dfa934cf27\",\"ResponseCode\":\"0\",\"CustomerMessage\":\"Success. Request accepted for processing\",\"CheckoutRequestID\":\"ws_CO_06062026171409283790590653\",\"ResponseDescription\":\"Success. Request accepted for processing\"}}', '2026-06-06 17:14:09.000', '2026-06-07 23:38:18.000'),
('01KTEN97WJ7RB56J6VTE8H0WAB', '62be-4520-b958-62f8dfa934cf218', '01KTEN97WCMEETE1HMR0FANK4N', '254790590653', '1.00', 'KCB-027348', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 2, NULL, NULL, '{\"header\":{\"statusCode\":\"0\",\"statusDescription\":\"Success. Request accepted for processing\"},\"response\":{\"MerchantRequestID\":\"62be-4520-b958-62f8dfa934cf218\",\"ResponseCode\":\"0\",\"CustomerMessage\":\"Success. Request accepted for processing\",\"CheckoutRequestID\":\"ws_CO_06062026172708885790590653\",\"ResponseDescription\":\"Success. Request accepted for processing\"}}', '2026-06-06 17:27:09.000', '2026-06-07 23:38:18.000'),
('01KTENQ4AXGYK6R7AP8EV3ASFS', 'a71a-483d-be2d-b5dd69df628b380', '01KTENQ4AXQJQ3TF15E2VGKV3J', '254790590653', '1.00', 'KCB-481705', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 2, NULL, NULL, '{\"header\":{\"statusCode\":\"0\",\"statusDescription\":\"Success. Request accepted for processing\"},\"response\":{\"MerchantRequestID\":\"a71a-483d-be2d-b5dd69df628b380\",\"ResponseCode\":\"0\",\"CustomerMessage\":\"Success. Request accepted for processing\",\"CheckoutRequestID\":\"ws_CO_06062026173443920790590653\",\"ResponseDescription\":\"Success. Request accepted for processing\"}}', '2026-06-06 17:34:44.000', '2026-06-07 23:38:18.000'),
('01KTENSA2YBF76HZA3GNK9D4NY', 'a71a-483d-be2d-b5dd69df628b404', '01KTENSA2YNQND0150EBV6T7P4', '254790590653', '1.00', 'KCB-553967', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 2, NULL, NULL, '{\"header\":{\"statusCode\":\"0\",\"statusDescription\":\"Success. Request accepted for processing\"},\"response\":{\"MerchantRequestID\":\"a71a-483d-be2d-b5dd69df628b404\",\"ResponseCode\":\"0\",\"CustomerMessage\":\"Success. Request accepted for processing\",\"CheckoutRequestID\":\"ws_CO_06062026173555394790590653\",\"ResponseDescription\":\"Success. Request accepted for processing\"}}', '2026-06-06 17:35:55.000', '2026-06-07 23:38:18.000'),
('01KTEPFEFWBPYV54GERH9G69XM', '22fb-4ea6-8ef0-321f9f4be3da55153', '01KTEPFEFNJ21E2RRKNFJDYRFR', '254790590653', '1.00', 'KCB-272933', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 2, NULL, NULL, '{\"header\":{\"statusCode\":\"0\",\"statusDescription\":\"Success. Request accepted for processing\"},\"response\":{\"MerchantRequestID\":\"22fb-4ea6-8ef0-321f9f4be3da55153\",\"ResponseCode\":\"0\",\"CustomerMessage\":\"Success. Request accepted for processing\",\"CheckoutRequestID\":\"ws_CO_06062026174800793790590653\",\"ResponseDescription\":\"Success. Request accepted for processing\"}}', '2026-06-06 17:48:01.000', '2026-06-07 23:38:18.000'),
('01KTEQC3GRHBKWK591MDZ5NGTB', 'a71a-483d-be2d-b5dd69df628b987', '01KTEQC3GR185FV9F2BBTJKCE1', '254790590653', '1.00', 'KCB-218655', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 2, NULL, NULL, '{\"header\":{\"statusCode\":\"0\",\"statusDescription\":\"Success. Request accepted for processing\"},\"response\":{\"MerchantRequestID\":\"a71a-483d-be2d-b5dd69df628b987\",\"ResponseCode\":\"0\",\"CustomerMessage\":\"Success. Request accepted for processing\",\"CheckoutRequestID\":\"ws_CO_06062026180339859790590653\",\"ResponseDescription\":\"Success. Request accepted for processing\"}}', '2026-06-06 18:03:40.000', '2026-06-07 23:38:18.000'),
('01KTEQMBY4M8ATTV7RB0TZG4X6', 'a71a-483d-be2d-b5dd69df628b1068', '01KTEQMBXVVG6QKAB9H69DECB0', '254790590653', '1.00', 'KCB-486898', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 2, NULL, NULL, '{\"header\":{\"statusCode\":\"0\",\"statusDescription\":\"Success. Request accepted for processing\"},\"response\":{\"MerchantRequestID\":\"a71a-483d-be2d-b5dd69df628b1068\",\"ResponseCode\":\"0\",\"CustomerMessage\":\"Success. Request accepted for processing\",\"CheckoutRequestID\":\"ws_CO_06062026180810422790590653\",\"ResponseDescription\":\"Success. Request accepted for processing\"}}', '2026-06-06 18:08:11.000', '2026-06-07 23:38:18.000'),
('01KTER5B1RW9KM0FJRZ2E7PV7S', '22fb-4ea6-8ef0-321f9f4be3da55740', '01KTER5AZXNZXZEY56PRH4D7PG', '254790590653', '1.00', 'KCB-044224', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 2, NULL, NULL, '{\"header\":{\"statusCode\":\"0\",\"statusDescription\":\"Success. Request accepted for processing\"},\"response\":{\"MerchantRequestID\":\"22fb-4ea6-8ef0-321f9f4be3da55740\",\"ResponseCode\":\"0\",\"CustomerMessage\":\"Success. Request accepted for processing\",\"CheckoutRequestID\":\"ws_CO_06062026181726537790590653\",\"ResponseDescription\":\"Success. Request accepted for processing\"}}', '2026-06-06 18:17:27.000', '2026-06-07 23:38:18.000'),
('01KTERKG0S0M6V76R9TW0W4XXV', '3bbc-4bca-9342-a9e5d35e4291892', 'ws_CO_06062026182510608790590653', '254790590653', '1.00', 'KCB-507559', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 3, '1032', 'Request Cancelled by user.', '{\"Body\":{\"stkCallback\":{\"MerchantRequestID\":\"3bbc-4bca-9342-a9e5d35e4291892\",\"CheckoutRequestID\":\"ws_CO_06062026182510608790590653\",\"ResultCode\":1032,\"ResultDesc\":\"Request Cancelled by user.\"}}}', '2026-06-06 18:25:11.000', '2026-06-07 23:38:18.000'),
('01KTERM6D95J7NR97C2M5GGVED', '3bbc-4bca-9342-a9e5d35e4291896', 'ws_CO_06062026182533542790590653', '254790590653', '1.00', 'KCB-531688', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, '0', 'The service request is processed successfully.', '{\"Body\":{\"stkCallback\":{\"MerchantRequestID\":\"3bbc-4bca-9342-a9e5d35e4291896\",\"CheckoutRequestID\":\"ws_CO_06062026182533542790590653\",\"ResultCode\":0,\"ResultDesc\":\"The service request is processed successfully.\",\"CallbackMetadata\":{\"Item\":[{\"Name\":\"Amount\",\"Value\":1},{\"Name\":\"MpesaReceiptNumber\",\"Value\":\"UF6LR6G0BB\"},{\"Name\":\"Balance\"},{\"Name\":\"TransactionDate\",\"Value\":20260606182542},{\"Name\":\"PhoneNumber\",\"Value\":254790590653}]}}}}', '2026-06-06 18:25:33.000', '2026-06-07 23:38:18.000'),
('01KTERN64N76MA07P8TMTKC1NY', '62be-4520-b958-62f8dfa934cf1030', 'ws_CO_06062026182605989790590653', '254790590653', '1.00', 'KCB-563464', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 3, '1032', 'Request Cancelled by user.', '{\"Body\":{\"stkCallback\":{\"MerchantRequestID\":\"62be-4520-b958-62f8dfa934cf1030\",\"CheckoutRequestID\":\"ws_CO_06062026182605989790590653\",\"ResultCode\":1032,\"ResultDesc\":\"Request Cancelled by user.\"}}}', '2026-06-06 18:26:06.000', '2026-06-07 23:38:18.000'),
('01KTETF7ZQA0D1C9R989HTF5ZP', '3bbc-4bca-9342-a9e5d35e42911346', 'ws_CO_06062026185748443790590653', '254790590653', '1.00', 'KCB-466371', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, '1037', 'No response from user.', '{\"Body\":{\"stkCallback\":{\"MerchantRequestID\":\"3bbc-4bca-9342-a9e5d35e42911346\",\"CheckoutRequestID\":\"ws_CO_06062026185748443790590653\",\"ResultCode\":1037,\"ResultDesc\":\"No response from user.\"}}}', '2026-06-06 18:57:48.000', '2026-06-07 23:38:18.000'),
('01KTETGEQ1DY40TWHWAWMH8594', '3dbc-450c-a895-2387f154a65a99260', 'ws_CO_06062026185828119790590653', '254790590653', '1.00', 'KCB-506756', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, '1037', 'DS timeout user cannot be reached.', '{\"Body\":{\"stkCallback\":{\"MerchantRequestID\":\"3dbc-450c-a895-2387f154a65a99260\",\"CheckoutRequestID\":\"ws_CO_06062026185828119790590653\",\"ResultCode\":1037,\"ResultDesc\":\"DS timeout user cannot be reached.\"}}}', '2026-06-06 18:58:28.000', '2026-06-07 23:38:18.000'),
('01KTETGVF673K5D2Q7XM2Z37GV', '3bbc-4bca-9342-a9e5d35e42911352', 'ws_CO_06062026185841175790590653', '254790590653', '1.00', 'KCB-520505', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 4, '1037', 'DS timeout user cannot be reached.', '{\"Body\":{\"stkCallback\":{\"MerchantRequestID\":\"3bbc-4bca-9342-a9e5d35e42911352\",\"CheckoutRequestID\":\"ws_CO_06062026185841175790590653\",\"ResultCode\":1037,\"ResultDesc\":\"DS timeout user cannot be reached.\"}}}', '2026-06-06 18:58:41.000', '2026-06-07 23:38:18.000'),
('01KTHVKXTKSEWASKEM9MK7BV8P', 'ccd7-4fe9-bc96-e44f686713d8932', 'ws_CO_07062026231533752790590653', '254790590653', '1.00', 'KCB-329960', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, '0', 'The service request is processed successfully.', '{\"Body\":{\"stkCallback\":{\"MerchantRequestID\":\"ccd7-4fe9-bc96-e44f686713d8932\",\"CheckoutRequestID\":\"ws_CO_07062026231533752790590653\",\"ResultCode\":0,\"ResultDesc\":\"The service request is processed successfully.\",\"CallbackMetadata\":{\"Item\":[{\"Name\":\"Amount\",\"Value\":1},{\"Name\":\"MpesaReceiptNumber\",\"Value\":\"UF7LR6LAVO\"},{\"Name\":\"Balance\"},{\"Name\":\"TransactionDate\",\"Value\":20260607231548},{\"Name\":\"PhoneNumber\",\"Value\":254790590653}]}}}}', '2026-06-07 23:15:34.000', '2026-06-07 23:38:18.000'),
('01KTKGVCCK33732X3378Y1XYM1', 'c5a4-4eca-82c9-fa8306549c6a40496', 'ws_CO_08062026144553159790590653', '254790590653', '3.00', 'KCB-150642', 'Walk-in Customer', 'Staff', 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 2, NULL, NULL, '{\"header\":{\"statusCode\":\"0\",\"statusDescription\":\"Success. Request accepted for processing\"},\"response\":{\"MerchantRequestID\":\"c5a4-4eca-82c9-fa8306549c6a40496\",\"ResponseCode\":\"0\",\"CustomerMessage\":\"Success. Request accepted for processing\",\"CheckoutRequestID\":\"ws_CO_08062026144553159790590653\",\"ResponseDescription\":\"Success. Request accepted for processing\"}}', '2026-06-08 14:45:53.000', '2026-06-08 14:45:53.000');
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `mpesalog`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `mpesalog` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `merchantRequestId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkoutRequestId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `reference` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `initiatorName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenantName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` tinyint DEFAULT NULL COMMENT '0: INITIATION, 1: CALLBACK, 2: QUERY',
  `isRented` tinyint DEFAULT '0',
  `status` tinyint DEFAULT NULL COMMENT '0: SUCCESS, 1: FAILED, 2: PENDING, 3: CANCELLED, 4: ERROR',
  `resultCode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resultDesc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rawPayload` json DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_checkout` (`checkoutRequestId`),
  KEY `idx_reference` (`reference`),
  KEY `idx_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `mpesalog` (`id`, `merchantRequestId`, `checkoutRequestId`, `phone`, `amount`, `reference`, `customerName`, `initiatorName`, `tenantName`, `tenantId`, `type`, `isRented`, `status`, `resultCode`, `resultDesc`, `rawPayload`, `createdAt`, `updatedAt`) VALUES 
('01KS85WM409MSGBSC9H96693X3', '5e15-479f-b07c-60ab750b107d115', 'ws_CO_22052026184658403790590653', '254790590653', '9450.00', 'SUB-UPG-NQHF2K-7269', NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-05-22 17:46:58.000', '2026-05-22 17:46:58.000'),
('01KS85XFDSVYQQEVZCEHGN5XS6', '5e15-479f-b07c-60ab750b107d115', 'ws_CO_22052026184658403790590653', NULL, NULL, NULL, NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 1, '1037', 'No response from user.', NULL, '2026-05-22 17:47:26.000', '2026-05-22 17:47:26.000'),
('01KSFNW1SFR34XYXRTPZYSVADF', NULL, 'ws_TEST_123', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0, 0, '0', 'Fake Success', NULL, '2026-05-25 15:40:58.000', '2026-05-25 15:40:58.000'),
('01KSFP5A4V950M12Q3HAF0B2X3', NULL, 'ws_TEST_123', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0, 0, '0', 'Fake Success', NULL, '2026-05-25 15:46:01.000', '2026-05-25 15:46:01.000'),
('01KSFPVPTXF0BVQWMT3J44711Q', NULL, 'ws_TEST_123', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0, 0, '0', 'Fake Success', NULL, '2026-05-25 15:58:15.000', '2026-05-25 15:58:15.000'),
('01KSFPYV71AQJJ85GF3ERWEVSX', NULL, 'ws_TEST_123', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0, 0, '0', 'Fake Success', NULL, '2026-05-25 15:59:58.000', '2026-05-25 15:59:58.000'),
('01KSFQ0RGJPXD0AHWNC535WD0N', NULL, 'ws_TEST_123', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0, 0, '0', 'Fake Success', NULL, '2026-05-25 16:01:01.000', '2026-05-25 16:01:01.000'),
('01KSFQ4Y6Y0SQ5Z4KBQGAWJB68', NULL, 'ws_TEST_123', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0, 0, '0', 'Fake Success', NULL, '2026-05-25 16:03:18.000', '2026-05-25 16:03:18.000'),
('01KSFW4H1E7AR4S4AQJTR2DCRQ', NULL, 'ws_TEST_123', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0, 0, '0', 'Fake Success', NULL, '2026-05-25 17:30:27.000', '2026-05-25 17:30:27.000'),
('01KSNH80AH85YHS9QJAN7FNF17', '9b6f-4ec3-9ce8-d381c0aa1725703971', 'ws_CO_27052026231533423113842534', '254113842534', '60.00', 'SALE-931554', 'Walk-in Customer', 'Calvin', 'Business', '01KSF85279ETEV8T615JSET95G', 0, 0, 2, NULL, NULL, NULL, '2026-05-27 22:15:33.000', '2026-05-27 22:15:33.000'),
('01KSNH8SNDX8T1ACEQA0QT32MS', '9b6f-4ec3-9ce8-d381c0aa1725703971', 'ws_CO_27052026231533423113842534', NULL, NULL, NULL, 'Walk-in Customer', 'Calvin', 'Business', '01KSF85279ETEV8T615JSET95G', 1, 0, 1, '1037', 'No response from user.', NULL, '2026-05-27 22:15:59.000', '2026-05-27 22:15:59.000'),
('01KSNJG0VQ8F5R8XQTXM12GQKF', '1719-4a5e-8b09-a9014a656ab81745027', 'ws_CO_27052026233724469113842534', '254113842534', '16999.00', 'SUB-REN-SET95G-3867', 'Calvin', 'Calvin', 'Cal\'s retail', '01KSF85279ETEV8T615JSET95G', 0, 0, 2, NULL, NULL, NULL, '2026-05-27 22:37:24.000', '2026-05-27 22:37:24.000'),
('01KSNJGDE1GXQZF8B60TGHF2W6', '1719-4a5e-8b09-a9014a656ab81745027', 'ws_CO_27052026233724469113842534', NULL, NULL, NULL, 'Calvin', 'Calvin', 'Cal\'s retail', '01KSF85279ETEV8T615JSET95G', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-05-27 22:37:37.000', '2026-05-27 22:37:37.000'),
('01KSW4ZDBBB96YAY9H1N3Y65K8', 'a09d-4e35-9559-b4c85f643ac818818', 'ws_CO_30052026125549920723247405', '254723247405', '105.00', 'SALE-947832', 'Walk-in Customer', 'Calvin', 'Business', '01KSF85279ETEV8T615JSET95G', 0, 0, 2, NULL, NULL, NULL, '2026-05-30 11:55:50.000', '2026-05-30 11:55:50.000'),
('01KSW4ZEH97PP8AZB66KWE05HX', 'a09d-4e35-9559-b4c85f643ac818818', 'ws_CO_30052026125549920723247405', NULL, NULL, NULL, 'Walk-in Customer', 'Calvin', 'Business', '01KSF85279ETEV8T615JSET95G', 1, 0, 1, '1037', 'DS timeout user cannot be reached.', NULL, '2026-05-30 11:55:51.000', '2026-05-30 11:55:51.000'),
('01KSW50EBP6S8TR4454QWEN7EJ', '5c90-402a-bdc0-51ad014a4dda21153', 'ws_CO_30052026125623765705038506', '254705038506', '105.00', 'SALE-981873', 'Walk-in Customer', 'Calvin', 'Business', '01KSF85279ETEV8T615JSET95G', 0, 0, 2, NULL, NULL, NULL, '2026-05-30 11:56:24.000', '2026-05-30 11:56:24.000'),
('01KSW50V0YRM50DZWAN0PJ5WPP', '5c90-402a-bdc0-51ad014a4dda21153', 'ws_CO_30052026125623765705038506', NULL, NULL, NULL, 'Walk-in Customer', 'Calvin', 'Business', '01KSF85279ETEV8T615JSET95G', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-05-30 11:56:37.000', '2026-05-30 11:56:37.000'),
('01KSZH7TV2BAFYJSXS2X5VNTKC', 'b353-41b2-8810-e7ebbec24fd34049376', 'ws_CO_31052026202751395790590653', '254790590653', '4450.00', 'SUB-REN-SWB9K5-0502', 'Okelo Lourine', 'Okelo Lourine', 'Chemist business ', '01KS55SQR6F4V0P9MXVBSWB9K5', 0, 0, 2, NULL, NULL, NULL, '2026-05-31 19:27:52.000', '2026-05-31 19:27:52.000'),
('01KSZH85Y1H7ST56A9A5V2ZTGP', 'b353-41b2-8810-e7ebbec24fd34049376', 'ws_CO_31052026202751395790590653', NULL, NULL, NULL, 'Okelo Lourine', 'Okelo Lourine', 'Chemist business ', '01KS55SQR6F4V0P9MXVBSWB9K5', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-05-31 19:28:03.000', '2026-05-31 19:28:03.000'),
('01KTE746JPNNYPDSFXVEMSTX4P', 'e919-49fc-a46e-1aed2df0fbfc24220834', 'ws_CO_06062026131943541790590653', '254790590653', '1.00', 'SALE-182498', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-06 13:19:44.000', '2026-06-06 13:19:44.000'),
('01KTE74JF3AD5GAHD9WRNCQ7FS', 'e919-49fc-a46e-1aed2df0fbfc24220834', 'ws_CO_06062026131943541790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-06-06 13:19:56.000', '2026-06-06 13:19:56.000'),
('01KTE972PXPM5T7ZF96HDRSTRP', '3dbc-450c-a895-2387f154a65a89059', 'ws_CO_06062026135615267790590653', '254790590653', '1.00', 'SALE-372238', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-06 13:56:15.000', '2026-06-06 13:56:15.000'),
('01KTE97M17KEQFNMC31MM6Z1XV', '3dbc-450c-a895-2387f154a65a89059', 'ws_CO_06062026135615267790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 0, '0', 'The service request is processed successfully.', NULL, '2026-06-06 13:56:33.000', '2026-06-06 13:56:33.000'),
('01KTE98MWM8SGGAX175Y6ZQMB2', '22fb-4ea6-8ef0-321f9f4be3da46073', 'ws_CO_06062026135706623790590653', '254790590653', '1.00', 'SALE-425177', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-06 13:57:06.000', '2026-06-06 13:57:06.000'),
('01KTE98XQMKBH6H3ZF0SSV3D92', '22fb-4ea6-8ef0-321f9f4be3da46073', 'ws_CO_06062026135706623790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-06-06 13:57:16.000', '2026-06-06 13:57:16.000'),
('01KTE996AHK8E0KCDKACRBYS0K', '3dbc-450c-a895-2387f154a65a89100', 'ws_CO_06062026135724505790590653', '254790590653', '1.00', 'SALE-443138', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-06 13:57:24.000', '2026-06-06 13:57:24.000'),
('01KTE99EV7HQPBGW9Y0M5V9W6T', '3dbc-450c-a895-2387f154a65a89100', 'ws_CO_06062026135724505790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 1, '2001', 'The initiator information is invalid.', NULL, '2026-06-06 13:57:33.000', '2026-06-06 13:57:33.000'),
('01KTEJ2H27PVMA73FWHYQJYN3H', '22fb-4ea6-8ef0-321f9f4be3da52510', 'ws_CO_06062026163103300790590653', '254790590653', '2.00', 'SALE-661705', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-06 16:31:03.000', '2026-06-06 16:31:03.000'),
('01KTEJ2WVR4EZ04ZCTK5FDRAK9', '22fb-4ea6-8ef0-321f9f4be3da52510', 'ws_CO_06062026163103300790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 0, '0', 'The service request is processed successfully.', NULL, '2026-06-06 16:31:15.000', '2026-06-06 16:31:15.000'),
('01KTEJCZ4X6K15WTCB1CBZ8GXC', '22fb-4ea6-8ef0-321f9f4be3da52730', 'ws_CO_06062026163645404790590653', '254790590653', '2.00', 'SALE-002474', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-06 16:36:45.000', '2026-06-06 16:36:45.000'),
('01KTEJDRD5GX8G3EKJDKADR23G', '22fb-4ea6-8ef0-321f9f4be3da52730', 'ws_CO_06062026163645404790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 1, '1037', 'No response from user.', NULL, '2026-06-06 16:37:11.000', '2026-06-06 16:37:11.000'),
('01KTEMFBB9CEHSC987Q41AZC1W', '22fb-4ea6-8ef0-321f9f4be3da54302', 'ws_CO_06062026171300506790590653', '254790590653', '1.00', 'SALE-177060', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-06 17:13:00.000', '2026-06-06 17:13:00.000'),
('01KTEMFMP6YGJ4Z8NZ48H2T0EF', '22fb-4ea6-8ef0-321f9f4be3da54302', 'ws_CO_06062026171300506790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-06-06 17:13:10.000', '2026-06-06 17:13:10.000'),
('01KTEV3BGKZZ7MFEC005YF8QQX', '3dbc-450c-a895-2387f154a65a99440', 'ws_CO_06062026190847563790590653', '254790590653', '1.00', 'SALE-126585', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-06 19:08:47.000', '2026-06-06 19:08:47.000'),
('01KTEV3W7KDN9HP4QM1XMM0S6F', '3dbc-450c-a895-2387f154a65a99440', 'ws_CO_06062026190847563790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 0, '0', 'The service request is processed successfully.', NULL, '2026-06-06 19:09:05.000', '2026-06-06 19:09:05.000'),
('01KTHTVPNHPNR6PJJ1DT2HWPK8', 'e919-49fc-a46e-1aed2df0fbfc26828572', 'ws_CO_07062026230219867790590653', '254790590653', '1.00', 'SALE-536424', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-07 23:02:20.000', '2026-06-07 23:02:20.000'),
('01KTHTZV5T65AECCPY9F52J6S4', '5314-4a6b-8fa8-9c95af3e68508649184', 'ws_CO_07062026230435453790590653', '254790590653', '1.00', 'SALE-673338', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-07 23:04:36.000', '2026-06-07 23:04:36.000'),
('01KTHTZZ2CZKR2F8GGJ8N91KGY', '5314-4a6b-8fa8-9c95af3e68508649184', 'ws_CO_07062026230435453790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 1, '1037', 'DS timeout user cannot be reached.', NULL, '2026-06-07 23:04:40.000', '2026-06-07 23:04:40.000'),
('01KTHV1DAZASK5FTRDBNCECG5C', '520a-4424-98f8-751278e7328417211906', 'ws_CO_07062026230526763790590653', '254790590653', '1.00', 'SALE-725804', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-07 23:05:27.000', '2026-06-07 23:05:27.000'),
('01KTHV1GTYCA0W68RWV3Z42EQE', '520a-4424-98f8-751278e7328417211906', 'ws_CO_07062026230526763790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 1, '1037', 'DS timeout user cannot be reached.', NULL, '2026-06-07 23:05:31.000', '2026-06-07 23:05:31.000'),
('01KTHV2W7MFCTQ0567CYWTJDX0', '734a-499f-8dca-249f6eca7b3f7168705', 'ws_CO_07062026230614373790590653', '254790590653', '1.00', 'SALE-773808', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-07 23:06:15.000', '2026-06-07 23:06:15.000'),
('01KTHV307GNHRJBCE9GZ3N58ME', '734a-499f-8dca-249f6eca7b3f7168705', 'ws_CO_07062026230614373790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 1, '1037', 'DS timeout user cannot be reached.', NULL, '2026-06-07 23:06:19.000', '2026-06-07 23:06:19.000'),
('01KTHVDP0HQG5C0Z1HJ0EQVR66', '5048-4770-a607-c51d4493b0f71979326', 'ws_CO_07062026231209019790590653', '254790590653', '1.00', 'SALE-127371', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-07 23:12:09.000', '2026-06-07 23:12:09.000'),
('01KTHVE6ZT3R52YBWC32P9Z4ZR', '5048-4770-a607-c51d4493b0f71979326', 'ws_CO_07062026231209019790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 0, '0', 'The service request is processed successfully.', NULL, '2026-06-07 23:12:27.000', '2026-06-07 23:12:27.000'),
('01KTHVKCMK1NCCRBKDCMJS6KVD', 'e919-49fc-a46e-1aed2df0fbfc26841754', 'ws_CO_07062026231515454790590653', '254790590653', '1.00', 'SALE-313984', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-07 23:15:16.000', '2026-06-07 23:15:16.000'),
('01KTHVKM0KQ7CMHFSB5T7SW2WA', 'e919-49fc-a46e-1aed2df0fbfc26841754', 'ws_CO_07062026231515454790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-06-07 23:15:24.000', '2026-06-07 23:15:24.000'),
('01KTK1S58YJGPCH6G7THP28WE5', 'ccd7-4fe9-bc96-e44f686713d814238', 'ws_CO_08062026102232051790590653', '254790590653', '96894.00', 'SUB-REN-NQHF2K-9802', NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-08 10:22:32.000', '2026-06-08 10:22:32.000'),
('01KTKDF5KQQK8Z72QBS168AE2P', NULL, NULL, '0790590653', '173390.00', 'SUB-REN-NQHF2K-6170', NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 4, NULL, 'Bad Request - Invalid BusinessShortCode', NULL, '2026-06-08 13:46:47.000', '2026-06-08 13:46:47.000'),
('01KTKDR5CESVH983FJ4C3XNW49', NULL, NULL, '0790590653', '16999.00', 'SUB-REN-NQHF2K-0886', NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 4, NULL, 'Bad Request - Invalid BusinessShortCode', NULL, '2026-06-08 13:51:41.000', '2026-06-08 13:51:41.000'),
('01KTKGWD1AZEYTG1M70E75AMC7', 'ccd7-4fe9-bc96-e44f686713d824232', 'ws_CO_08062026144626650790590653', '254790590653', '16999.00', 'SUB-REN-NQHF2K-4836', NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-08 14:46:27.000', '2026-06-08 14:46:27.000'),
('01KTKH7H52TH4T88FYCJ2H7KFG', NULL, NULL, '0790590653', '16999.00', 'SUB-REN-NQHF2K-0051', NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 4, NULL, 'Bad Request - Invalid BusinessShortCode', NULL, '2026-06-08 14:52:31.000', '2026-06-08 14:52:31.000'),
('01KTKHHBG2MJZ6H3R4KQJXE4JP', NULL, NULL, '0790590653', '16999.00', 'SUB-REN-NQHF2K-1805', NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 4, NULL, 'Bad Request - Invalid BusinessShortCode', NULL, '2026-06-08 14:57:53.000', '2026-06-08 14:57:53.000'),
('01KTKHKHGGRTT7R1Q0S0188KS8', 'ccd7-4fe9-bc96-e44f686713d824673', 'ws_CO_08062026145904870790590653', '254790590653', '173390.00', 'SUB-REN-NQHF2K-3093', NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-08 14:59:05.000', '2026-06-08 14:59:05.000'),
('01KTKJKS579JWTDWYWW7FHBZ48', 'd2e6-4a8d-8693-33fef9f5787618783384', 'ws_CO_08062026151640331790590653', '254790590653', '16999.00', 'SUB-REN-NQHF2K-9692', NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-08 15:16:41.000', '2026-06-08 15:16:41.000'),
('01KTKJMCNVHZPBE5V9M5ZKEJ8E', 'd2e6-4a8d-8693-33fef9f5787618783384', 'ws_CO_08062026151640331790590653', NULL, NULL, NULL, NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-06-08 15:17:01.000', '2026-06-08 15:17:01.000'),
('01KTKJZ7Z4WGJMMTFRAH9PNF7F', '81f9-4bac-8dc5-8f21f335ec1518069238', 'ws_CO_08062026152256074790590653', '254790590653', '173390.00', 'SUB-REN-NQHF2K-5500', NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-08 15:22:56.000', '2026-06-08 15:22:56.000'),
('01KTKJZQGJYGMHNNPEFJHJS4XS', '81f9-4bac-8dc5-8f21f335ec1518069238', 'ws_CO_08062026152256074790590653', NULL, NULL, NULL, NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-06-08 15:23:12.000', '2026-06-08 15:23:12.000'),
('01KTKK8268GM8BT4SBTS4CS219', '3113-4c67-a1bb-8b1b6b80492c1181018', 'ws_CO_08062026152745264790590653', '254790590653', '96894.00', 'SUB-UPG-NQHF2K-9757', NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-08 15:27:45.000', '2026-06-08 15:27:45.000'),
('01KTKK855ZBYJTMKWFWS1AE3XD', '3113-4c67-a1bb-8b1b6b80492c1181018', 'ws_CO_08062026152745264790590653', NULL, NULL, NULL, NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 1, '1037', 'DS timeout user cannot be reached.', NULL, '2026-06-08 15:27:48.000', '2026-06-08 15:27:48.000'),
('01KTKNPCB488P9FW1XGATXAPCK', '806e-402a-903b-348519712d1b2833388', 'ws_CO_08062026161031579790590653', '254790590653', '5.00', 'SALE-229554', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-08 16:10:32.000', '2026-06-08 16:10:32.000'),
('01KTKNPWGD6CT45JMF4KDHJWC8', '806e-402a-903b-348519712d1b2833388', 'ws_CO_08062026161031579790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 0, '0', 'The service request is processed successfully.', NULL, '2026-06-08 16:10:48.000', '2026-06-08 16:10:48.000'),
('01KTKREN7CY08TXRY90AFHZWJV', '9bcb-4967-b050-ff216cee2490559510', 'ws_CO_08062026165844385790590653', '254790590653', '173390.00', 'SUB-REN-NQHF2K-3298', NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 0, 2, NULL, NULL, NULL, '2026-06-08 16:58:44.000', '2026-06-08 16:58:44.000'),
('01KTKREXCX99JYW1VH8616WBYN', '9bcb-4967-b050-ff216cee2490559510', 'ws_CO_08062026165844385790590653', NULL, NULL, NULL, NULL, NULL, 'Mboga', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-06-08 16:58:53.000', '2026-06-08 16:58:53.000'),
('01KTNNSPGPXKJ60VZRQ84T5BEP', '40ce-4723-9419-22861b55a5da385886', 'ws_CO_09062026105048980790590653', '254790590653', '1.00', 'SALE-441693', 'Walk-in Customer', 'benjamin ayuago', 'Business', '01KTNJR5H4NWHMQQG47PZWT20C', 0, 1, 2, NULL, NULL, NULL, '2026-06-09 10:50:49.000', '2026-06-09 10:50:49.000'),
('01KTNNSZ6BMTSW2XYY3CSP3X6Z', '40ce-4723-9419-22861b55a5da385886', 'ws_CO_09062026105048980790590653', NULL, NULL, NULL, 'Walk-in Customer', 'benjamin ayuago', 'Business', '01KTNJR5H4NWHMQQG47PZWT20C', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-06-09 10:50:58.000', '2026-06-09 10:50:58.000'),
('01KTNNT8BX0S33XGTQYGS26CWK', 'd153-4a3a-8071-d7199796061017522995', 'ws_CO_09062026105107829790590653', '254790590653', '1.00', 'SALE-466739', 'Walk-in Customer', 'benjamin ayuago', 'Business', '01KTNJR5H4NWHMQQG47PZWT20C', 0, 1, 2, NULL, NULL, NULL, '2026-06-09 10:51:07.000', '2026-06-09 10:51:07.000'),
('01KTNNTP42E9XB9AH8JW6C0FXZ', 'd153-4a3a-8071-d7199796061017522995', 'ws_CO_09062026105107829790590653', NULL, NULL, NULL, 'Walk-in Customer', 'benjamin ayuago', 'Business', '01KTNJR5H4NWHMQQG47PZWT20C', 1, 0, 0, '0', 'The service request is processed successfully.', NULL, '2026-06-09 10:51:21.000', '2026-06-09 10:51:21.000'),
('01KTXV906CQ7B8ZZSRR773G17T', '841f-4ce9-b22a-2b769e70d305211459', 'ws_CO_12062026150029243790590653', '254790590653', '1.00', 'SALE-625688', 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 0, 1, 2, NULL, NULL, NULL, '2026-06-12 15:00:29.000', '2026-06-12 15:00:29.000'),
('01KTXV9XHS1RQRWX796JCV577M', '841f-4ce9-b22a-2b769e70d305211459', 'ws_CO_12062026150029243790590653', NULL, NULL, NULL, 'Walk-in Customer', 'Staff', 'Business', '01KS85BCYC9750FA7ZQZNQHF2K', 1, 0, 0, '0', 'The service request is processed successfully.', NULL, '2026-06-12 15:00:59.000', '2026-06-12 15:00:59.000'),
('01KVQHK4HWPEFYAVR399EYFP6T', 'ed7e-44c0-acd9-859ed7a00bc15485', 'ws_CO_22062026143130976712472336', '254712472336', '2000.00', 'SALE-888954', 'Walk-in Customer', 'doreen gatobu', 'Business', '01KVQH3VSA02FZHNP25R3YAH12', 0, 1, 2, NULL, NULL, NULL, '2026-06-22 14:31:31.000', '2026-06-22 14:31:31.000'),
('01KVQHK7PAPV87KTFSAV6BYV98', 'ed7e-44c0-acd9-859ed7a00bc15485', 'ws_CO_22062026143130976712472336', NULL, NULL, NULL, 'Walk-in Customer', 'doreen gatobu', 'Business', '01KVQH3VSA02FZHNP25R3YAH12', 1, 0, 1, '1037', 'DS timeout user cannot be reached.', NULL, '2026-06-22 14:31:34.000', '2026-06-22 14:31:34.000'),
('01KVQHZT1BDFC5H4KSB24WT568', '2455-4b85-a00d-863e53812a5326195', 'ws_CO_22062026143825964712472336', '254712472336', '2.00', 'SALE-303690', 'Walk-in Customer', 'benjamin ayuago', 'Business', '01KTVQRAE9AHZF2SW707G9MNW7', 0, 0, 2, NULL, NULL, NULL, '2026-06-22 14:38:26.000', '2026-06-22 14:38:26.000'),
('01KVQJ0G40VX65BJC4VNEMYDMW', '2455-4b85-a00d-863e53812a5326195', 'ws_CO_22062026143825964712472336', NULL, NULL, NULL, 'Walk-in Customer', 'benjamin ayuago', 'Business', '01KTVQRAE9AHZF2SW707G9MNW7', 1, 0, 0, '0', 'The service request is processed successfully.', NULL, '2026-06-22 14:38:48.000', '2026-06-22 14:38:48.000'),
('01KVQJ1J17YGRC5RGNJM9Q6FTH', '2455-4b85-a00d-863e53812a5326245', 'ws_CO_22062026143923318712472336', '254712472336', '2.00', 'SALE-361301', 'Walk-in Customer', 'benjamin ayuago', 'Business', '01KTVQRAE9AHZF2SW707G9MNW7', 0, 0, 2, NULL, NULL, NULL, '2026-06-22 14:39:23.000', '2026-06-22 14:39:23.000'),
('01KVQJ1R8M9BXPHAV0YFAR4EJF', '2455-4b85-a00d-863e53812a5326245', 'ws_CO_22062026143923318712472336', NULL, NULL, NULL, 'Walk-in Customer', 'benjamin ayuago', 'Business', '01KTVQRAE9AHZF2SW707G9MNW7', 1, 0, 1, '1', 'The balance is insufficient for the transaction.', NULL, '2026-06-22 14:39:29.000', '2026-06-22 14:39:29.000'),
('01KVT32VZTJ9NH3AN6Q669TENB', '710d-4264-9509-c1b5a7aeab472623', 'ws_CO_23062026141541977790590653', '254790590653', '3000.00', 'SALE-339377', 'Walk-in Customer', 'Dory', 'Business', '01KVQH3VSA02FZHNP25R3YAH12', 0, 1, 2, NULL, NULL, NULL, '2026-06-23 14:15:42.000', '2026-06-23 14:15:42.000'),
('01KX4924XDHWTVHM34K2JVW6F1', '70be-42a2-9c49-d6497992d03436401', 'ws_CO_09072026232814295790590653', '254790590653', '16999.00', 'SUB-REN-Q5T8WJ-3910', 'benjamin mkapa', 'benjamin mkapa', 'Yyy', '01KW05C40G79AQ2S4D2EQ5T8WJ', 0, 0, 2, NULL, NULL, NULL, '2026-07-09 23:28:15.000', '2026-07-09 23:28:15.000'),
('01KX492YC5RSAP4VMZE6D8TJKT', '70be-42a2-9c49-d6497992d03436401', 'ws_CO_09072026232814295790590653', NULL, NULL, NULL, 'benjamin mkapa', 'benjamin mkapa', 'Yyy', '01KW05C40G79AQ2S4D2EQ5T8WJ', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-07-09 23:28:41.000', '2026-07-09 23:28:41.000'),
('01KX49359GHJNA13411A1G5S7H', '099c-4806-abcc-a45ce296d52150617', 'ws_CO_09072026232848215790590653', '254790590653', '4450.00', 'SUB-UPG-Q5T8WJ-7363', 'benjamin mkapa', 'benjamin mkapa', 'Yyy', '01KW05C40G79AQ2S4D2EQ5T8WJ', 0, 0, 2, NULL, NULL, NULL, '2026-07-09 23:28:48.000', '2026-07-09 23:28:48.000'),
('01KX493NXYH852RTWA4JVB8QDA', '099c-4806-abcc-a45ce296d52150617', 'ws_CO_09072026232848215790590653', NULL, NULL, NULL, 'benjamin mkapa', 'benjamin mkapa', 'Yyy', '01KW05C40G79AQ2S4D2EQ5T8WJ', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-07-09 23:29:05.000', '2026-07-09 23:29:05.000'),
('01KYSWN694DB2CKCSKBPN3ZZ6P', '5c4a-49cd-9a18-040d220bad0910533305', 'ws_CO_30072026191026669790590653', '254790590653', '4450.00', 'SUB-UPG-Q5T8WJ-4392', 'benjamin mkapa', 'benjamin mkapa', 'Yyy', '01KW05C40G79AQ2S4D2EQ5T8WJ', 0, 0, 2, NULL, NULL, NULL, '2026-07-30 19:10:26.000', '2026-07-30 19:10:26.000'),
('01KYSWNJDD1W19YRJXX24H276W', '5c4a-49cd-9a18-040d220bad0910533305', 'ws_CO_30072026191026669790590653', NULL, NULL, NULL, 'benjamin mkapa', 'benjamin mkapa', 'Yyy', '01KW05C40G79AQ2S4D2EQ5T8WJ', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-07-30 19:10:39.000', '2026-07-30 19:10:39.000'),
('01M0YZP9B2EXJQC9NRC46FX353', '9d51-416e-a7af-af7a8168004d107360', 'ws_CO_26082026151104915790590653', '254790590653', '4450.00', 'SUB-UPG-Q5T8WJ-3542', 'benjamin mkapa', 'benjamin mkapa', 'O’kombe Inc', '01KW05C40G79AQ2S4D2EQ5T8WJ', 0, 0, 2, NULL, NULL, NULL, '2026-08-26 15:11:04.000', '2026-08-26 15:11:04.000'),
('01M0YZPN6QYPYKV98THNJVTQ5D', '9d51-416e-a7af-af7a8168004d107360', 'ws_CO_26082026151104915790590653', NULL, NULL, NULL, 'benjamin mkapa', 'benjamin mkapa', 'O’kombe Inc', '01KW05C40G79AQ2S4D2EQ5T8WJ', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-08-26 15:11:16.000', '2026-08-26 15:11:16.000'),
('01M0ZB75BRW4YZRWMHSGY4Z995', 'fd61-406b-a967-ece72446407b800954', 'ws_CO_260820261832314743603301', '254743603301', '470.00', 'SALE-348550', 'Walk-in Customer', 'Calvin', 'Business', '01KSF85279ETEV8T615JSET95G', 0, 0, 2, NULL, NULL, NULL, '2026-08-26 18:32:31.000', '2026-08-26 18:32:31.000'),
('01M0ZB76EMF95KTA85Z3SZAKST', 'fd61-406b-a967-ece72446407b800954', 'ws_CO_260820261832314743603301', NULL, NULL, NULL, 'Walk-in Customer', 'Calvin', 'Business', '01KSF85279ETEV8T615JSET95G', 1, 0, 1, '1037', 'DS timeout user cannot be reached.', NULL, '2026-08-26 18:32:32.000', '2026-08-26 18:32:32.000'),
('01M0ZB7S3250YD9AV1F0KV72BK', 'fd61-406b-a967-ece72446407b800972', 'ws_CO_260820261832515743603301', '254743603301', '470.00', 'SALE-370611', 'Walk-in Customer', 'Calvin', 'Business', '01KSF85279ETEV8T615JSET95G', 0, 0, 2, NULL, NULL, NULL, '2026-08-26 18:32:51.000', '2026-08-26 18:32:51.000'),
('01M0ZB88KCKTA3T27V3T5A588S', 'fd61-406b-a967-ece72446407b800972', 'ws_CO_260820261832515743603301', NULL, NULL, NULL, 'Walk-in Customer', 'Calvin', 'Business', '01KSF85279ETEV8T615JSET95G', 1, 0, 1, '1037', 'DS timeout user cannot be reached.', NULL, '2026-08-26 18:33:07.000', '2026-08-26 18:33:07.000'),
('01M0ZB8QEQBA12F83RW54DKYCS', 'fd61-406b-a967-ece72446407b801089', 'ws_CO_260820261833227743603301', '254743603301', '470.00', 'SALE-401621', 'Walk-in Customer', 'Calvin', 'Business', '01KSF85279ETEV8T615JSET95G', 0, 0, 2, NULL, NULL, NULL, '2026-08-26 18:33:23.000', '2026-08-26 18:33:23.000'),
('01M0ZB96136TR8WGN4J59C7786', 'fd61-406b-a967-ece72446407b801089', 'ws_CO_260820261833227743603301', NULL, NULL, NULL, 'Walk-in Customer', 'Calvin', 'Business', '01KSF85279ETEV8T615JSET95G', 1, 0, 1, '1037', 'DS timeout user cannot be reached.', NULL, '2026-08-26 18:33:37.000', '2026-08-26 18:33:37.000'),
('01M1BPNSZ4HFQG11S1VZZ1V9YD', 'be5d-4a01-9c88-214dc6288b132347061', 'ws_CO_31082026134339294790590653', '254790590653', '8200.00', 'SUB-REN-G9MNW7-7872', 'benjamin ayuago', 'benjamin ayuago', 'tena', '01KTVQRAE9AHZF2SW707G9MNW7', 0, 0, 2, NULL, NULL, NULL, '2026-08-31 13:43:39.000', '2026-08-31 13:43:39.000'),
('01M1BPP4SPEMREG08Y3TR2R7AF', 'be5d-4a01-9c88-214dc6288b132347061', 'ws_CO_31082026134339294790590653', NULL, NULL, NULL, 'benjamin ayuago', 'benjamin ayuago', 'tena', '01KTVQRAE9AHZF2SW707G9MNW7', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-08-31 13:43:50.000', '2026-08-31 13:43:50.000'),
('01M1BPTDCQKCMSPE8AY9MG4JFZ', 'be5d-4a01-9c88-214dc6288b132355007', 'ws_CO_31082026134609111700590653', '254700590653', '83640.00', 'SUB-REN-G9MNW7-9319', 'benjamin ayuago', 'benjamin ayuago', 'tena', '01KTVQRAE9AHZF2SW707G9MNW7', 0, 0, 2, NULL, NULL, NULL, '2026-08-31 13:46:10.000', '2026-08-31 13:46:10.000'),
('01M1BPTH5FXN83YF9W4K7BNY97', 'be5d-4a01-9c88-214dc6288b132355007', 'ws_CO_31082026134609111700590653', NULL, NULL, NULL, 'benjamin ayuago', 'benjamin ayuago', 'tena', '01KTVQRAE9AHZF2SW707G9MNW7', 1, 0, 1, '1037', 'DS timeout user cannot be reached.', NULL, '2026-08-31 13:46:13.000', '2026-08-31 13:46:13.000'),
('01M1BPVX0P3008NCVMZ4KGNR23', '3ce2-4f03-b224-5bdb908b84f2371010', 'ws_CO_31082026134658324790590653', '254790590653', '83640.00', 'SUB-UPG-G9MNW7-8075', 'benjamin ayuago', 'benjamin ayuago', 'tena', '01KTVQRAE9AHZF2SW707G9MNW7', 0, 0, 2, NULL, NULL, NULL, '2026-08-31 13:46:58.000', '2026-08-31 13:46:58.000'),
('01M1BPW75TTZ4HFCQ4EENWME8X', '3ce2-4f03-b224-5bdb908b84f2371010', 'ws_CO_31082026134658324790590653', NULL, NULL, NULL, 'benjamin ayuago', 'benjamin ayuago', 'tena', '01KTVQRAE9AHZF2SW707G9MNW7', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-08-31 13:47:09.000', '2026-08-31 13:47:09.000'),
('01M2F9YK7Z150B8RA5VAEZE2BA', '0ca7-4cc6-9fb0-41ec21a6651429175', 'ws_CO_140920260933548790590653', '254790590653', '1.00', 'ORDER-Z8VN0A', 'Mimi', 'Mimi', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 0, 0, 2, NULL, NULL, NULL, '2026-09-14 09:33:55.000', '2026-09-14 09:33:55.000'),
('01M2F9Z7XD5DM9H71Z7BZVEMCY', '0ca7-4cc6-9fb0-41ec21a6651429175', 'ws_CO_140920260933548790590653', NULL, NULL, NULL, 'Mimi', 'Mimi', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 1, 0, 1, '1', 'The balance is insufficient for the transaction.', NULL, '2026-09-14 09:34:16.000', '2026-09-14 09:34:16.000'),
('01M2FSEC58HZD0GR2FCDX15WJR', '91a9-4a36-9953-3a5640b5162122692061', 'ws_CO_14092026140440760790590653', '254790590653', '0.50', 'SUB-UPG-STNJFA-9839', 'Anonymityiskey _', 'Anonymityiskey _', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 0, 0, 2, NULL, NULL, NULL, '2026-09-14 14:04:40.000', '2026-09-14 14:04:40.000'),
('01M2FSEZ7QFQMWAQSH46KDPJ08', '91a9-4a36-9953-3a5640b5162122692061', 'ws_CO_14092026140440760790590653', NULL, NULL, NULL, 'Anonymityiskey _', 'Anonymityiskey _', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 1, 0, 0, '0', 'The service request is processed successfully.', NULL, '2026-09-14 14:05:00.000', '2026-09-14 14:05:00.000'),
('01M2NGEFA7KAPAE8XT6D4E8V2N', 'e453-4af6-8d30-b8288958abfc14784967', 'ws_CO_16092026192253610790590653', '254790590653', '8200.00', 'SUB-REN-VFJ9K5-2359', 'benjamin mkapa', 'benjamin mkapa', 'Mimi', '01M1KFVFCP48FM8XW9WKVFJ9K5', 0, 0, 2, NULL, NULL, NULL, '2026-09-16 19:22:53.000', '2026-09-16 19:22:53.000'),
('01M2NGFATBR1NHRRTD6QXNWHRD', 'e453-4af6-8d30-b8288958abfc14784967', 'ws_CO_16092026192253610790590653', NULL, NULL, NULL, 'benjamin mkapa', 'benjamin mkapa', 'Mimi', '01M1KFVFCP48FM8XW9WKVFJ9K5', 1, 0, 1, '1038', 'No response from user.', NULL, '2026-09-16 19:23:21.000', '2026-09-16 19:23:21.000'),
('01M2QJ86H43QW2D2FHPYMNSY50', '9753-4a19-a91a-b87557260a98687055', 'ws_CO_17092026143253707790590653', '254790590653', '1.00', 'SUB-UPG-STNJFA-2714', 'Anonymityiskey _', 'Anonymityiskey _', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 0, 0, 2, NULL, NULL, NULL, '2026-09-17 14:32:53.000', '2026-09-17 14:32:53.000'),
('01M2QJ8MM6RKAX9PATV6VSECFM', '9753-4a19-a91a-b87557260a98687055', 'ws_CO_17092026143253707790590653', NULL, NULL, NULL, 'Anonymityiskey _', 'Anonymityiskey _', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 1, 0, 0, '0', 'The service request is processed successfully.', NULL, '2026-09-17 14:33:08.000', '2026-09-17 14:33:08.000'),
('01M2WWGTYXKBPM0XT62AD1X55Z', '8f38-49f8-9be4-b87d691148b4949239', 'ws_CO_190920261608345790590623', '254790590623', '77.00', 'PUB-B849H197', 'Brnja', 'Brnja', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 0, 0, 2, NULL, NULL, NULL, '2026-09-19 16:08:34.000', '2026-09-19 16:08:34.000'),
('01M2WX0YVMBXANMHZFBEHXSVWY', 'ac7b-470b-8df7-23ab3cef3827528859', 'ws_CO_190920261617229790590653', '254790590653', '1.00', 'PUB-JN44Y9EE', 'Benjamin mkapa', 'Benjamin mkapa', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 0, 0, 2, NULL, NULL, NULL, '2026-09-19 16:17:23.000', '2026-09-19 16:17:23.000'),
('01M2WX48K54FK5YYFBDSFSVB13', 'e423-4050-8d0c-19ffd6b19ee912965', 'ws_CO_190920261619109790590653', '254790590653', '1.00', 'PUB-M1DJXBRM', 'Benjamin mkapa', 'Benjamin mkapa', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 0, 0, 2, NULL, NULL, NULL, '2026-09-19 16:19:11.000', '2026-09-19 16:19:11.000'),
('01M2WX4G351W0Q1PCMWPDFP2V3', 'e423-4050-8d0c-19ffd6b19ee912965', 'ws_CO_190920261619109790590653', NULL, NULL, NULL, 'Benjamin mkapa', 'Benjamin mkapa', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-09-19 16:19:19.000', '2026-09-19 16:19:19.000'),
('01M2WX5TPDEXKVS4RZ6E67E761', '4e7d-425c-aa3e-9b62f1dcf8a2528190', 'ws_CO_190920261620022790590653', '254790590653', '1.00', 'PUB-5E8SB5B8', 'Benjamin mkapa', 'Benjamin mkapa', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 0, 0, 2, NULL, NULL, NULL, '2026-09-19 16:20:02.000', '2026-09-19 16:20:02.000'),
('01M2WX5YXMPH4AKYCWBHB10SEP', '4e7d-425c-aa3e-9b62f1dcf8a2528190', 'ws_CO_190920261620022790590653', NULL, NULL, NULL, 'Benjamin mkapa', 'Benjamin mkapa', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 1, 0, 1, '9999', 'Error occurred while sending push request.', NULL, '2026-09-19 16:20:07.000', '2026-09-19 16:20:07.000'),
('01M2Z9SCMMC2Q1T7PKBF2QDB44', '0823-47c9-9c08-712036e886ee555124', 'ws_CO_20092026143855612790590653', '254790590653', '4450.00', 'SUB-UPG-VFJ9K5-4147', 'benjamin mkapa', 'benjamin mkapa', 'Mimi', '01M1KFVFCP48FM8XW9WKVFJ9K5', 0, 0, 2, NULL, NULL, NULL, '2026-09-20 14:38:55.000', '2026-09-20 14:38:55.000'),
('01M2Z9T89TAQNBA09M1623CR8H', '0823-47c9-9c08-712036e886ee555124', 'ws_CO_20092026143855612790590653', NULL, NULL, NULL, 'benjamin mkapa', 'benjamin mkapa', 'Mimi', '01M1KFVFCP48FM8XW9WKVFJ9K5', 1, 0, 1, '1038', 'No response from user.', NULL, '2026-09-20 14:39:23.000', '2026-09-20 14:39:23.000'),
('01M31V2RB557GPEGZA4B5DX2QV', 'cbc7-4eb6-8033-e874ef3eaa9665527246', 'ws_CO_21092026141936706790590653', '254790590653', '8200.00', 'SUB-REN-STNJFA-6052', 'Anonymityiskey _', 'Anonymityiskey _', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 0, 0, 2, NULL, NULL, NULL, '2026-09-21 14:19:37.000', '2026-09-21 14:19:37.000'),
('01M31V2VP4DX6XB5EEQ5R7HRG6', 'cbc7-4eb6-8033-e874ef3eaa9665527246', 'ws_CO_21092026141936706790590653', NULL, NULL, NULL, 'Anonymityiskey _', 'Anonymityiskey _', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 1, 0, 1, '1037', 'DS timeout user cannot be reached.', NULL, '2026-09-21 14:19:40.000', '2026-09-21 14:19:40.000'),
('01M31V59EG6JATQ0NE4K7VH3VZ', 'e185-42f9-99b4-2e3d1ff5f0a1313831', 'ws_CO_210920261420598790590653', '254790590653', '2000.00', 'PUB-Y3H5N70E', 'Hvyf', 'Hvyf', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 0, 0, 2, NULL, NULL, NULL, '2026-09-21 14:21:00.000', '2026-09-21 14:21:00.000'),
('01M31V5SM32QECQ0QJZM1JJYZ4', 'e185-42f9-99b4-2e3d1ff5f0a1313831', 'ws_CO_210920261420598790590653', NULL, NULL, NULL, 'Hvyf', 'Hvyf', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-09-21 14:21:16.000', '2026-09-21 14:21:16.000'),
('01M3BE3F7A5KDXGGTQSGK79SYX', '4e7d-425c-aa3e-9b62f1dcf8a2879134', 'ws_CO_250920260745130700590653', '254700590653', '5000.00', 'SALE-511751', 'Walk-in Customer', 'Anonymityiskey _', 'Business', '01M1H1V7BV7GAJWCYDCSSTNJFA', 0, 0, 2, NULL, NULL, NULL, '2026-09-25 07:45:13.000', '2026-09-25 07:45:13.000'),
('01M3BE5QX56F944R0WYT7AH3FM', 'ac7b-470b-8df7-23ab3cef3827880504', 'ws_CO_250920260746274700590653', '254700590653', '5000.00', 'SALE-586308', 'Walk-in Customer', 'Anonymityiskey _', 'Business', '01M1H1V7BV7GAJWCYDCSSTNJFA', 0, 0, 2, NULL, NULL, NULL, '2026-09-25 07:46:27.000', '2026-09-25 07:46:27.000'),
('01M3BEDXTJ41MR77TKHZC9CJ42', '9b3a-4a3c-b15d-95561199b91217651', 'ws_CO_250920260750557790590653', '254790590653', '50.00', 'SALE-854421', 'Walk-in Customer', 'Anonymityiskey _', 'Business', '01M1H1V7BV7GAJWCYDCSSTNJFA', 0, 0, 2, NULL, NULL, NULL, '2026-09-25 07:50:55.000', '2026-09-25 07:50:55.000'),
('01M3BEGFWX9AA360WRWG0Y5HZZ', 'a72d-46d9-be59-57b073e2420d12242571', 'ws_CO_25092026075219455790590653', '254790590653', '8200.00', 'SUB-REN-STNJFA-8921', 'Anonymityiskey _', 'Anonymityiskey _', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 0, 0, 2, NULL, NULL, NULL, '2026-09-25 07:52:19.000', '2026-09-25 07:52:19.000'),
('01M3BEGR3QRB38TVA2261PG3ZQ', 'a72d-46d9-be59-57b073e2420d12242571', 'ws_CO_25092026075219455790590653', NULL, NULL, NULL, 'Anonymityiskey _', 'Anonymityiskey _', 'Mkanywe Inc', '01M1H1V7BV7GAJWCYDCSSTNJFA', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-09-25 07:52:28.000', '2026-09-25 07:52:28.000'),
('01M3BESZH2G8RTT3BQTA696KQT', '0af9-4314-a92c-71d890ca3fd5639304', 'ws_CO_25092026075730569790590653', '254790590653', '8200.00', 'SUB-REN-TJBWKK-0268', 'Benonnie', 'Benonnie', 'Kang’o', '01M3BENRE4WZQ0V8FYVXTJBWKK', 0, 0, 2, NULL, NULL, NULL, '2026-09-25 07:57:30.000', '2026-09-25 07:57:30.000'),
('01M3BETDTVSYHE7EGH3MJ5049Z', '0af9-4314-a92c-71d890ca3fd5639304', 'ws_CO_25092026075730569790590653', NULL, NULL, NULL, 'Benonnie', 'Benonnie', 'Kang’o', '01M3BENRE4WZQ0V8FYVXTJBWKK', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-09-25 07:57:45.000', '2026-09-25 07:57:45.000'),
('01M3BEV73CWFP8P5H5YP5CRFH0', 'c571-4675-8935-e91625a210647453244', 'ws_CO_25092026075811361790590653', '254790590653', '8200.00', 'SUB-REN-TJBWKK-0590', 'Benonnie', 'Benonnie', 'Kang’o', '01M3BENRE4WZQ0V8FYVXTJBWKK', 0, 0, 2, NULL, NULL, NULL, '2026-09-25 07:58:11.000', '2026-09-25 07:58:11.000'),
('01M3BEVENP0X4JH5EEQ1HPKCVZ', 'c571-4675-8935-e91625a210647453244', 'ws_CO_25092026075811361790590653', NULL, NULL, NULL, 'Benonnie', 'Benonnie', 'Kang’o', '01M3BENRE4WZQ0V8FYVXTJBWKK', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-09-25 07:58:19.000', '2026-09-25 07:58:19.000'),
('01M3T26EJQJZC0VB7KCT97G91D', '8f38-49f8-9be4-b87d691148b41509224', 'ws_CO_011020260005430790590653', '254790590653', '4450.00', 'SUB-UPG-VFJ9K5-3202', 'benjamin mkapa', 'benjamin mkapa', 'Mimi', '01M1KFVFCP48FM8XW9WKVFJ9K5', 0, 0, 2, NULL, NULL, NULL, '2026-10-01 00:05:43.000', '2026-10-01 00:05:43.000'),
('01M3T2741ECNYC218FFZNRBNEB', '99b9-4602-9d54-5be8313835a9181056', 'ws_CO_011020260006050790590653', '254790590653', '8200.00', 'SUB-UPG-VFJ9K5-5036', 'benjamin mkapa', 'benjamin mkapa', 'Mimi', '01M1KFVFCP48FM8XW9WKVFJ9K5', 0, 0, 2, NULL, NULL, NULL, '2026-10-01 00:06:05.000', '2026-10-01 00:06:05.000'),
('01M3T39R7J4VWMMH5CE18ZNWW7', '99b9-4602-9d54-5be8313835a9182536', 'ws_CO_011020260024597790590653', '254790590653', '4450.00', 'SUB-REN-VFJ9K5-9652', 'benjamin mkapa', 'benjamin mkapa', 'Mimi', '01M1KFVFCP48FM8XW9WKVFJ9K5', 0, 0, 2, NULL, NULL, NULL, '2026-10-01 00:25:00.000', '2026-10-01 00:25:00.000'),
('01M3T7BGRNW0X4EFC2N2C6MRDZ', 'cc0e-4c7b-b29f-3316bbbbe80c390975', 'ws_CO_01102026013553449790590653', '254790590653', '4450.00', 'SUB-REN-BVMYP1-2367', 'benjamin mkapa', 'benjamin mkapa', 'Yeye', '01M3T79MYEZPCDRWQJ82BVMYP1', 0, 0, 2, NULL, NULL, NULL, '2026-10-01 01:35:53.000', '2026-10-01 01:35:53.000'),
('01M3T7BQTYMMR18TZTTYWVMK1N', 'cc0e-4c7b-b29f-3316bbbbe80c390975', 'ws_CO_01102026013553449790590653', NULL, NULL, NULL, 'benjamin mkapa', 'benjamin mkapa', 'Yeye', '01M3T79MYEZPCDRWQJ82BVMYP1', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-10-01 01:36:00.000', '2026-10-01 01:36:00.000'),
('01M49NNQJ3ZK52GMR83JJ03H18', 'd0db-40a6-ade3-995d25fd1862319520', 'ws_CO_07102026013444591790590653', '254790590653', '1.00', 'SUB-REN-2P78QK-3810', 'benjamin ayuago', 'benjamin ayuago', 'TENA', '01M49NKSVTA48XGXHB042P78QK', 0, 0, 2, NULL, NULL, NULL, '2026-10-07 01:34:44.000', '2026-10-07 01:34:44.000'),
('01M49NP33Q3509MAGGZPTVBQY7', 'd0db-40a6-ade3-995d25fd1862319520', 'ws_CO_07102026013444591790590653', NULL, NULL, NULL, 'benjamin ayuago', 'benjamin ayuago', 'TENA', '01M49NKSVTA48XGXHB042P78QK', 1, 0, 0, '0', 'The service request is processed successfully.', NULL, '2026-10-07 01:34:56.000', '2026-10-07 01:34:56.000'),
('01M49P4G4XEH1Y6PKHDJFV26FT', 'ab6e-447b-a539-f1b8bb4ea614463030', 'ws_CO_07102026014248524790590653', '254790590653', '1.00', 'SUB-UPG-2P78QK-7971', 'benjamin ayuago', 'benjamin ayuago', 'TENA', '01M49NKSVTA48XGXHB042P78QK', 0, 0, 2, NULL, NULL, NULL, '2026-10-07 01:42:48.000', '2026-10-07 01:42:48.000'),
('01M49P4XZBH9T6GH1SS745ZRQ5', 'ab6e-447b-a539-f1b8bb4ea614463030', 'ws_CO_07102026014248524790590653', NULL, NULL, NULL, 'benjamin ayuago', 'benjamin ayuago', 'TENA', '01M49NKSVTA48XGXHB042P78QK', 1, 0, 3, '1032', 'Request Cancelled by user.', NULL, '2026-10-07 01:43:02.000', '2026-10-07 01:43:02.000'),
('01M49P5FA7XKSB32QXK7EX1C1H', '9023-489d-a36c-75e565ea20e8738119', 'ws_CO_07102026014320325790590653', '254790590653', '1.00', 'SUB-UPG-2P78QK-9682', 'benjamin ayuago', 'benjamin ayuago', 'TENA', '01M49NKSVTA48XGXHB042P78QK', 0, 0, 2, NULL, NULL, NULL, '2026-10-07 01:43:20.000', '2026-10-07 01:43:20.000'),
('01M49P60N7D01CC0N37DZACVCD', '9023-489d-a36c-75e565ea20e8738119', 'ws_CO_07102026014320325790590653', NULL, NULL, NULL, 'benjamin ayuago', 'benjamin ayuago', 'TENA', '01M49NKSVTA48XGXHB042P78QK', 1, 0, 0, '0', 'The service request is processed successfully.', NULL, '2026-10-07 01:43:38.000', '2026-10-07 01:43:38.000'),
('01M4DVPZ39VA872Z8AJE5HFY7J', '07e0-40a2-8aa6-a85c104d97cc1141715', 'ws_CO_081020261637138790590653', '254790590653', '4450.00', 'SUB-REN-2P78QK-2539', 'benjamin ayuago', 'benjamin ayuago', 'TENA', '01M49NKSVTA48XGXHB042P78QK', 0, 0, 2, NULL, NULL, '[object Object]', '2026-10-08 16:37:14.000', '2026-10-08 16:37:14.000'),
('01M4DVVBASSXPDN8ZTE9C7NH84', 'd50d-48db-b5bd-fb7438765152236364', 'ws_CO_08102026163937015790590653', '254790590653', '87.00', 'SALE-776844', 'Walk-in Customer', 'benjamin ayuago', 'Business', '01M49NKSVTA48XGXHB042P78QK', 0, 0, 2, NULL, NULL, '[object Object]', '2026-10-08 16:39:37.000', '2026-10-08 16:39:37.000'),
('01M4DVWX3DW56SG9QXW0TDS7J0', '6386-47fa-a695-2443a973fa62431696', 'ws_CO_08102026164028431790590653', '254790590653', '174.00', 'SALE-827861', 'Walk-in Customer', 'benjamin ayuago', 'Business', '01M49NKSVTA48XGXHB042P78QK', 0, 0, 2, NULL, NULL, '[object Object]', '2026-10-08 16:40:28.000', '2026-10-08 16:40:28.000'),
('01M4DVYE07Q9GQK9FEPTJS7637', 'ab0c-4151-b261-2688534a8a08725970', 'ws_CO_08102026164118487790590653', '254790590653', '87.00', 'PUB-XJW2DQD0', 'ben', 'ben', 'TENA', '01M49NKSVTA48XGXHB042P78QK', 0, 0, 2, NULL, NULL, '[object Object]', '2026-10-08 16:41:18.000', '2026-10-08 16:41:18.000');
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `notification`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `notification` (
  `id` varchar(26) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(26) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint(1) DEFAULT '0',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `relatedTenantId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referenceId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referenceType` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `notification` (`id`, `tenantId`, `title`, `message`, `type`, `status`, `createdAt`, `relatedTenantId`, `referenceId`, `referenceType`) VALUES 
('01M5FA3N0A1P8B9TET8S4PTQFX', '01KS2T078ZP2F30RMBZW23WPTX', 'kjknjk', 'jnjknkj', 'success', 0, '2026-10-21 16:23:46.000', NULL, NULL, NULL),
('01M5FAA0E96HHYDH1P4CAY4PBA', '01KS2T078ZP2F30RMBZW23WPTX', 'njjk', 'kkjnk', 'info', 0, '2026-10-21 16:27:14.000', NULL, NULL, NULL),
('01M5FAAH435APYKBRPGZ9ZEQ4M', '01KS2T078ZP2F30RMBZW23WPTX', 'ijii', 'klmk', 'info', 0, '2026-10-21 16:27:31.000', NULL, NULL, NULL),
('01M5PFHQQ74TT7PT2YEJT3XZXC', '01KS2T078ZP2F30RMBZW23WPTX', '⚠️ New Admin Session Active', 'A new admin login for mkapabenjamin254@gmail.com from IP ::1 (Chrome 156 on Windows 10) was initiated. Your existing session is still active. Review or terminate this new session if unrecognized.', 'security', 0, '2026-10-24 11:13:31.000', NULL, NULL, NULL),
('01M5PFKX31WFV36ABX5PFA896H', '01KS2T078ZP2F30RMBZW23WPTX', '🔴 User Account Deleted', 'User \'User\' was permanently removed by Admin.', 'danger', 0, '2026-10-24 11:14:42.000', NULL, NULL, NULL),
('01M60J3DV8K3MH0PA2TJGY949H', '01KS2T078ZP2F30RMBZW23WPTX', '⚠️ New Admin Session Active', 'A new admin login for mkapabenjamin254@gmail.com from IP ::1 (Chrome 156 on Windows 10) was initiated. Your existing session is still active. Review or terminate this new session if unrecognized.', 'security', 0, '2026-10-28 09:10:32.000', NULL, NULL, NULL),
('01M60Z0HHQ0ZRD800R3NNTHPNA', '01KS2T078ZP2F30RMBZW23WPTX', '🔴 Business Account Deleted', '\'rtial\' was permanently removed by Admin.', 'danger', 0, '2026-10-28 12:56:09.000', NULL, NULL, NULL),
('01M60Z0RYPBMNK2AMQC1503TXV', '01KS2T078ZP2F30RMBZW23WPTX', '🔴 Business Account Deleted', '\'Kikih Inv.\' was permanently removed by Admin.', 'danger', 0, '2026-10-28 12:56:17.000', NULL, NULL, NULL);
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `operation`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `operation` (
  `id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resourceId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `opType` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `assignedToUserId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estimatedCost` decimal(15,2) DEFAULT '0.00',
  `actualCost` decimal(15,2) DEFAULT '0.00',
  `expenseId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `resourceId` (`resourceId`),
  KEY `idx_op_tenant_type` (`tenantId`,`opType`),
  CONSTRAINT `operation_ibfk_1` FOREIGN KEY (`tenantId`) REFERENCES `tenant` (`id`) ON DELETE CASCADE,
  CONSTRAINT `operation_ibfk_2` FOREIGN KEY (`resourceId`) REFERENCES `resource` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `partner`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `partner` (
  `id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `referralCode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referralCode` (`referralCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `partnercommission`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `partnercommission` (
  `id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `partnerId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `payment`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `payment` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plan` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mpesaReceipt` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mpesaRequestId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` tinyint DEFAULT '2',
  `referenceType` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'SALE',
  `referenceId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transactionType` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'SUBSCRIPTION',
  `isRented` tinyint DEFAULT '0',
  `payoutStatus` tinyint DEFAULT '0',
  `rawResponse` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `merchantRequestId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `meta` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_payment_status` (`status`),
  KEY `idx_payment_ref` (`reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `payout`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `payout` (
  `id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `refereeId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sourceId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `processedAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payout_ibfk_1` (`tenantId`),
  CONSTRAINT `payout_ibfk_1` FOREIGN KEY (`tenantId`) REFERENCES `tenant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `platformreview`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `platformreview` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating` int NOT NULL,
  `reviewText` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `businessName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ownerName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` int DEFAULT '0',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `tenantId` (`tenantId`),
  KEY `userId` (`userId`),
  CONSTRAINT `PlatformReview_ibfk_1` FOREIGN KEY (`tenantId`) REFERENCES `tenant` (`id`) ON DELETE CASCADE,
  CONSTRAINT `PlatformReview_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `platformreview` (`id`, `tenantId`, `userId`, `rating`, `reviewText`, `businessName`, `ownerName`, `status`, `createdAt`) VALUES 
('PRMPF2JG01V52', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 4, 'ti\'s working well for me, some few changes needed tho ...like the ability to rent STK prompt at a cost for those of us not having paybill yet', 'eDuka Inc', 'Benjamin mkapa', 1, '2026-05-21 07:47:07.000'),
('PRMPO53UTESZZ', '01KSF85279ETEV8T615JSET95G', '01KSF8527BQCG3PYG1EV9CQKQT', 4, '', 'Cal\'s retail', 'Calvin', 2, '2026-05-27 16:08:54.000'),
('PRMQAZJGFLYV6', '01KSF85279ETEV8T615JSET95G', '01KSF8527BQCG3PYG1EV9CQKQT', 4, '', 'Cal\'s retail', 'Calvin', 0, '2026-06-12 16:51:46.000'),
('PRMQP5WPCFXU1', '01KVQH3VSA02FZHNP25R3YAH12', '01KVQH3VSAW2RK9DM8G2W3MDNA', 5, '', 'Glamorous-glady', 'doreen gatobu', 2, '2026-06-22 14:58:49.000'),
('PRMRSWCKQP7PU', '01KSF85279ETEV8T615JSET95G', '01KSF8527BQCG3PYG1EV9CQKQT', 4, '', 'Cal\'s retail', 'Calvin', 0, '2026-07-20 10:22:00.000'),
('PRMT8V136A9LV', '01KSF85279ETEV8T615JSET95G', '01KSF8527BQCG3PYG1EV9CQKQT', 4, '', 'Cal\'s retail', 'Calvin', 0, '2026-08-25 19:09:06.000');
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `product`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `product` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `imageUrl` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) NOT NULL,
  `buyingPrice` decimal(10,2) DEFAULT NULL,
  `stockLevel` int DEFAULT '0',
  `trackStock` tinyint(1) NOT NULL DEFAULT '0',
  `minLevel` int DEFAULT '5',
  `isPerishable` tinyint(1) DEFAULT '0',
  `expiryDate` datetime(3) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'GOOD',
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_product_tenant_name` (`tenantId`,`name`),
  KEY `idx_product_tenant_category` (`tenantId`,`category`),
  KEY `idx_product_tenant_sku` (`tenantId`,`sku`),
  KEY `idx_product_stock` (`stockLevel`),
  KEY `idx_product_expiry` (`expiryDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `product` (`id`, `tenantId`, `name`, `sku`, `category`, `description`, `imageUrl`, `price`, `buyingPrice`, `stockLevel`, `trackStock`, `minLevel`, `isPerishable`, `expiryDate`, `isActive`, `createdAt`, `updatedAt`, `type`) VALUES 
('01KSFG69F2AKCCCNKKPG5S6KQT', '01KSF85279ETEV8T615JSET95G', 'fresh milk', 'HLI-YT34KG', 'Other', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1779907916978-5c7ccb54a9c3b9832ce2ff78828029f6.jpg', '55.00', '40.00', 2, 1, 5, 1, '2027-06-07 00:00:00.000', 1, '2026-05-25 14:01:42.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01KSFGYZ584THFFGXRY66XKG3W', '01KSF85279ETEV8T615JSET95G', 'Air freshener', 'HLI-BQEG2Y', 'Services', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1779907896366-5283926592b59d57fa4f0e46087c38d0.jpg', '105.00', '80.00', 2, 1, 5, 0, '2027-06-07 00:00:00.000', 1, '2026-05-25 14:15:11.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01KSFH1M0HZQJTSCDA88GR506V', '01KSF85279ETEV8T615JSET95G', 'Sliced Bread', 'HLI-97980P', 'Bakery', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1779907874258-14f712bc9e322ee7353a3be2cf5a661b.jpg', '60.00', '45.00', 1, 1, 5, 1, '2027-06-07 00:00:00.000', 1, '2026-05-25 14:16:37.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01KSFHA5TC2Q3XEMBEGMFZ82Y4', '01KSF85279ETEV8T615JSET95G', 'Black berry jam', 'HLI-V750KX', 'Dairy', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1779907852697-fff1850d1bb6720a0c8301c413ff3d89.jpg', '120.00', '80.00', 4, 1, 5, 1, '2027-04-05 00:00:00.000', 1, '2026-05-25 14:21:18.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01KSFHD3FCEXVHVDAA8N66HC58', '01KSF85279ETEV8T615JSET95G', 'Eggs (yellow yolk)', 'HLI-NV7TMF', 'Dairy', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1779907831815-98223805ae7f0a59708cdb2588ff9d29.jpg', '350.00', '220.00', 3, 1, 5, 1, '2027-04-05 00:00:00.000', 1, '2026-05-25 14:22:54.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01KVGJKV5NCRWWZTQZPE8ZGWW4', '01KVGJF6YRSCQEGM4WHFPQ34ER', 'Motor Rewinding ', 'HLI-B2JR9X', 'Electrical Services', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1783190391348-2.jpg', '5000.00', '0.00', 0, 0, 5, 0, NULL, 1, '2026-06-19 21:34:41.000', '2026-08-29 20:39:27.000', 'SERVICE'),
('01KVQHGNNQS0FV4TWV8A7NAP8C', '01KVQH3VSA02FZHNP25R3YAH12', 'SMM', 'HLI-5PYF3S', 'Marketing Agency', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1782127817791-Add_a_heading.png', '3000.00', '0.00', 1, 1, 5, 0, NULL, 1, '2026-06-22 14:30:10.000', '2026-10-21 09:30:29.196', 'SERVICE'),
('01KWTXVS4240GEHZDQGQTRS112', '01KVGJF6YRSCQEGM4WHFPQ34ER', 'tt', 'HLI-4TB0Q9', 'Electronics Shop', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1783315162620-2.jpg', '260.00', '250.00', 7, 1, 5, 0, NULL, 1, '2026-07-06 08:19:22.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M179R6SQ11F26V78FS29BECQ', '01KVGJF6YRSCQEGM4WHFPQ34ER', 'Electrical utility ', 'HLI-PV1T5J', 'Groceries', NULL, 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800', '6.00', '5.00', 8, 1, 5, 0, NULL, 1, '2026-08-29 20:40:48.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M376QMV4RFCC53TAZ8JZBRS5', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Modern 3 in 1 executive marble table ', 'HLI-VDP93K', 'Household', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790169569771-pasted-1790169498853.png', '9000.00', '0.00', 0, 0, 5, 0, NULL, 1, '2026-09-23 16:19:28.000', '2026-09-24 09:26:29.000', 'GOOD'),
('01M376SJSW4CV8GS5XSRA9C9MX', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Modern 3 in 1 executive pure marble table', 'HLI-DDK62P', 'Household', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790169633619-pasted-1790169610981.png', '9000.00', '0.00', 0, 0, 5, 0, NULL, 1, '2026-09-23 16:20:31.000', '2026-09-24 09:25:02.000', 'GOOD'),
('01M376TP4CDE7AXRKZ6A30C0E8', '01M25M6D3AKMZMZNR9YWNFSSYS', '5L luxury glass dispenser - Wood dispenser ', 'HLI-F53QC1', 'House hold ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790169669824-pasted-1790169651700.png', '5200.00', '3800.00', 0, 0, 5, 0, NULL, 1, '2026-09-23 16:21:07.000', '2026-09-24 09:33:02.000', 'GOOD'),
('01M376VK1Z874C28N6P085F7BV', '01M25M6D3AKMZMZNR9YWNFSSYS', '6L Luxury glass dispenser ', 'HLI-57CHC5', 'Household ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790169700057-pasted-1790169684221.png', '5500.00', '4000.00', 0, 0, 5, 0, NULL, 1, '2026-09-23 16:21:37.000', '2026-09-24 09:32:34.000', 'GOOD'),
('01M376W8W9JNX6DEN8Q18PR1N1', '01M25M6D3AKMZMZNR9YWNFSSYS', '6L luxury crown glass disoenser- Gold stand', 'HLI-9SFM03', 'House hold ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790169722928-pasted-1790169712229.png', '5500.00', '4000.00', 0, 0, 5, 0, NULL, 1, '2026-09-23 16:21:59.000', '2026-09-24 09:31:12.000', 'GOOD'),
('01M376WZ0TG2633FVFHYP8KJ4H', '01M25M6D3AKMZMZNR9YWNFSSYS', '6l Pineapple honey comb juice dispenser ', 'HLI-MJ6S0H', 'House hold ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790169744444-pasted-1790169736414.png', '5200.00', '3800.00', 0, 0, 5, 0, NULL, 1, '2026-09-23 16:22:22.000', '2026-09-24 09:31:52.000', 'GOOD'),
('01M376XZ8MWX3B5JF9XXEW6PHE', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Bamboo Chapati dish', 'HLI-7RD32A', 'House hold ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790169778036-pasted-1790169768876.png', '3200.00', '2200.00', 0, 0, 5, 0, NULL, 1, '2026-09-23 16:22:55.000', '2026-09-24 09:27:12.000', 'GOOD'),
('01M3928V5AKHECN1TW1SP11A00', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Oil dispenser ', 'HLI-5XVGKP', 'House hold ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790231998785-345182.jpg', '900.00', '450.00', 20, 1, 5, 0, NULL, 1, '2026-09-24 09:39:57.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M392BS77X86SJ5HSBWG4JWKF', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Oil dispenser ', 'HLI-JM79D1', 'Groceries house hold ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790232094651-345181.jpg', '1500.00', '850.00', 15, 1, 5, 0, NULL, 1, '2026-09-24 09:41:33.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M392HVR8QC4VQFVH13W4FP98', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Oil dispenser - 500ml', 'HLI-QYRNAN', 'House hold ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790232293721-345184.jpg', '1500.00', '850.00', 0, 0, 5, 0, NULL, 1, '2026-09-24 09:44:53.000', '2026-09-24 09:44:53.730', 'GOOD'),
('01M392MMXJEPBDANNHB7F2A8B0', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Oil dispenser/ Vinegar Soy Sauce jar - 630ml', 'HLI-X3ZDHR', 'House hold ', 'Automatically Oil Bottle Oil Dispenser /  Vinegar Soy Sauce jar\n★Capacity 630ml\n★Made of lead free glass and PP', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790232385337-345185.jpg', '1200.00', '600.00', 20, 1, 5, 0, NULL, 1, '2026-09-24 09:46:24.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M392TKGF9VNYQQJNM55E6WPS', '01M25M6D3AKMZMZNR9YWNFSSYS', '2 in 1 Oil dispenser/Sprayer -470ml', 'HLI-1DCPJW', 'House hold ', 'available in lack, cream and green', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790232580346-345186.jpg', '1200.00', '600.00', 15, 1, 5, 0, NULL, 1, '2026-09-24 09:49:39.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M392XNQ6DBA89H1JJQKV2S7D', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Elegant and stylish oil dispenser - 1000ml', 'HLI-KK6J32', 'House hold ', 'Heat resistant imported glass\nWooden airtight lid\nEasy-grio handle& smooth pouring spout\nPerfect for oil, vinegar, Soy Sauce &more', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790232680947-345187.jpg', '1800.00', '1000.00', 10, 1, 5, 0, NULL, 1, '2026-09-24 09:51:20.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M3933DGE9EV7YPSEX43V9NT6', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Stylish Glass Storage Jars(350ml)', 'HLI-KJHEKQ', 'House hold ', 'Perfect for coffee,or pantry essentials\nSize: 350ml/ 900/=\n500ml/1000/=\n750ml/1100/=', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790232869272-345190.jpg', '900.00', '450.00', 20, 1, 5, 0, NULL, 1, '2026-09-24 09:54:28.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M3938AKZ39Y7BW75HR19Q8KH', '01M25M6D3AKMZMZNR9YWNFSSYS', '360 rotating spice bamboo tabletop Rack- 350ml', 'HLI-HFJ2RJ', 'House hold ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790233030049-345191.jpg', '4000.00', '2800.00', 10, 1, 5, 0, NULL, 1, '2026-09-24 09:57:09.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M393A8233JE84MYSPJF71JWD', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Honey Jar - 400ml', 'HLI-1YXF0E', 'Household ', 'Perfect for honey,syrup,or sugar storage.stylush, durable and perfect for home decor or gifting', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790233093079-345192.jpg', '1300.00', '650.00', 20, 1, 5, 0, NULL, 1, '2026-09-24 09:58:12.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M39EXDQN5ZEBS48HX8741Y13', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Automatic oil dispenser ', 'HLI-25GA51', 'Household ', 'Material: Glass jar with plastic lid\nCapacity: 500ml', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790245255561-346444.jpg', '1000.00', '500.00', 20, 1, 5, 0, NULL, 1, '2026-09-24 13:20:54.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M39FMZ2ZVPJ7HZKVCSKJJP1Z', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Acrylic fridge organizer bins', 'HLI-XAHF84', 'House hold ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790246027619-346557.jpg', '3500.00', '2200.00', 10, 1, 5, 0, NULL, 1, '2026-09-24 13:33:46.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M39FRG3DZMV864MVPNJ186V7', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Food container ', 'HLI-5W4JTH', 'Household ', 'SIZES: 800ML+ 1700ML+ 3150ML+ 4150ML\n\nFresh Food Happy Kitchen', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790246143375-346568.jpg', '3000.00', '2000.00', 10, 1, 5, 0, NULL, 1, '2026-09-24 13:35:42.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M39FTSCM9VTRGPX0BYR8PN3Z', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Food container ', 'HLI-CXQ3C4', 'Household ', 'SIZES: 1200ML+ 20000ML+ 3500ML +6000ML', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790246218378-346569.jpg', '2800.00', '1800.00', 15, 1, 5, 0, NULL, 1, '2026-09-24 13:36:57.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M39FYDHDKZ6TV4E6NKQS9Y6T', '01M25M6D3AKMZMZNR9YWNFSSYS', '14pcs brown rattan cookware set ', 'HLI-GSA2K6', 'Household ', '14PCS BROWN RATTAN COOKWARE SET — NEW COLOR! 🤎\n\nThe warm, homey luxury!\n\n✅ Rattan textured outside — beautiful, anti-scratch — looks like woven basket\n✅ Non-stick inside — cooks with less oil — easy to wash\n✅ Glass lids with vent — see food — no spill-over\n✅ Heavy bottom — works on gas, induction, electric — heats even\n✅ Detachable handle on fry pan — from your photo — easy storage, oven-safe\n\nWhat you get (14PCS):\n⏺️18x9CM Saucepan + Glass Lid with steam vent\n⏺️24x11CM Casserole + Glass Lid\n⏺️28x13CM Big Casserole + Glass Lid\n⏺️28x8CM Deep Fry Pan + Glass Lid-\n⏺️ 2PCS Wood-handle spatulas + 4PCS Silicon tools', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790246336975-346571.jpg', '15000.00', '12500.00', 5, 1, 5, 0, NULL, 1, '2026-09-24 13:38:56.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M39G0Z9GGYN5MAJ344CEVME5', '01M25M6D3AKMZMZNR9YWNFSSYS', '14pcs Luxury cast aluminum cookware set ', 'HLI-M7E3R6', 'Household ', '14PCS LUXURY CAST ALUMINUM COOKWARE SET *\n\n✅ Heavy Cast Aluminum — heats fast & even — food doesn\'t burn\n✅ Non-Stick Inside — easy cooking, easy cleaning — use less oil\n✅ Oven-Safe & Versatile — gas, electric, ceramic — all cookers\n\n (14PCS)*\n\n⏺️18x9CM Saucepan + Cast Alu Lid\n⏺️24x11CM Casserole + Cast Alu Lid\n⏺️28x13CM Casserole + Cast Alu Lid\n⏺️28x8CM Deep Fry Pan + Cast Alu Lid \n\n❇️2PCS Kitchen Tools (wood handle) + 4PCS Silicon Tools — total 6 tools', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790246420622-346577.jpg', '15000.00', '12500.00', 5, 1, 5, 0, NULL, 1, '2026-09-24 13:40:19.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M39G3W096XVNGFR4KX31QDA8', '01M25M6D3AKMZMZNR9YWNFSSYS', '13pcs Stainless steel cookware set ', 'HLI-XCJD89', 'Household ', 'UCC LIFE\n\n (13pcs Set )\n\n✴️Premium High quality Tripply S/S Stainless steel cookware set with Ribbed Patterned design.\n\n✴️Comes with Stainless steel lids with silicone pads for Protection from breakeges\n\n✴️ Heavy and Durable & Compatible with All cooktops.\n\nGas /Vitroceramic/Halogen/Induction.\n\nSIZES..\n\n❇️180cm Casserole \n\n❇️ 20cm Casserole  \n\n❇️24cm casserole \n\n❇️28cm Casserole \n\n❇️24cm Frying pan \n\n✴️4PCS Kitchen Tools ( 2pcs Silicon spoons  + Pot protector/ Insulation pads)', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790246515323-346578.jpg', '18000.00', '15000.00', 5, 1, 5, 0, NULL, 1, '2026-09-24 13:41:54.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M39GBNJC44E9ZE83T4TB9PTN', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Stainless steel cookware set with ribbed patterned design ', 'HLI-G9EBFD', 'Household ', 'UCC LIFE\n\n (15pcs Set )\n\n✴️Premium High quality Tripply S/S Stainless steel cookware set with Ribbed Patterned design.\n\n✴️Comes with Stainless steel lids with silicone pads for Protection from breakeges\n\n✴️ Heavy and Durable & Compatible with All cooktops.\n\nGas /Vitroceramic/Halogen/Induction.\n\nSIZES..\n\n❇️ 20cm Casserole  \n\n❇️24cm casserole \n\n❇️28cm Casserole \n\n❇️28cm Shallow Casserole \n\n❇️32cm Casserole \n\n\n✴️4PCS Kitchen Tools ( 2pcs Silicon spoons  + Pot protector/ Insulation pads)', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790246771215-346580.jpg', '19200.00', '16800.00', 5, 1, 5, 0, NULL, 1, '2026-09-24 13:46:10.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M39GEVA6S19ASZN4NT32PBRB', '01M25M6D3AKMZMZNR9YWNFSSYS', '10pcs titanium 18/10 stainless steel cookware set - wood handle ', 'HLI-RYS2XB', 'Household ', '10PCS TITANIUM 18/10 STAINLESS STEEL COOKWARE SET — Wood Handle\n\n✴️18/10 Stainless Steel* — highest food-grade — never rusts, lifetime\n✅ Three-Layer Composite — Steel + Aluminum + Steel — heats FAST, saves gas\n✴️ TITANIUM Coating Inside — golden brown non-stick — anti-scratch — use metal spoon\n✴️ Brown Amber Glass Lids — see food while cooking — keeps heat inside\n✴️Wood-look Handles* — stays cool, luxury look, comfortable grip\n✅ Works on ALL: Induction, Gas, Electric, Ceramic\n\n✨10pcs Includes \n\n⏺️18CM Saucepan\n⏺️22CM Casserole \n⏺️26CM Casserole\n⏺️28CM Casserole\n⏺️26CM Deep Fry Pan', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790246875353-346587.jpg', '22500.00', '18500.00', 0, 0, 5, 0, NULL, 1, '2026-09-24 13:47:54.000', '2026-10-05 15:23:11.000', 'GOOD'),
('01M39GJQGJ6G3TDEDDZTF3EG11', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Premium crocodile series ceramic pots', 'HLI-PET48H', 'Household ', 'MGC Premium Crocodile Series Ceramic pots..\n\n✴️9pcs Die Cast Marble Ceramic  Aluminium pots.\n\n✴️Non-stick Coating with induction Bottom.\n\n✅Beautiful Sets can be used for Cook & Serve for your Meals \n\n✴️PFAS  PFOA FREE Lead and Cadmium FREE.\n\nSIZES...\n\n⏺️18cm Casserole \n⏺️24cm Casserole \n⏺️24cm Shallow Casserole \n⏺️24cm Frying Pan\n\n💃Designed for the Noble you✨', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790247002918-346588.jpg', '16000.00', '13500.00', 0, 0, 5, 0, NULL, 1, '2026-09-24 13:50:01.000', '2026-10-05 15:22:44.000', 'GOOD'),
('01M39GPDTXC286DARVRT5F9QCZ', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Premium crocodile series ceramic pots ', 'HLI-ECV4VN', 'Household ', 'MGC Premium Crocodile Series Ceramic pots..\n\n✴️9pcs Die Cast Marble Ceramic  Aluminium pots.\n\n✴️Non-stick Coating with induction Bottom.\n\n✅Beautiful Sets can be used for Cook & Serve for your Meals \n\n✴️PFAS  PFOA FREE Lead and Cadmium FREE.\n\nSIZES...\n\n⏺️18cm Casserole \n⏺️24cm Casserole \n⏺️24cm Shallow Casserole \n⏺️24cm Frying Pan', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790247123911-346589.jpg', '13000.00', '11000.00', 5, 1, 5, 0, NULL, 1, '2026-09-24 13:52:02.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M39GRXXD312WBTB12F0GW80X', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Premium crocodile series ceramic pots ', 'HLI-JCG9DW', 'Household ', 'MGC Premium Crocodile Series Ceramic pots..\n\n✴️9pcs Die Cast Marble Ceramic  Aluminium pots.\n\n✴️Non-stick Coating with induction Bottom.\n\n✅Beautiful Sets can be used for Cook & Serve for your Meals \n\n✴️PFAS  PFOA FREE Lead and Cadmium FREE.\n\nSIZES...\n\n⏺️18cm Casserole \n⏺️24cm Casserole \n⏺️24cm Shallow Casserole \n⏺️24cm Frying Pan', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1790247205625-346590.jpg', '13000.00', '11000.00', 5, 1, 5, 0, NULL, 1, '2026-09-24 13:53:24.000', '2026-10-21 09:30:29.196', 'GOOD'),
('01M4833Q4W2GZMC733EBHQJHA2', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Executive 1.2m imported Study office desk', 'HLI-33B968', 'House hold ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791273067140-382031.jpg', '7500.00', '6000.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 10:51:05.000', '2026-10-06 10:51:07.165', 'GOOD'),
('01M483KZCB5PWS0AJWH0QDKFWY', '01M25M6D3AKMZMZNR9YWNFSSYS', '3-Tier Multi-Purpose Microwave & Kitchen Counter Organizer', 'HLI-ND53Q2', 'Household ', 'Space-saving 3-tier countertop stand designed to fit over your microwave or toaster oven. Features heavy-duty metal framing, upper storage shelves for jars and appliances, and side hanging hooks for kitchen utensils and towels.', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791273599475-382151.jpg', '2400.00', '1400.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 10:59:58.000', '2026-10-06 10:59:59.485', 'GOOD'),
('01M483P05HT9N9ZN8S2KWR4J6R', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Two tier fruit Rack- Gold black', 'HLI-KJQH3R', 'Household ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791273665342-382154.jpg', '1600.00', '800.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 11:01:04.000', '2026-10-06 11:01:05.351', 'GOOD'),
('01M483RF63PG2H8J4JD1T495AB', '01M25M6D3AKMZMZNR9YWNFSSYS', '3 Layer dishrack- green gold', 'HLI-Y8C3T6', 'Household ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791273746568-382157.jpg', '4100.00', '3100.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 11:02:25.000', '2026-10-06 11:02:26.574', 'GOOD'),
('01M483VJTMZQ4PFR9MAA4AC917', '01M25M6D3AKMZMZNR9YWNFSSYS', '3 Layer dishrack', 'HLI-Y2PGEE', 'Household ', 'Available in Gold and Black \nMaterial: carbon steel', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791273848683-382166.jpg', '2850.00', '1850.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 11:04:07.000', '2026-10-06 11:06:06.000', 'GOOD'),
('01M483X4K7QQNH3NQWS1B8K7BZ', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Gold dish rack', 'HLI-J3SSSY', 'Household ', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791273899347-382167.jpg', '2400.00', '1400.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 11:04:58.000', '2026-10-06 11:04:59.355', 'GOOD'),
('01M4846B8NY282E67HKVX4DFJT', '01M25M6D3AKMZMZNR9YWNFSSYS', '4 Tier Multifunctional Organizer Rack', 'HLI-CK48M8', 'Household ', 'Material: hard plastic \nColours: Cream\nUse: Organizer', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791274201239-382240.jpg', '2000.00', '1000.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 11:10:00.000', '2026-10-06 11:11:05.000', 'GOOD'),
('01M4872X2SZ5752ZXFZT1GSRXB', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Silk Duvets ', 'HLI-NJTQYZ', 'Household ', 'Bedsheet: 1 PC\nPillowcases: 2pcs\nCushion covers: 2pcs\nSize: 6*7\nAvailable colours: purple,cream, white,beige,gold,blue', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791277234164-382642.jpg', '5500.00', '4000.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 12:00:33.000', '2026-10-06 12:02:14.000', 'GOOD'),
('01M487QEEWW7NFMQSB6TQ26W91', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Velvet Duvets ', 'HLI-5GQKAD', 'Household ', '*Velvet duvet* \nSize: 6x7\nPillowcases: 2pcs\nBedsheet: 1pc\nVelvet Duvet: 1pc\nAvailable in colours listed in the image', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791277907377-382695.jpg', '4500.00', '3100.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 12:11:46.000', '2026-10-06 12:11:47.441', 'GOOD'),
('01M487XMHN49N3BQ2K33VXRP5X', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Single velvet wollen Duvets ', 'HLI-0T2SD3', 'Household ', 'Size: 5×6\nNote:\nNo pillowcases.\nNo bedsheets.\nNo bag.\nQuick Sale 🏃🏿‍♀️🏃🏿‍♀️🏃🏿‍♀️🏃🏿‍♀️🏃🏿‍♀️', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791278110510-382709.jpg', '2600.00', '1600.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 12:15:09.000', '2026-10-06 12:15:10.572', 'GOOD'),
('01M4881ZSXJE90QSC1WNECWTAC', '01M25M6D3AKMZMZNR9YWNFSSYS', '4stand nets', 'HLI-0STVXQ', 'Household ', 'Available in all colours \n4*6\n5*6\n6*6', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791278252934-382700.jpg', '1800.00', '900.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 12:17:31.000', '2026-10-06 12:17:52.000', 'GOOD'),
('01M4885RRH0R23PPJED5M6VJ5W', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Railnet nets', 'HLI-P86J2Y', 'Household ', 'Available in all colours \n4*6\n5*6\n6*6', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791278376645-382701.jpg', '4500.00', '3200.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 12:19:35.000', '2026-10-06 12:19:36.655', 'GOOD'),
('01M488AAG35HC0JEZY5Y6MJ551', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Canopy Nets', 'HLI-MJA5GR', 'Household ', 'Available colours: pink, purple, white,maroon\nSizes: 5*6, 6*6', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791278526644-382702.jpg', '8000.00', '6500.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 12:22:04.000', '2026-10-06 12:22:06.655', 'GOOD'),
('01M488YFCS603VJ38D2C0HMABP', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Plain curtains ', 'HLI-QAJVKG', 'Household ', 'Dimensions: 3m\nCurtains: 2pcs, 1.5m each pc.\nSheer: 1pc\nAvailable in green, maroon, grey, blue, royal blue, brown', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791279185907-382751.jpg', '3000.00', '2000.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 12:33:05.000', '2026-10-06 12:33:49.000', 'GOOD'),
('01M4896T0HG53WFBFYVT1505F5', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Kitchen mats', 'HLI-09QJJ4', 'Household ', '💠💠New Prints  kitchen mat \n💠💠set of 2pcs', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791279459479-382752.jpg', '2500.00', '1250.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 12:37:38.000', '2026-10-06 12:37:39.492', 'GOOD'),
('01M4897Z6VJBKSFNR0MAY5T0EF', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Kitchen mats ', 'HLI-2QQP4B', 'Household ', '💠💠New Prints  kitchen mat \n💠💠set of 2pcs', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791279497392-382753.jpg', '2500.00', '1250.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 12:38:16.000', '2026-10-06 12:38:17.422', 'GOOD'),
('01M48996788T0WB90Z3MFB6D2J', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Kitchen mats ', 'HLI-ESFYSJ', 'Household ', '💠💠New Prints  kitchen mat \n💠💠set of 2pcs', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791279537307-382754.jpg', '2500.00', '1250.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 12:38:56.000', '2026-10-06 12:38:57.377', 'GOOD'),
('01M489AFAP1VJ0WRRBAPKP86GB', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Kitchen mats ', 'HLI-5N88WM', 'Household ', '💠💠New Prints  kitchen mat \n💠💠set of 2pcs', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791279579313-382755.jpg', '2500.00', '1250.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 12:39:38.000', '2026-10-06 12:39:39.325', 'GOOD'),
('01M489BE2MPHER0PQRGTCZNMF0', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Kitchen mats ', 'HLI-RNY8CR', 'Household ', '💠💠New Prints  kitchen mat \n💠💠set of 2pcs', 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791279612227-382756.jpg', '2500.00', '1250.00', 0, 0, 5, 0, NULL, 1, '2026-10-06 12:40:09.000', '2026-10-06 12:40:12.239', 'GOOD'),
('01M4GRRV8K0TVGZ9NTZZ0YDGXW', '01KS2T078ZP2F30RMBZW23WPTX', 'iko nini', 'HLI-QAA2BE', 'Groceries', NULL, 'https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/products/1791564213632-videoframe_12314.png', '9.00', '0.00', 0, 0, 5, 0, NULL, 1, '2026-10-09 19:43:33.000', '2026-10-09 19:44:59.841', 'GOOD');
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `provider`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `provider` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `businessName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `county` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `photoUrl` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `settings` json DEFAULT NULL,
  `operationalSettings` json DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `whatsapp` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `workingHours` json DEFAULT NULL,
  `notificationSettings` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `provider` (`id`, `tenantId`, `userId`, `businessName`, `category`, `county`, `location`, `phone`, `photoUrl`, `settings`, `operationalSettings`, `isActive`, `createdAt`, `updatedAt`, `description`, `whatsapp`, `workingHours`, `notificationSettings`) VALUES 
('01KS2T079J1KX1532WEQBT8SE1', '01KS2T078ZP2F30RMBZW23WPTX', '01KS2T0792YWYJ9VHWDB74Y923', 'eDuka Inc', 'Other', 'Nairobi', 'Nairobi', '0790590653', NULL, NULL, NULL, 1, '2026-05-20 15:43:01.000', '2026-05-20 19:49:13.000', NULL, NULL, NULL, NULL),
('01KS4VMXJP3Q5Y8J9WEBVF5606', '01KS4VMXJAKJGJSFAP6B6YMW8K', '01KS4VMXJAB3Y581YPNBBPXDEQ', 'supermarket', 'Retail Store', 'Mandera', 'kakuma', '0706596038', NULL, NULL, NULL, 1, '2026-05-21 10:50:17.000', '2026-05-21 10:50:17.000', NULL, NULL, NULL, NULL),
('01KS55SQRSTYRQEP660YQ71NCA', '01KS55SQR6F4V0P9MXVBSWB9K5', '01KS55SQRBCBCVQMP1VBYWEX35', 'Chemist business ', 'Other', 'Siaya', 'Siaya ', '0741795735', NULL, NULL, NULL, 1, '2026-05-21 13:47:40.000', '2026-05-21 13:47:40.000', NULL, NULL, NULL, NULL),
('01KSF3RED8QEDSZ5JMZJ3D3KHF', '01KSF3RECR97MG8ZT1CX8GETPW', '01KSF3RECREQ8CX1AJN77SQKG7', 'Cal\'s retail', 'Retail Store', 'Nairobi', 'parklands ,Nairobi', '0756 410923', NULL, NULL, NULL, 1, '2026-05-25 10:24:25.000', '2026-05-25 10:33:03.000', NULL, NULL, NULL, NULL),
('01KSF8528345CW2XRR2N44RRBB', '01KSF85279ETEV8T615JSET95G', '01KSF8527BQCG3PYG1EV9CQKQT', 'Cal\'s retail', 'Retail Store', 'Nairobi', 'parklands ,Nairobi', '0756410923', NULL, NULL, NULL, 1, '2026-05-25 11:41:13.000', '2026-05-27 22:14:49.000', NULL, NULL, NULL, NULL),
('01KSFKPET3ZPEJY6GBHM4D4EAS', '01KSFKPESPPAQBTAFP0MWVWYNB', '01KSFKPESPZ01X5T0YHRMN3AJX', 'Mini shop', 'Retail Store', 'Kiambu', 'Makongeni phase 4', '0115902247', NULL, NULL, NULL, 1, '2026-05-25 15:02:57.000', '2026-05-25 15:11:04.000', NULL, NULL, NULL, NULL),
('01KT29DKW4STF3FF1CWQAY2BXH', '01KT29DKTW8BTVTFXE547GQ9JS', '01KT29DKTW03HP1CF0DJTVK302', 'Flo clothes', 'Fashion & Boutique', 'Migori', 'Suna west', '0705583647', NULL, NULL, NULL, 1, '2026-06-01 21:08:56.000', '2026-06-01 21:08:56.000', NULL, NULL, NULL, NULL),
('01KTMEK2S5HGJKF0FVJGGSY8TJ', '01KTMEK2Q8KRP0A1DVW1C5Q229', '01KTMEK2Q8DRGK3KD8BZMV7WQS', 'Salon', 'Spa & Beauty', 'Nairobi', 'Kibera Nairobi', '0702801495', NULL, NULL, NULL, 1, '2026-06-08 23:25:38.000', '2026-06-08 23:25:38.000', NULL, NULL, NULL, NULL),
('01KVGJF71K27MG12C4VG1SSK8G', '01KVGJF6YRSCQEGM4WHFPQ34ER', '01KVGJF6Z5P8Q0XDXGXKBXE2WE', 'Pioneer Agencies', 'Electrical Services', 'Nairobi', 'Nairobi', '0700366232', NULL, NULL, NULL, 1, '2026-06-19 21:32:10.000', '2026-09-21 19:37:23.000', NULL, NULL, NULL, NULL),
('01KVQH3VT48BD2B515HJ9NEGWR', '01KVQH3VSA02FZHNP25R3YAH12', '01KVQH3VSAW2RK9DM8G2W3MDNA', 'Glamorous-glady', 'Spa & Beauty', 'Meru', 'Meru', '0712472336', NULL, NULL, NULL, 1, '2026-06-22 14:23:10.000', '2026-10-05 15:44:05.000', NULL, NULL, NULL, NULL),
('01KWX6JHPF6EJ50SHJ9SJVY3DP', '01KWX6JHNRXNR3TE03SCPSR2YP', '01KWX6JHNSCPCXEHH9FBC26FMT', 'Abi', 'Fashion & Boutique', 'Nairobi', 'Tassia ', '0715292439', NULL, NULL, NULL, 1, '2026-07-07 05:30:05.000', '2026-07-07 05:30:05.000', NULL, NULL, NULL, NULL),
('01KY9P7QCWGWMATZ4DSQMY25T0', '01KY9P7QC53AZMRB7BNKTVQ47J', '01KY9P7QC5J0QV7VMRKHNVXJCQ', 'Skylar\'s Scented Serene', 'Cosmetics Shop', 'Nairobi', 'kibera', '0140025300', NULL, NULL, NULL, 1, '2026-07-24 12:10:23.000', '2026-07-24 12:10:23.000', NULL, NULL, NULL, NULL),
('01M1BT63H1T5YQ0JZEC2D22XR8', '01M1BT63GHD4C7V0V64M90BCYF', '01M1BT63GJ35HX5GWX5JY5106D', 'URBAN ORCHARD', 'Other', 'Nairobi', 'Kiambu', '0743603301', NULL, NULL, NULL, 1, '2026-08-31 14:44:58.000', '2026-08-31 14:44:58.000', NULL, NULL, NULL, NULL),
('01M25M6D7N86Q2S9PCP1H26YRA', '01M25M6D3AKMZMZNR9YWNFSSYS', '01M25M6D3ASYFNYRHS204T2RTY', 'Mercy\'s House Glow Hub', 'Other', 'Nairobi', 'Nairobi ', '0790016204', NULL, NULL, NULL, 1, '2026-09-10 15:20:32.000', '2026-10-06 15:36:59.000', NULL, NULL, NULL, NULL),
('01M34KB78DAA2W7R6KQGBN7997', '01M34KB789EGA0VFJ7D3QH916R', '01M34KB78967BW19DAGG2CBY1J', 'Qorami', 'Software Development', 'Kiambu', 'Kikuyu Town', '0790516067', NULL, NULL, NULL, 1, '2026-09-22 16:02:09.000', '2026-09-22 16:02:09.000', NULL, NULL, NULL, NULL);
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `push_subscriptions`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `push_subscriptions` (
  `id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endpoint` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `p256dh` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `auth` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_push_user` (`userId`),
  KEY `idx_push_tenant` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `receipt`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `receipt` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `saleId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `receiptNumber` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerPhone` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerEmail` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `htmlContent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `reportschedule`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `reportschedule` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `table` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `columns` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `filters` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `frequency` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipients` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastRun` datetime(3) DEFAULT NULL,
  `nextRun` datetime(3) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `request`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `request` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `providerId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serviceId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerPhone` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_providerId` (`providerId`),
  KEY `idx_customerId` (`customerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `request` (`id`, `tenantId`, `customerId`, `providerId`, `serviceId`, `customerName`, `customerPhone`, `message`, `status`, `createdAt`, `updatedAt`) VALUES 
('01M17A26R82B5Q9P1EQZGZQQW6', '01KVGJF6YRSCQEGM4WHFPQ34ER', NULL, NULL, NULL, 'Okombe', '0790590653', '{\"orderId\":\"01M17A26R82B5Q9P1EQZGZQQW6\",\"items\":[{\"id\":\"01KWTXVS4240GEHZDQGQTRS112\",\"name\":\"tt\",\"price\":260,\"quantity\":1,\"type\":\"PRODUCT\"},{\"id\":\"01M179R6SQ11F26V78FS29BECQ\",\"name\":\"Electrical utility \",\"price\":6,\"quantity\":1,\"type\":\"PRODUCT\"},{\"id\":\"01KVGJKV5NCRWWZTQZPE8ZGWW4\",\"name\":\"Motor Rewinding \",\"price\":5000,\"quantity\":1,\"type\":\"PRODUCT\"}],\"totalAmount\":5266,\"deliveryAddress\":\"G2\",\"notes\":\"Now\",\"customerEmail\":null,\"source\":\"PUBLIC_LINK\"}', 'PENDING', '2026-08-29 20:46:16.000', '2026-08-29 20:46:16.000'),
('01M1DT3D5WQ9XNYT7P32KJPS16', '01KSF85279ETEV8T615JSET95G', NULL, NULL, NULL, 'mimi', '0790590653', '{\"orderId\":\"01M1DT3D5WQ9XNYT7P32KJPS16\",\"items\":[{\"id\":\"01KSFHD3FCEXVHVDAA8N66HC58\",\"name\":\"Eggs (yellow yolk)\",\"price\":350,\"quantity\":1,\"type\":\"PRODUCT\"},{\"id\":\"01KSFHA5TC2Q3XEMBEGMFZ82Y4\",\"name\":\"Black berry jam\",\"price\":120,\"quantity\":1,\"type\":\"PRODUCT\"},{\"id\":\"01KSFH1M0HZQJTSCDA88GR506V\",\"name\":\"Sliced Bread\",\"price\":60,\"quantity\":1,\"type\":\"PRODUCT\"},{\"id\":\"01KSFG69F2AKCCCNKKPG5S6KQT\",\"name\":\"fresh milk\",\"price\":55,\"quantity\":1,\"type\":\"PRODUCT\"},{\"id\":\"01KSFGYZ584THFFGXRY66XKG3W\",\"name\":\"Air freshener\",\"price\":105,\"quantity\":1,\"type\":\"PRODUCT\"}],\"totalAmount\":690,\"deliveryAddress\":\"fortjesus\",\"notes\":\"Ni mimi na-test tu husjali\",\"customerEmail\":null,\"source\":\"PUBLIC_LINK\"}', 'CONTACTED', '2026-09-01 09:21:59.000', '2026-09-01 09:22:54.000'),
('01M1DTJGT5JJ7VN99BR6A7VZ5X', '01KSF85279ETEV8T615JSET95G', NULL, NULL, NULL, 'hhh', 'hh', '{\"orderId\":\"01M1DTJGT5JJ7VN99BR6A7VZ5X\",\"items\":[{\"id\":\"01KSFHA5TC2Q3XEMBEGMFZ82Y4\",\"name\":\"Black berry jam\",\"price\":120,\"quantity\":8,\"type\":\"PRODUCT\"}],\"totalAmount\":960,\"deliveryAddress\":\"hh\",\"notes\":\"hh\",\"customerEmail\":null,\"source\":\"PUBLIC_LINK\"}', 'PENDING', '2026-09-01 09:30:14.000', '2026-09-01 09:30:14.000'),
('01M2QR8016FF82XK66QG2JZ3JP', '01KVQH3VSA02FZHNP25R3YAH12', '01M2QR80198JF0FDHVPYD2F0S4', NULL, NULL, 'Doreen Kendi', '07122336', '{\"orderId\":\"01M2QR8016FF82XK66QG2JZ3JP\",\"saleId\":\"01M2QR8016NNN9EV1ZE8RXCCCG\",\"items\":[{\"id\":\"res_198f09c091fd4494\",\"name\":\"Toyota\",\"price\":4500,\"quantity\":1,\"type\":\"ROOM\"}],\"totalAmount\":4500,\"deliveryAddress\":\"westlands\",\"notes\":null,\"customerEmail\":null,\"paymentOption\":\"PAY_ON_DELIVERY\",\"paymentMethod\":\"CASH_ON_DELIVERY\",\"checkoutRequestId\":null,\"source\":\"PUBLIC_LINK\"}', 'PENDING', '2026-09-17 16:17:38.000', '2026-09-17 16:17:38.000'),
('01M3Z1VGFT8NXWHWV0X1HDHZ02', '01KVGJF6YRSCQEGM4WHFPQ34ER', '01M3Z1VGG5QDFJCYKCRDDBG3J9', NULL, NULL, 'H', '085855', '{\"orderId\":\"01M3Z1VGFT8NXWHWV0X1HDHZ02\",\"saleId\":\"01M3Z1VGFTRAAN0Z7S6FVVA0G3\",\"items\":[{\"id\":\"01KWTXVS4240GEHZDQGQTRS112\",\"name\":\"tt\",\"price\":260,\"quantity\":1,\"type\":\"PRODUCT\"}],\"totalAmount\":260,\"deliveryAddress\":null,\"notes\":null,\"customerEmail\":null,\"paymentOption\":\"PAY_ON_DELIVERY\",\"paymentMethod\":\"CASH_ON_DELIVERY\",\"checkoutRequestId\":null,\"source\":\"PUBLIC_LINK\"}', 'PENDING', '2026-10-02 22:35:58.000', '2026-10-02 22:35:58.000'),
('01M4DVYE14CEA76143A93YJPGV', '01M49NKSVTA48XGXHB042P78QK', '01M4DVYE18YAAQE4RD32EXVXZ7', NULL, NULL, 'ben', '0790590655', '{\"orderId\":\"01M4DVYE14CEA76143A93YJPGV\",\"saleId\":\"01M4DVYE14D8R4KJJD7T2SQH33\",\"items\":[{\"id\":\"01M49NZHZ91DEK4PZXX22BDMX5\",\"name\":\"ljoijoi\",\"price\":87,\"quantity\":1,\"type\":\"PRODUCT\"}],\"totalAmount\":87,\"deliveryAddress\":\"hgjg\",\"notes\":\"hghg\",\"customerEmail\":null,\"paymentOption\":\"PAY_UPFRONT\",\"paymentMethod\":\"ONLINE_MPESA\",\"checkoutRequestId\":\"ws_CO_08102026164118487790590653\",\"source\":\"PUBLIC_LINK\"}', 'PENDING', '2026-10-08 16:41:19.000', '2026-10-08 16:41:19.000'),
('01M4T4S9K5XNX1ZEA8RXRB6268', '01M49NKSVTA48XGXHB042P78QK', '01M4T4S9KB7RGMBAAKNJQ4YFA8', NULL, NULL, 'benja', '0790598464', '{\"orderId\":\"01M4T4S9K5XNX1ZEA8RXRB6268\",\"saleId\":\"01M4T4S9K62RD1B63DMV4YE2SY\",\"items\":[{\"id\":\"01M49NZHZ91DEK4PZXX22BDMX5\",\"name\":\"ljoijoi\",\"price\":87,\"quantity\":11,\"type\":\"PRODUCT\"}],\"totalAmount\":957,\"deliveryAddress\":\"yguuy\",\"notes\":\"uyuybuy\",\"customerEmail\":null,\"paymentOption\":\"PAY_DIRECT\",\"paymentMethod\":\"MPESA_PAYBILL\",\"checkoutRequestId\":null,\"paymentEvidence\":{\"transactionCode\":\"UJ7LR8MWZ0\",\"methodType\":\"MPESA_PAYBILL\",\"paidAmount\":957,\"receiptUrl\":\"https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/receipts/1791878780892-WhatsApp_Image_2026-10-12_at_12.09.03.jpeg\"},\"transactionCode\":\"UJ7LR8MWZ0\",\"receiptUrl\":\"https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/receipts/1791878780892-WhatsApp_Image_2026-10-12_at_12.09.03.jpeg\",\"source\":\"PUBLIC_LINK\"}', 'PENDING', '2026-10-13 11:06:41.000', '2026-10-13 11:06:41.000'),
('01M4T6ZA3AHT16Y7MXT4ZZFMNT', '01M4T6ECE60B8F3B681158YYNQ', '01M4T6ZA3K63869A8T0EWM1EZK', NULL, NULL, 'erger', '67876', '{\"orderId\":\"01M4T6ZA3AHT16Y7MXT4ZZFMNT\",\"saleId\":\"01M4T6ZA3BGX40E7KHWNGNWMZP\",\"items\":[{\"id\":\"01M4T6J7Z0S78J4ZTEPWQ8S6Q8\",\"name\":\"dgrtr\",\"price\":9,\"quantity\":1,\"type\":\"PRODUCT\"}],\"totalAmount\":9,\"deliveryAddress\":\"hgh\",\"notes\":\"jhg\",\"customerEmail\":null,\"paymentOption\":\"PAY_DIRECT\",\"paymentMethod\":\"MPESA_PAYBILL\",\"checkoutRequestId\":null,\"paymentEvidence\":{\"transactionCode\":\"ETYTYT\",\"methodType\":\"MPESA_PAYBILL\",\"paidAmount\":9},\"transactionCode\":\"ETYTYT\",\"receiptUrl\":null,\"source\":\"PUBLIC_LINK\"}', 'PENDING', '2026-10-13 11:44:55.000', '2026-10-13 11:44:55.000'),
('01M4T9JKAMQTX5D9HCKS6WFEBH', '01M4T6ECE60B8F3B681158YYNQ', '01M4T9JKARNZ33JGR2D8B00DAE', NULL, NULL, 'kjhiin', 'njnjn', '{\"orderId\":\"01M4T9JKAMQTX5D9HCKS6WFEBH\",\"saleId\":\"01M4T9JKAM3A6QAW711RPQAJDP\",\"items\":[{\"id\":\"01M4T6J7Z0S78J4ZTEPWQ8S6Q8\",\"name\":\"dgrtr\",\"price\":9,\"quantity\":1,\"type\":\"PRODUCT\"}],\"totalAmount\":9,\"deliveryAddress\":\"jnjkn\",\"notes\":\"jknjnkj\",\"customerEmail\":null,\"paymentOption\":\"PAY_DIRECT\",\"paymentMethod\":\"MPESA_PAYBILL\",\"checkoutRequestId\":null,\"paymentEvidence\":{\"transactionCode\":\"AC001\",\"methodType\":\"MPESA_PAYBILL\",\"paidAmount\":9},\"transactionCode\":\"AC001\",\"receiptUrl\":null,\"source\":\"PUBLIC_LINK\"}', 'PENDING', '2026-10-13 12:30:24.000', '2026-10-13 12:30:24.000'),
('01M4TBKSW393EGYWERBTA20TMA', '01M4T6ECE60B8F3B681158YYNQ', '01M4TBKSW6NHT110Y5321TSFKR', NULL, NULL, 'Benjamin', '0790596978', '{\"orderId\":\"01M4TBKSW393EGYWERBTA20TMA\",\"saleId\":\"01M4TBKSW3XVSK9X4GVGSTYE53\",\"items\":[{\"id\":\"01M4T6J7Z0S78J4ZTEPWQ8S6Q8\",\"name\":\"dgrtr\",\"price\":9,\"quantity\":1,\"type\":\"PRODUCT\"}],\"totalAmount\":9,\"deliveryAddress\":\"westy\",\"notes\":\"any desc\",\"customerEmail\":null,\"paymentOption\":\"PAY_DIRECT\",\"paymentMethod\":\"MPESA_PAYBILL\",\"checkoutRequestId\":null,\"paymentEvidence\":{\"transactionCode\":\"UJ7LR8MWZ0\",\"receiptUrl\":\"https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/receipts/1791885929078-WhatsApp_Image_2026-10-11_at_14.36.24.jpeg\",\"methodType\":\"MPESA_PAYBILL\",\"paidAmount\":9},\"transactionCode\":\"UJ7LR8MWZ0\",\"receiptUrl\":\"https://api.hlynk.co.ke/api/v1/storage/hlynk-uploads/receipts/1791885929078-WhatsApp_Image_2026-10-11_at_14.36.24.jpeg\",\"source\":\"PUBLIC_LINK\"}', 'PENDING', '2026-10-13 13:06:01.000', '2026-10-13 13:06:01.000');
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `resource`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `resource` (
  `id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parentId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `basePrice` decimal(15,2) NOT NULL DEFAULT '0.00',
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'AVAILABLE',
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
-- STATEMENT_BOUNDARY --
INSERT INTO `resource` (`id`, `tenantId`, `type`, `title`, `code`, `parentId`, `basePrice`, `status`, `meta`, `createdAt`, `updatedAt`) VALUES 
('res_198f09c091fd4494', '01KVQH3VSA02FZHNP25R3YAH12', 'ROOM', 'Toyota', 'Kkk345', 'res_8252bcdf8f9a4c2b', '4500.00', 'OCCUPIED', NULL, '2026-09-17 16:14:24.000', '2026-09-17 16:20:08.000'),
('res_8252bcdf8f9a4c2b', '01KVQH3VSA02FZHNP25R3YAH12', 'PROPERTY', 'Main yard', NULL, NULL, '0.00', 'AVAILABLE', NULL, '2026-09-17 16:11:48.000', '2026-09-17 16:12:32.000');
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `sale`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `sale` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `totalAmount` decimal(10,2) NOT NULL,
  `paymentMethod` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'CASH',
  `source` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'In-Store',
  `mpesaReceipt` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mpesaRequestId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `saleitem`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `saleitem` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `saleId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `buyingPrice` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `idx_saleId` (`saleId`),
  KEY `idx_productId` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `service`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `service` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) NOT NULL,
  `duration` int DEFAULT '60',
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `session`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `session` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userAgent` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ipAddress` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastActive` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `isActive` tinyint(1) DEFAULT '1',
  `isImpersonation` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `displacedBy` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `session` (`id`, `userId`, `token`, `userAgent`, `ipAddress`, `lastActive`, `isActive`, `isImpersonation`, `createdAt`, `displacedBy`) VALUES 
('01M5F9NDJKSMZNFMP8GPTFQG1K', '01KS2T0792YWYJ9VHWDB74Y923', 'ea2e83ec6c6600cec7cc40c666a8ac34577d68b5378ee1b05ba99cff98fd2ca4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '::1', '2026-10-21 16:32:53.000', 0, 0, '2026-10-21 16:15:59.000', NULL),
('01M5H7MZV50QM1630RCPPYYAHK', '01KS2T0792YWYJ9VHWDB74Y923', '67dce205f5e71e83fdef943f51ecda1067f063225c190b1a4fc22ba00db3a261', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '::1', '2026-10-23 09:03:41.000', 0, 0, '2026-10-22 10:19:17.000', NULL),
('01M5PBDESD1SKKBG4J1AY6G8PX', '01KS2T0792YWYJ9VHWDB74Y923', '9c3dd42389e8e20b989206fdf7750c3428596f0088eae3bcf19ee6407fb17883', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36', '::1', '2026-10-24 11:08:11.000', 1, 0, '2026-10-24 10:01:17.000', NULL),
('01M5PFHQMGV7QWMDSS3Q44FFBB', '01KS2T0792YWYJ9VHWDB74Y923', '5b66dd46c2fad24b35b97dd9bae5fb33fe8d41628edae0f3d06c47ff1c2dacab', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36', '::1', '2026-10-24 11:15:19.000', 1, 0, '2026-10-24 11:13:31.000', NULL),
('01M60J3DRZ8XGSK64YEE55E874', '01KS2T0792YWYJ9VHWDB74Y923', '2eb73d28cb702a8b052fc158bd2e434b42268a66be385288034fe490df1fa45d', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36', '::1', '2026-10-28 15:52:58.000', 1, 0, '2026-10-28 09:10:32.000', NULL),
('01M61949KXYKJ66TYJVQSJPRAP', '01M25M6D3ASYFNYRHS204T2RTY', '7595a7eca0180b3b00c8e3fe171094bf7e0e11278dc85e4af3d3660a730145c3', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36', '::1', '2026-10-28 17:52:35.000', 1, 1, '2026-10-28 15:52:58.000', NULL);
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `subscription`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `subscription` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `planName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'STARTER',
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
-- STATEMENT_BOUNDARY --
INSERT INTO `subscription` (`id`, `tenantId`, `planName`, `startDate`, `endDate`, `trialEndDate`, `isTrial`, `hasUsedTrial`, `createdAt`, `updatedAt`, `status`) VALUES 
('01KS2T079PKH4AC4R5FYXY36S1', '01KS2T078ZP2F30RMBZW23WPTX', 'MAX', '2026-05-20 15:43:01.688', '2026-05-19 23:03:10.120', '2026-05-27 15:43:01.000', 0, 0, '2026-05-20 15:43:01.000', '2026-05-20 23:03:10.000', 1),
('01KS4VMXJV03YD9KJJX88RKKE0', '01KS4VMXJAKJGJSFAP6B6YMW8K', 'LITE', '2026-05-21 10:50:17.308', '2026-09-25 10:32:12.813', '2026-05-28 10:50:17.000', 0, 0, '2026-05-21 10:50:17.000', '2026-09-26 00:00:00.000', 1),
('01KS55SQRZ2MCK7B60G5EX87C3', '01KS55SQR6F4V0P9MXVBSWB9K5', 'LITE', '2026-05-21 13:47:40.961', NULL, '2026-05-28 13:47:40.000', 0, 0, '2026-05-21 13:47:40.000', '2026-05-28 23:00:00.000', 1),
('01KSF3REDJQY5B53VV7DC3G84C', '01KSF3RECR97MG8ZT1CX8GETPW', 'LITE', '2026-05-25 10:24:25.779', NULL, '2026-06-01 10:24:25.000', 0, 0, '2026-05-25 10:24:25.000', '2026-06-01 23:00:00.000', 1),
('01KSF8528DKH17A4PJ4TDA4286', '01KSF85279ETEV8T615JSET95G', 'MAX', '2026-05-25 11:41:13.614', '2026-09-25 10:29:53.065', '2026-06-10 22:12:01.430', 0, 0, '2026-05-25 11:41:13.000', '2026-09-26 00:00:00.000', 1),
('01KSFKPET7XH1C96GWPRQTEDW8', '01KSFKPESPPAQBTAFP0MWVWYNB', 'LITE', '2026-05-25 15:02:57.867', NULL, '2026-06-01 15:02:57.000', 0, 0, '2026-05-25 15:02:57.000', '2026-06-01 23:00:00.000', 1),
('01KT29DKWTPJ1YQZ0SP35R2MN3', '01KT29DKTW8BTVTFXE547GQ9JS', 'LITE', '2026-06-01 21:08:56.616', '2026-09-25 10:32:12.742', '2026-06-08 21:08:56.000', 0, 0, '2026-06-01 21:08:56.000', '2026-09-26 00:00:00.000', 1),
('01KTMEK2TH4KPBV5EAHPX344B3', '01KTMEK2Q8KRP0A1DVW1C5Q229', 'LITE', '2026-06-08 23:25:38.397', NULL, '2026-06-22 23:25:38.000', 0, 0, '2026-06-08 23:25:38.000', '2026-06-23 00:00:00.000', 1),
('01KVGJF7230X297BV48VE0DQS1', '01KVGJF6YRSCQEGM4WHFPQ34ER', 'MAX', '2026-06-19 21:32:10.056', '2026-10-30 22:58:25.183', '2026-07-03 21:32:10.000', 0, 0, '2026-06-19 21:32:10.000', '2026-09-30 22:58:25.000', 0),
('01KVQH3VTHETK1CJXCANM62A4C', '01KVQH3VSA02FZHNP25R3YAH12', 'MAX', '2026-06-22 14:23:10.547', '2026-10-17 16:05:56.069', '2026-07-06 14:23:10.000', 0, 0, '2026-06-22 14:23:10.000', '2026-10-20 00:00:00.000', 1),
('01KWX6JHPJHY6XT6BS48615CT3', '01KWX6JHNRXNR3TE03SCPSR2YP', 'MAX', '2026-07-07 05:30:05.779', '2026-10-30 22:58:25.215', '2026-07-21 05:30:05.000', 0, 0, '2026-07-07 05:30:05.000', '2026-09-30 22:58:25.000', 0),
('01KY9P7QD6KJ55H26HCGT7Y41R', '01KY9P7QC53AZMRB7BNKTVQ47J', 'MAX', '2026-07-24 12:10:23.398', '2026-10-25 10:32:12.575', '2026-08-07 12:10:23.000', 0, 0, '2026-07-24 12:10:23.000', '2026-10-28 13:34:26.000', 1),
('01M1BT63H2YNKX5038BKTQ7XFR', '01M1BT63GHD4C7V0V64M90BCYF', 'MAX', '2026-08-31 14:44:58.915', '2026-10-30 22:58:25.203', '2026-09-14 14:44:58.000', 0, 0, '2026-08-31 14:44:58.000', '2026-09-30 22:58:25.000', 0),
('01M25M6D84JCSTHNRJM2X9QTPJ', '01M25M6D3AKMZMZNR9YWNFSSYS', 'MAX', '2026-09-10 15:20:32.646', '2026-10-23 16:17:25.746', '2026-09-24 15:20:32.000', 0, 0, '2026-09-10 15:20:32.000', '2026-10-28 13:34:26.000', 1),
('01M34KB78DAYZ7VX1T9SJ85ZEV', '01M34KB789EGA0VFJ7D3QH916R', 'MAX', '2026-09-22 16:02:09.166', NULL, '2026-10-06 16:02:09.000', 0, 0, '2026-09-22 16:02:09.000', '2026-10-08 00:00:00.000', 1);
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `systemevent`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `systemevent` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'INFO',
  `category` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `method` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `path` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statusCode` int DEFAULT NULL,
  `durationMs` int DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_tenantId` (`tenantId`),
  KEY `idx_category` (`category`),
  KEY `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `systemnotification`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `systemnotification` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenantId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `isRead` tinyint(1) DEFAULT '0',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenantId`),
  KEY `idx_user` (`userId`),
  KEY `idx_created` (`createdAt`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `systemsetting`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `systemsetting` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dataType` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'STRING',
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `systemsettings`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `systemsettings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `maintenanceMode` tinyint(1) DEFAULT '0',
  `allowNewProviders` tinyint(1) DEFAULT '1',
  `platformFeePercentage` decimal(5,2) DEFAULT '5.00',
  `supportEmail` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `systemsettings` (`id`, `maintenanceMode`, `allowNewProviders`, `platformFeePercentage`, `supportEmail`, `updatedAt`) VALUES 
(1, 0, 1, '5.00', 'info@hlynk.co.ke', '2026-05-20 14:24:29.000');
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `tenant`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `tenant` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `referralCode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referredById` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `businessName` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `payoutMethod` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'MPESA',
  `payoutAccount` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isTrial` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `referredBy` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `businessType` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'RETAIL',
  `activeModules` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `referralCode` (`referralCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `tenant` (`id`, `slug`, `referralCode`, `referredById`, `businessName`, `isActive`, `payoutMethod`, `payoutAccount`, `isTrial`, `createdAt`, `updatedAt`, `referredBy`, `businessType`, `activeModules`) VALUES 
('01KS2T078ZP2F30RMBZW23WPTX', 'hlynk-inc', 'EDUKNYJB', NULL, 'hlynk Inc', 1, 'MPESA', NULL, 0, '2026-05-20 15:43:01.000', '2026-10-08 15:47:42.945', NULL, 'RETAIL', NULL),
('01KS4VMXJAKJGJSFAP6B6YMW8K', 'supermarket', NULL, NULL, 'supermarket', 1, 'MPESA', NULL, 1, '2026-05-21 10:50:17.000', '2026-05-21 10:50:17.000', NULL, 'RETAIL', NULL),
('01KS55SQR6F4V0P9MXVBSWB9K5', 'chemist-business', NULL, NULL, 'Chemist business ', 1, 'MPESA', NULL, 1, '2026-05-21 13:47:40.000', '2026-05-21 13:47:40.000', NULL, 'RETAIL', NULL),
('01KSF3RECR97MG8ZT1CX8GETPW', 'cal-s-retail', NULL, NULL, 'Cal\'s retail', 1, 'MPESA', NULL, 1, '2026-05-25 10:24:25.000', '2026-05-25 10:24:25.000', NULL, 'RETAIL', NULL),
('01KSF85279ETEV8T615JSET95G', 'cal-s-retail-1', 'CALSMOGX', NULL, 'Cal\'s retail', 1, 'MPESA', NULL, 0, '2026-05-25 11:41:13.000', '2026-06-12 16:49:44.000', NULL, 'RETAIL', NULL),
('01KSFKPESPPAQBTAFP0MWVWYNB', 'mini-shop', NULL, NULL, 'Mini shop', 1, 'MPESA', NULL, 1, '2026-05-25 15:02:57.000', '2026-05-25 15:02:57.000', NULL, 'RETAIL', NULL),
('01KT29DKTW8BTVTFXE547GQ9JS', 'flo-clothes', NULL, NULL, 'Flo clothes', 1, 'MPESA', NULL, 1, '2026-06-01 21:08:56.000', '2026-06-01 21:08:56.000', NULL, 'RETAIL', NULL),
('01KTMEK2Q8KRP0A1DVW1C5Q229', 'salon', 'SALOHON5', NULL, 'Salon', 1, 'MPESA', NULL, 1, '2026-06-08 23:25:38.000', '2026-06-08 23:25:38.000', NULL, 'RETAIL', NULL),
('01KVGJF6YRSCQEGM4WHFPQ34ER', 'pioneer-agencies', 'PION08B4', NULL, 'Pioneer Agencies', 1, 'MPESA', NULL, 1, '2026-06-19 21:32:09.000', '2026-09-21 19:37:23.000', NULL, 'RETAIL', 'POS'),
('01KVQH3VSA02FZHNP25R3YAH12', 'glamorous-glady', 'GLAMBUO3', NULL, 'Glamorous-glady', 1, 'MPESA', NULL, 1, '2026-06-22 14:23:10.000', '2026-09-17 16:37:43.000', NULL, 'RETAIL', 'POS'),
('01KWX6JHNRXNR3TE03SCPSR2YP', 'abi', 'ABISI77', NULL, 'Abi', 1, 'MPESA', NULL, 1, '2026-07-07 05:30:05.000', '2026-07-07 05:30:05.000', NULL, 'RETAIL', NULL),
('01KY9P7QC53AZMRB7BNKTVQ47J', 'skylar-s-scented-serene', 'SKYLMREV', NULL, 'Skylar\'s Scented Serene', 1, 'MPESA', NULL, 1, '2026-07-24 12:10:23.000', '2026-07-24 12:10:23.000', NULL, 'RETAIL', NULL),
('01M1BT63GHD4C7V0V64M90BCYF', 'urban-orchard', 'URBAKOBD', NULL, 'URBAN ORCHARD', 1, 'MPESA', NULL, 1, '2026-08-31 14:44:58.000', '2026-08-31 14:44:58.000', NULL, 'RETAIL', NULL),
('01M25M6D3AKMZMZNR9YWNFSSYS', 'mercy-s-household-hub', 'MERCMX18', NULL, 'Mercy\'s House Glow Hub', 1, 'MPESA', NULL, 1, '2026-09-10 15:20:32.000', '2026-10-06 15:36:59.000', NULL, 'RETAIL', 'POS'),
('01M34KB789EGA0VFJ7D3QH916R', 'qorami', 'QORALWVT', NULL, 'Qorami', 1, 'MPESA', NULL, 1, '2026-09-22 16:02:09.000', '2026-09-22 16:02:09.000', NULL, 'RETAIL', NULL);
-- STATEMENT_BOUNDARY --
DROP TABLE IF EXISTS `user`;
-- STATEMENT_BOUNDARY --
CREATE TABLE `user` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passwordHash` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'CUSTOMER',
  `otp` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otpExpiresAt` datetime(3) DEFAULT NULL,
  `phoneVerified` tinyint(1) DEFAULT '0',
  `photoUrl` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `eulaAcceptedAt` datetime DEFAULT NULL,
  `permissions` json DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `commissionType` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'NONE',
  `commissionRate` decimal(10,2) DEFAULT '0.00',
  `baseSalary` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- STATEMENT_BOUNDARY --
INSERT INTO `user` (`id`, `tenantId`, `name`, `phone`, `email`, `passwordHash`, `role`, `otp`, `otpExpiresAt`, `phoneVerified`, `photoUrl`, `eulaAcceptedAt`, `permissions`, `isActive`, `createdAt`, `updatedAt`, `commissionType`, `commissionRate`, `baseSalary`) VALUES 
('01KS2T0792YWYJ9VHWDB74Y923', '01KS2T078ZP2F30RMBZW23WPTX', 'Okombe Mabenjo', '0790590653', 'mkapabenjamin254@gmail.com', 'GOOGLE_AUTH', 'SUPER_ADMIN', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocJc3N4SJ4j44dr46yhkEYnwc9s1RV1rG8H6ie1z21OLf0d8AJWZ=s96-c', NULL, NULL, 1, '2026-05-20 15:43:01.000', '2026-10-08 15:46:45.022', 'NONE', '0.00', '0.00'),
('01KS4VMXJAB3Y581YPNBBPXDEQ', '01KS4VMXJAKJGJSFAP6B6YMW8K', 'lilian wambui', '0706596038', 'lilian1executivesupportva@gmail.com', 'GOOGLE_AUTH', 'PROVIDER', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocJ89FGnX7ZpMHJRWfoNp-uzVv_he9s93fBxRqHR5dylT4cmAg=s96-c', NULL, NULL, 1, '2026-05-21 10:50:17.000', '2026-05-21 10:50:17.000', 'NONE', '0.00', '0.00'),
('01KS55SQRBCBCVQMP1VBYWEX35', '01KS55SQR6F4V0P9MXVBSWB9K5', 'Okelo Lourine', '0741795735', 'okelolourine@gmail.com', 'GOOGLE_AUTH', 'PROVIDER', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocIjoRoWkriLvEJpnXX60b_CAleR_ekVHRGR5es7jmyQo0D_eg=s96-c', NULL, NULL, 1, '2026-05-21 13:47:40.000', '2026-05-21 13:47:40.000', 'NONE', '0.00', '0.00'),
('01KSF8527BQCG3PYG1EV9CQKQT', '01KSF85279ETEV8T615JSET95G', 'Calvin', '0756410923', 'calvingilbert310@gmail.com', 'GOOGLE_AUTH', 'PROVIDER', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocJrKrWLoJGulIBWJyYp3qJ6MqA2v0jZA4u2SbdM8NR28SNfQg=s96-c', NULL, NULL, 1, '2026-05-25 11:41:13.000', '2026-05-25 11:42:31.000', 'NONE', '0.00', '0.00'),
('01KSNH80R9TKYK1M2NNTZBC4W1', '01KSF85279ETEV8T615JSET95G', 'Walk-in Customer', '0113842534', NULL, '', 'CUSTOMER', NULL, NULL, 0, NULL, NULL, NULL, 1, '2026-05-27 22:15:34.000', '2026-05-27 22:15:34.000', 'NONE', '0.00', '0.00'),
('01KSNJ3ZF4JFF7SDGVSTFMBAC8', '01KSF85279ETEV8T615JSET95G', 'JOAN MWANIKI', '0700234567', 'Joan@gmail.com', '$2a$10$TOjHF65azWVqKf4XBRd.LeiOrx6OoBxr0p63xSMC7w9jI6qjOjkmC', 'STAFF', NULL, NULL, 1, NULL, NULL, 'sales', 1, '2026-05-27 22:30:50.000', '2026-05-27 22:30:50.000', 'NONE', '0.00', '0.00'),
('01KT29DKTW03HP1CF0DJTVK302', '01KT29DKTW8BTVTFXE547GQ9JS', 'Redempta oenga', '0705583647', 'oengaredempta@gmail.com', 'GOOGLE_AUTH', 'PROVIDER', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocJ47DlGrLiiJgitBPDtY5APdVT4i9S0LKndLQzLg1sJk7_BOQ=s96-c', NULL, NULL, 1, '2026-06-01 21:08:56.000', '2026-06-01 21:08:56.000', 'NONE', '0.00', '0.00'),
('01KTMEK2Q8DRGK3KD8BZMV7WQS', '01KTMEK2Q8KRP0A1DVW1C5Q229', 'Priscah Linet', '0702801495', 'priscahlinet685@gmail.com', 'GOOGLE_AUTH', 'PROVIDER', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocLtP1dH7Q71hmVYRSFAbLy2_K39lqMD0CKzkeh7n9YZEsZoJw=s96-c', '2026-06-08 23:25:38.000', NULL, 1, '2026-06-08 23:25:38.000', '2026-06-08 23:25:38.000', 'NONE', '0.00', '0.00'),
('01KVGJF6Z5P8Q0XDXGXKBXE2WE', '01KVGJF6YRSCQEGM4WHFPQ34ER', 'ELISHA odhiambo', '0700366232', 'elisha39635661@gmail.com', 'GOOGLE_AUTH', 'PROVIDER', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocK8JnHFyuae5DYhSWHnTmNYLYvu-0XBjgel24wld5dnzuRKGgJO=s96-c', '2026-06-19 21:32:10.000', NULL, 1, '2026-06-19 21:32:10.000', '2026-06-19 21:32:10.000', 'NONE', '0.00', '0.00'),
('01KVQH3VSAW2RK9DM8G2W3MDNA', '01KVQH3VSA02FZHNP25R3YAH12', 'doreen gatobu', '0712472336', 'gatobudoreen3@gmail.com', 'GOOGLE_AUTH', 'PROVIDER', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocLktvDJosLdkeImHd3YkxogsxHpf4FHGs3KiICjR3_idhoXLW0=s96-c', '2026-06-22 14:23:10.000', NULL, 1, '2026-06-22 14:23:10.000', '2026-06-22 14:23:10.000', 'NONE', '0.00', '0.00'),
('01KVQJJ64G3H8CQ6JPTV26WF5D', '01KVQH3VSA02FZHNP25R3YAH12', 'Dory', '0710644525', 'doreenmwakyuna@gmail.com', '$2a$10$MsKt.32IgPcDKPWCOb8G9uVMQn9YNDmsmtGEwm3cHBR2XiEImThOe', 'STAFF', NULL, NULL, 1, NULL, NULL, 'sales', 'customers', 'overview', 'reports', 'logs', 1, '2026-06-22 14:48:28.000', '2026-06-22 14:48:28.000', 'PERCENTAGE', '10.00', '0.00'),
('01KWX6JHNSCPCXEHH9FBC26FMT', '01KWX6JHNRXNR3TE03SCPSR2YP', 'Abigael Muende', '0715292439', 'mwendeabigael434@gmail.com', 'GOOGLE_AUTH', 'PROVIDER', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocJQ5Ff0X_WluIGlg2_OIYj1JjC4mGsULIdbfwQ3C2AK3-rEjdT4=s96-c', '2026-07-07 05:30:05.000', NULL, 1, '2026-07-07 05:30:05.000', '2026-07-07 05:30:05.000', 'NONE', '0.00', '0.00'),
('01KY9P7QC5J0QV7VMRKHNVXJCQ', '01KY9P7QC53AZMRB7BNKTVQ47J', 'Spencer Awuor', '0140025300', 'spencerawuor20@gmail.com', 'GOOGLE_AUTH', 'PROVIDER', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocLxGGPNhWoXmZWdNzRiWJ5F4gQ5Co8nEKMBwDqNmhoQeIedzQ=s96-c', '2026-07-24 12:10:23.000', NULL, 1, '2026-07-24 12:10:23.000', '2026-07-24 12:10:23.000', 'NONE', '0.00', '0.00'),
('01M0ZB75Z77EGAFK4V5KZB0Y7R', '01KSF85279ETEV8T615JSET95G', 'Walk-in Customer', '0743603301', NULL, '', 'CUSTOMER', NULL, NULL, 0, NULL, NULL, NULL, 1, '2026-08-26 18:32:32.000', '2026-08-26 18:32:32.000', 'NONE', '0.00', '0.00'),
('01M1BT63GJ35HX5GWX5JY5106D', '01M1BT63GHD4C7V0V64M90BCYF', 'Urban Orchard', '0743603301', 'theurchard@gmail.com', 'GOOGLE_AUTH', 'PROVIDER', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocIAw-drS5s_-ur1WifuMwPVcTVSfvNyuCPorWA6Jm8HNAYVmcI=s96-c', '2026-08-31 14:44:58.000', NULL, 1, '2026-08-31 14:44:58.000', '2026-08-31 14:44:58.000', 'NONE', '0.00', '0.00'),
('01M25M6D3ASYFNYRHS204T2RTY', '01M25M6D3AKMZMZNR9YWNFSSYS', 'Mercy Murumba', '0790016204', 'murumbamercy20@gmail.com', 'GOOGLE_AUTH', 'PROVIDER', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocLWnOvqzOdn2B51yiwJVPpkKv6x7MY8_ZSFzW1Gbgofd-rJyHU=s96-c', '2026-09-10 15:20:32.000', NULL, 1, '2026-09-10 15:20:32.000', '2026-10-06 15:36:59.000', 'NONE', '0.00', '0.00'),
('01M2QR80198JF0FDHVPYD2F0S4', '01KVQH3VSA02FZHNP25R3YAH12', 'Doreen Kendi', '07122336', NULL, '', 'CUSTOMER', NULL, NULL, 0, NULL, NULL, NULL, 1, '2026-09-17 16:17:38.000', '2026-09-17 16:17:38.000', 'NONE', '0.00', '0.00'),
('01M2QT1CCHWBJRP7PVRE29VY3Y', '01KVQH3VSA02FZHNP25R3YAH12', 'Jane', '0792777888', 'doreen@tililtech.com', '$2a$10$Dds.Cem3KXyazxbja/DWZ.zxnfJQO3U.8gVln8dRTIRjJrvjRDd3C', 'STAFF', NULL, NULL, 1, NULL, NULL, 'overview', 'sales', 'customers', 1, '2026-09-17 16:48:59.000', '2026-09-17 16:48:59.000', 'NONE', '0.00', '0.00'),
('01M34KB78967BW19DAGG2CBY1J', '01M34KB789EGA0VFJ7D3QH916R', 'allister mugaisi (allisterhydra)', '0790516067', 'allistermugaisi@gmail.com', 'GOOGLE_AUTH', 'PROVIDER', NULL, NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocJsU9jjyStDJYo2eGah2pDJECRlJWBUykDBiV0cimtJsHIQ_M7M=s96-c', '2026-09-22 16:02:09.000', NULL, 1, '2026-09-22 16:02:09.000', '2026-09-22 16:02:09.000', 'NONE', '0.00', '0.00'),
('01M3Z1VGG5QDFJCYKCRDDBG3J9', '01KVGJF6YRSCQEGM4WHFPQ34ER', 'H', '085855', NULL, '', 'CUSTOMER', NULL, NULL, 0, NULL, NULL, NULL, 1, '2026-10-02 22:35:58.000', '2026-10-02 22:35:58.000', 'NONE', '0.00', '0.00');
-- STATEMENT_BOUNDARY --
SET FOREIGN_KEY_CHECKS = 1;