import { UAParser } from 'ua-parser-js';
import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';

// Standard ANSI Terminal Color Codes (compatible with PM2, PowerShell, Bash, Docker)
export const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  magenta: '\x1b[35m',
  brightMagenta: '\x1b[95m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
};

/**
 * Parse raw User-Agent string into human-readable device details
 */
export const parseDevice = (userAgent) => {
  if (!userAgent || userAgent === 'Unknown') {
    return {
      browser: 'Unknown Browser',
      os: 'Unknown OS',
      deviceType: 'Desktop',
      summary: 'Desktop Browser'
    };
  }

  try {
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    const browserStr = browser.name ? `${browser.name}${browser.major ? ' ' + browser.major : ''}` : 'Web Browser';
    const osStr = os.name ? `${os.name}${os.version ? ' ' + os.version : ''}` : 'Unknown OS';
    const typeStr = device.type ? (device.type.charAt(0).toUpperCase() + device.type.slice(1)) : 'Desktop';
    const modelStr = device.model ? ` (${device.vendor ? device.vendor + ' ' : ''}${device.model})` : '';

    return {
      browser: browserStr,
      os: osStr,
      deviceType: typeStr,
      summary: `${browserStr} on ${osStr}${modelStr}`
    };
  } catch (_) {
    return {
      browser: 'Unknown Browser',
      os: 'Unknown OS',
      deviceType: 'Desktop',
      summary: userAgent.slice(0, 50)
    };
  }
};

/**
 * Non-blocking insert into activitylog MySQL table
 */
export const recordActivityDb = async ({
  tenantId = 'SYSTEM',
  userId = null,
  action,
  logName = 'Activity',
  details = '',
  ipAddress = 'Unknown',
  actionId = null
}) => {
  try {
    const id = ulid();
    await db.query(
      `INSERT INTO activitylog (id, tenantId, userId, action, logName, details, ipAddress, actionId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, tenantId || 'SYSTEM', userId || null, action, logName, details, ipAddress, actionId]
    );
  } catch (err) {
    // Non-blocking: audit failure should never disrupt the request pipeline
  }
};

/**
 * Real-time logger for User Login events (Console + DB)
 */
export const logSessionLogin = async ({ user, tenant, ipAddress, userAgent, sessionId, isNew = false }) => {
  const device = parseDevice(userAgent);
  const actionTitle = isNew ? 'Vendor Registration' : 'User Login';
  const role = user?.role || 'USER';
  const userName = user?.name || 'Unknown User';
  const userEmail = user?.email || 'No email';
  const business = tenant?.businessName || user?.businessName || 'Platform Vendor';
  const tenantId = tenant?.id || user?.tenantId || 'SYSTEM';

  // Live Terminal Stream for PM2
  console.log(`${C.brightGreen}${C.bold}🟢 [SESSION:LOGIN]${C.reset} ${C.bold}${userName}${C.reset} [${C.brightYellow}${role}${C.reset}]`);
  console.log(`   🏢 ${C.dim}Business:${C.reset} ${business} ${C.dim}(Tenant: ${tenantId.slice(-8).toUpperCase()})${C.reset}`);
  console.log(`   📱 ${C.dim}Device:${C.reset} ${device.summary} ${C.dim}(${device.deviceType})${C.reset}`);
  console.log(`   🌐 ${C.dim}IP:${C.reset} ${ipAddress} | ${C.dim}Session:${C.reset} ${sessionId} | ${C.dim}Auth:${C.reset} ${isNew ? 'Google Signup' : 'Google OAuth'}`);

  // Persist to Activity Log
  await recordActivityDb({
    tenantId,
    userId: user?.id,
    action: actionTitle,
    logName: 'Auth',
    details: `${userName} (${userEmail}) logged in from ${ipAddress} on ${device.summary}`,
    ipAddress,
    actionId: sessionId
  });
};

/**
 * Real-time logger for User Logout events
 */
export const logSessionLogout = async ({ user, sessionId, ipAddress }) => {
  const userName = user?.name || 'User';
  const userEmail = user?.email || 'N/A';
  const role = user?.role || 'USER';

  console.log(`${C.brightRed}${C.bold}🔴 [SESSION:LOGOUT]${C.reset} ${C.bold}${userName}${C.reset} [${C.yellow}${role}${C.reset}] | ${C.dim}Session closed:${C.reset} ${sessionId} | ${C.dim}IP:${C.reset} ${ipAddress}`);

  await recordActivityDb({
    tenantId: user?.tenantId || 'SYSTEM',
    userId: user?.id || user?.userId,
    action: 'User Logout',
    logName: 'Auth',
    details: `${userName} (${userEmail}) ended session`,
    ipAddress,
    actionId: sessionId
  });
};

/**
 * Real-time logger for Session Token Refresh
 */
export const logSessionRefresh = ({ user, sessionId, ipAddress }) => {
  const userName = user?.name || user?.userId || 'User';
  console.log(`${C.cyan}🔄 [SESSION:REFRESH]${C.reset} Renewed session for ${C.bold}${userName}${C.reset} | ${C.dim}Session:${C.reset} ${sessionId} | ${C.dim}IP:${C.reset} ${ipAddress}`);
};

/**
 * Real-time logger for Security Alerts (Token reuse, failed auth, etc.)
 */
export const logSessionAlert = async ({ title, message, ipAddress, userId, tenantId }) => {
  console.log(`${C.brightRed}${C.bold}⚠️ [SECURITY:ALERT]${C.reset} ${C.bold}${title}${C.reset} - ${message} | ${C.dim}IP:${C.reset} ${ipAddress}`);

  await recordActivityDb({
    tenantId: tenantId || 'SYSTEM',
    userId: userId || null,
    action: title,
    logName: 'Security',
    details: message,
    ipAddress
  });
};

/**
 * Real-time logger for Admin Impersonation
 */
export const logSessionImpersonate = async ({ adminUser, targetUser, sessionId, ipAddress }) => {
  console.log(`${C.brightMagenta}${C.bold}🎭 [SESSION:IMPERSONATE]${C.reset} Admin ${C.bold}${adminUser?.name || 'Admin'}${C.reset} impersonating ${C.bold}${targetUser.name}${C.reset} (${C.cyan}${targetUser.email}${C.reset}) | ${C.dim}Session:${C.reset} ${sessionId}`);
};

/**
 * Real-time logger for Session Termination by Admin
 */
export const logSessionTerminate = async ({ adminName, sessionId, targetUserName }) => {
  console.log(`${C.yellow}${C.bold}⛔ [SESSION:TERMINATED]${C.reset} Admin ${adminName || 'Admin'} terminated session ${C.bold}${sessionId}${C.reset} ${targetUserName ? `(${targetUserName})` : ''}`);

  await recordActivityDb({
    tenantId: 'SYSTEM',
    action: 'Session Terminated',
    logName: 'Security',
    details: `Admin ${adminName || 'Admin'} revoked session ${sessionId}`
  });
};

/**
 * Maps HTTP method + route URL to friendly user action titles
 */
export const getActionDescription = (method, url) => {
  const cleanUrl = url.split('?')[0];

  // Specific high-frequency API endpoints
  if (cleanUrl === '/api/v1/sales' && method === 'POST') return { title: '🛒 Create POS Sale', category: 'Sales', isMutation: true };
  if (cleanUrl === '/api/v1/sales/mpesa-push' && method === 'POST') return { title: '📱 M-Pesa STK Push', category: 'Payments', isMutation: true };
  if (cleanUrl === '/api/v1/sales/kcb-push' && method === 'POST') return { title: '🏦 KCB Payment Push', category: 'Payments', isMutation: true };
  if (cleanUrl === '/api/v1/sales' && method === 'GET') return { title: 'View Sales History', category: 'Sales', isMutation: false };

  if (cleanUrl === '/api/v1/inventory' && method === 'POST') return { title: '📦 Add Inventory Item', category: 'Inventory', isMutation: true };
  if (cleanUrl.startsWith('/api/v1/inventory/') && (method === 'PUT' || method === 'PATCH')) return { title: '📦 Update Inventory Item', category: 'Inventory', isMutation: true };
  if (cleanUrl.startsWith('/api/v1/inventory/') && method === 'DELETE') return { title: '🗑️ Delete Inventory Item', category: 'Inventory', isMutation: true };
  if (cleanUrl === '/api/v1/inventory' && method === 'GET') return { title: 'View Inventory List', category: 'Inventory', isMutation: false };

  if (cleanUrl === '/api/v1/customers' && method === 'POST') return { title: '👥 Register Customer', category: 'Customers', isMutation: true };
  if (cleanUrl.startsWith('/api/v1/customers/') && (method === 'PUT' || method === 'PATCH')) return { title: '👥 Update Customer', category: 'Customers', isMutation: true };
  if (cleanUrl === '/api/v1/customers' && method === 'GET') return { title: 'View Customers', category: 'Customers', isMutation: false };

  if (cleanUrl === '/api/v1/expenses' && method === 'POST') return { title: '💸 Record Expense', category: 'Finance', isMutation: true };
  if (cleanUrl.startsWith('/api/v1/expenses/') && method === 'DELETE') return { title: '💸 Delete Expense', category: 'Finance', isMutation: true };

  if (cleanUrl === '/api/v1/staff' && method === 'POST') return { title: '👔 Add Staff Member', category: 'Staff', isMutation: true };
  if (cleanUrl.startsWith('/api/v1/staff/') && (method === 'PUT' || method === 'PATCH')) return { title: '👔 Update Staff Member', category: 'Staff', isMutation: true };

  if (cleanUrl === '/api/v1/subscriptions/renew' && method === 'POST') return { title: '⭐ Renew Subscription', category: 'Billing', isMutation: true };
  if (cleanUrl === '/api/v1/subscriptions/change-plan' && method === 'POST') return { title: '⭐ Change Subscription Plan', category: 'Billing', isMutation: true };

  if (cleanUrl === '/api/v1/providers/me' && (method === 'PUT' || method === 'PATCH')) return { title: '⚙️ Update Business Profile', category: 'Profile', isMutation: true };
  if (cleanUrl === '/api/v1/providers/me/photo' && method === 'POST') return { title: '📷 Upload Logo / Photo', category: 'Profile', isMutation: true };

  if (cleanUrl.startsWith('/api/v1/etims/invoices') && method === 'POST') return { title: '🧾 Transmit E-TIMS Invoice', category: 'eTIMS', isMutation: true };
  if (cleanUrl === '/api/v1/etims/credentials' && method === 'POST') return { title: '🧾 Save E-TIMS Credentials', category: 'eTIMS', isMutation: true };
  if (cleanUrl === '/api/v1/etims/init' && method === 'POST') return { title: '🧾 Initialize E-TIMS Device', category: 'eTIMS', isMutation: true };

  if (cleanUrl.startsWith('/api/v1/admin/tenants') && (method === 'PUT' || method === 'POST')) return { title: '🏢 Admin Tenant Configuration', category: 'Admin', isMutation: true };
  if (cleanUrl.startsWith('/api/v1/admin/sessions/') && cleanUrl.endsWith('/terminate') && method === 'PUT') return { title: '⛔ Terminate Session', category: 'Security', isMutation: true };
  if (cleanUrl.startsWith('/api/v1/admin/users/') && cleanUrl.endsWith('/impersonate') && method === 'POST') return { title: '🎭 Impersonate User', category: 'Security', isMutation: true };
  if (cleanUrl.startsWith('/api/v1/admin/users/') && method === 'DELETE') return { title: '❌ Delete User', category: 'Admin', isMutation: true };

  if (cleanUrl === '/api/v1/auth/google' && method === 'POST') return { title: '🔐 Google Auth Request', category: 'Auth', isMutation: true };
  if (cleanUrl === '/api/v1/auth/logout' && method === 'POST') return { title: '🚪 Logout Session', category: 'Auth', isMutation: true };
  if (cleanUrl === '/api/v1/auth/refresh' && method === 'POST') return { title: '🔄 Token Refresh', category: 'Auth', isMutation: false };

  // Generic fallback
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  return {
    title: `${method} ${cleanUrl}`,
    category: isMutation ? 'Operation' : 'Query',
    isMutation
  };
};

/**
 * Global Real-Time Request & Activity Logging Middleware for Express
 */
export const sessionActivityMiddleware = (req, res, next) => {
  const url = req.originalUrl || req.url;

  // ── Silent pass-through list ─────────────────────────────────────────────
  // Filter out static assets, health pings, and any noisy polling routes so
  // PM2 logs stay focused on meaningful events only.
  const cleanPath = url.split('?')[0];

  const SILENT_ROUTES = [
    '/uploads/',
    '/api/v1/storage/',
    '/favicon.ico',
    // Health & admin polling
    '/api/v1/admin/health',
    // Notification bell polling (every 30 s)
    '/api/v1/platform/notifications',
    '/api/v1/notifications',
    // Dashboard & stats fetches
    '/api/v1/admin/stats',
    '/api/v1/admin/finance/vault',
    '/api/v1/admin/payouts',
    '/api/v1/admin/transactions',
    '/api/v1/admin/subscriptions',
    '/api/v1/admin/sessions',
    '/api/v1/admin/activity',
    '/api/v1/admin/system-events',
    '/api/v1/admin/media',
    '/api/v1/admin/reviews',
    '/api/v1/admin/schedules',
    '/api/v1/admin/settings',
    '/api/v1/admin/tenants',
    '/api/v1/admin/users',
    // Provider dashboard polls
    '/api/v1/providers/me',
    '/api/v1/subscriptions',
    '/api/v1/sales',
    '/api/v1/expenses',
    '/api/v1/customers',
    '/api/v1/inventory',
    '/api/v1/staff',
    '/api/v1/resources',
    '/api/v1/events',
    '/api/v1/operations',
    '/api/v1/services',
    '/api/v1/requests',
    '/api/v1/platform/stats',
    '/api/v1/platform/reviews',
  ];

  const isSilentRoute =
    cleanPath === '/' ||
    SILENT_ROUTES.some(r => cleanPath === r || cleanPath.startsWith(r));

  if (req.method === 'GET' && isSilentRoute) {
    return next();
  }

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const method = req.method;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown';
    const user = req.user; // Populated by JWT authentication middleware

    const { title: actionTitle, category, isMutation } = getActionDescription(method, url);

    // Colorize status code
    let statusColor = C.brightGreen;
    if (status >= 500) statusColor = C.brightRed;
    else if (status >= 400) statusColor = C.brightYellow;
    else if (status >= 300) statusColor = C.cyan;

    const userLabel = user
      ? `${C.bold}${user.name || 'User'}${C.reset} [${C.yellow}${user.role || 'USER'}${C.reset}${user.businessName ? ` @ ${C.cyan}${user.businessName}${C.reset}` : ''}]`
      : `${C.dim}Guest / Unauthenticated${C.reset}`;

    // 1. MUTATING ACTIONS (POST, PUT, PATCH, DELETE) OR ERRORS (4xx, 5xx)
    if (isMutation || status >= 400) {
      console.log(`${C.brightYellow}${C.bold} ⚡[USER ACTION]${C.reset} ${userLabel}`);
      console.log(`   🎯 ${C.bold}${actionTitle}${C.reset} ${C.dim}(${method} ${url})${C.reset}`);
      console.log(`   📊 ${C.dim}Status:${C.reset} ${statusColor}${status}${C.reset} | ${C.dim}Latency:${C.reset} ${duration}ms | ${C.dim}IP:${C.reset} ${ip}`);

      // Auto-record to activitylog table for user actions if authenticated and not already logged
      if (user && isMutation && status < 400 && !res.locals._activityLogged) {
        // Skip auth endpoints as they have specialized logging
        if (!url.startsWith('/api/v1/auth/')) {
          recordActivityDb({
            tenantId: user.tenantId || 'SYSTEM',
            userId: user.userId || user.id,
            action: actionTitle,
            logName: category,
            details: `${user.name || 'User'} performed ${actionTitle} (${method} ${url})`,
            ipAddress: ip,
            actionId: user.sessionId || null
          });
        }
      }
    } 
    // 2. GET requests — already filtered above; any that reach here are unknown
    //    routes or edge cases. Suppress them to keep logs clean.
  });

  next();
};
