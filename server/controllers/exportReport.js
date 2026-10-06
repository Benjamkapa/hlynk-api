import ExcelJS from 'exceljs/dist/es5/exceljs.nodejs.js';
import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';

// ─── Color palette ────────────────────────────────────────────────────────────
const HEADER_FILL  = '0F5132';
const HEADER_FONT  = 'FFFFFF';
const BRAND_GREEN  = '1A7A4A';
const ALT_ROW      = 'F0FDF4';
const WARN_RED     = 'FEE2E2';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function applyHeaderRow(sheet, columns, rowIndex) {
  sheet.columns = columns.map(c => ({ key: c.key, width: c.width || 20 }));
  const row = sheet.getRow(rowIndex);
  columns.forEach((col, i) => {
    const cell = row.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: BRAND_GREEN } } };
  });
  row.height = 22;
}

function fillDataRows(sheet, rows) {
  rows.forEach((rowData, idx) => {
    const row = sheet.addRow(rowData);
    const isAlt = idx % 2 === 1;
    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? ALT_ROW : 'FFFFFF' } };
      cell.font = { size: 9 };
      cell.alignment = { vertical: 'middle' };
    });
    row.height = 18;
  });
}

function addSheetTitle(sheet, title, subtitle, colSpan) {
  sheet.mergeCells(1, 1, 1, colSpan);
  const t = sheet.getCell('A1');
  t.value = title;
  t.font = { bold: true, size: 13, color: { argb: HEADER_FILL } };
  t.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 26;
  sheet.mergeCells(2, 1, 2, colSpan);
  const s = sheet.getCell('A2');
  s.value = subtitle;
  s.font = { italic: true, size: 9, color: { argb: '6B7280' } };
  sheet.getRow(2).height = 16;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export const exportPlatformReport = async (req, res) => {
  try {
    const generatedAt = new Date().toLocaleString('en-KE', {
      timeZone: 'Africa/Nairobi', dateStyle: 'full', timeStyle: 'short'
    });

    const [
      [summaryRev],
      [summaryTen],
      [summarySub],
      [summaryPay],
      [summaryVol],
      [transactions],
      [tenants],
      [subscriptions],
      [mpesaLogs],
      [payouts],
      [salesByTenant],
      [activityLog],
      [revenueByMonth],
      [subByPlan],
      [topVendors],
    ] = await Promise.all([
      db.query(`SELECT
        SUM(CASE WHEN status=0 THEN amount ELSE 0 END) totalRevenue,
        SUM(CASE WHEN status=0 AND MONTH(createdAt)=MONTH(NOW()) THEN amount ELSE 0 END) thisMonth,
        SUM(CASE WHEN status=0 AND YEAR(createdAt)=YEAR(NOW()) THEN amount ELSE 0 END) ytd,
        COUNT(*) totalTx,
        COUNT(CASE WHEN status=0 THEN 1 END) successTx,
        COUNT(CASE WHEN status!=0 THEN 1 END) failedTx
        FROM payment`),
      db.query(`SELECT COUNT(*) total, COUNT(CASE WHEN DATE(createdAt)=CURDATE() THEN 1 END) today,
        COUNT(CASE WHEN createdAt>=NOW()-INTERVAL 30 DAY THEN 1 END) last30 FROM tenant`),
      db.query(`SELECT COUNT(*) total, COUNT(CASE WHEN status=0 THEN 1 END) active,
        COUNT(CASE WHEN status=0 AND endDate BETWEEN NOW() AND DATE_ADD(NOW(),INTERVAL 7 DAY) THEN 1 END) expiringSoon
        FROM subscription`),
      db.query(`SELECT SUM(CASE WHEN status='PENDING' THEN amount ELSE 0 END) pendingAmt,
        COUNT(CASE WHEN status='PENDING' THEN 1 END) pendingCnt,
        SUM(CASE WHEN status='PAID' THEN amount ELSE 0 END) paidAmt,
        COUNT(CASE WHEN status='PAID' THEN 1 END) paidCnt FROM payout`),
      db.query(`SELECT SUM(totalAmount) total, COUNT(*) cnt FROM sale WHERE status=0`),

      db.query(`SELECT p.id,p.transactionType,p.amount,p.status,p.mpesaRequestId,p.reference,p.createdAt,
        t.businessName,t.slug FROM payment p LEFT JOIN tenant t ON p.tenantId=t.id
        ORDER BY p.createdAt DESC LIMIT 5000`),
      db.query(`SELECT t.id,t.businessName,t.slug,t.isActive,t.createdAt,
        s.planName AS plan, s.endDate, u.name AS ownerName, u.email AS ownerEmail, u.phone AS ownerPhone
        FROM tenant t LEFT JOIN subscription s ON s.tenantId=t.id AND s.status=0
        LEFT JOIN user u ON u.tenantId=t.id AND u.role='PROVIDER'
        ORDER BY t.createdAt DESC`),
      db.query(`SELECT s.id,s.planName AS plan,s.status,s.startDate,s.endDate,0 AS amount,s.createdAt,t.businessName
        FROM subscription s LEFT JOIN tenant t ON s.tenantId=t.id
        ORDER BY s.createdAt DESC LIMIT 2000`),
      db.query(`SELECT m.id,m.type,m.phone,m.amount,m.resultCode,m.resultDesc,m.checkoutRequestId,m.createdAt,
        t.businessName FROM mpesalog m
        LEFT JOIN payment p ON p.mpesaRequestId=m.checkoutRequestId
        LEFT JOIN tenant t ON p.tenantId=t.id
        ORDER BY m.createdAt DESC LIMIT 5000`),
      db.query(`SELECT p.id,p.tenantId,p.amount,p.status,p.createdAt,p.updatedAt,t.businessName
        FROM payout p LEFT JOIN tenant t ON p.tenantId=t.id ORDER BY p.createdAt DESC`),
      db.query(`SELECT t.businessName,t.slug,COUNT(s.id) saleCount,SUM(s.totalAmount) totalSales,
        SUM(CASE WHEN s.paymentMethod='MPESA' THEN s.totalAmount ELSE 0 END) mpesa,
        SUM(CASE WHEN s.paymentMethod='CASH' THEN s.totalAmount ELSE 0 END) cash,
        MAX(s.createdAt) lastSale
        FROM sale s LEFT JOIN tenant t ON s.tenantId=t.id WHERE s.status=0
        GROUP BY s.tenantId,t.businessName,t.slug ORDER BY totalSales DESC`),
      db.query(`SELECT logName,action,details,userId,ipAddress,createdAt FROM activitylog
        ORDER BY createdAt DESC LIMIT 2000`),
      db.query(`SELECT DATE_FORMAT(createdAt,'%Y-%m') month, SUM(amount) revenue, COUNT(*) cnt
        FROM payment WHERE status=0 AND createdAt>=NOW()-INTERVAL 12 MONTH
        GROUP BY month ORDER BY month ASC`),
      db.query(`SELECT planName AS plan, COUNT(*) cnt, 0 AS revenue FROM subscription WHERE status=0
        GROUP BY planName ORDER BY cnt DESC`),
      db.query(`SELECT t.businessName,t.slug,SUM(p.amount) revenue,COUNT(p.id) paymentCount
        FROM payment p JOIN tenant t ON p.tenantId=t.id WHERE p.status=0
        GROUP BY p.tenantId,t.businessName,t.slug ORDER BY revenue DESC LIMIT 20`),
    ]);

    const S = summaryRev[0] || {};
    const T = summaryTen[0] || {};
    const U = summarySub[0] || {};
    const P = summaryPay[0] || {};
    const V = summaryVol[0] || {};
    const kes = v => Number(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'hlynk Platform';
    wb.created = new Date();

    // ── SHEET 1: Executive Summary ───────────────────────────────────────────
    const ws1 = wb.addWorksheet('📊 Summary', { tabColor: { argb: BRAND_GREEN } });
    ws1.mergeCells('A1:E1');
    const h = ws1.getCell('A1');
    h.value = '🟢  hlynk Platform — Intelligence Report';
    h.font = { bold: true, size: 15, color: { argb: HEADER_FILL } };
    ws1.getRow(1).height = 32;
    ws1.mergeCells('A2:E2');
    ws1.getCell('A2').value = `Generated on: ${generatedAt}`;
    ws1.getCell('A2').font = { italic: true, size: 9, color: { argb: '6B7280' } };
    ws1.getRow(2).height = 14;

    ws1.columns = [
      { key: 'icon', width: 5 }, { key: 'metric', width: 38 },
      { key: 'value', width: 28 }, { key: 'period', width: 22 }, { key: 'note', width: 34 }
    ];

    const kpis = [
      ['', 'METRIC', 'VALUE', 'PERIOD', 'NOTES'],
      ['💰', 'Total Platform Revenue', `KES ${kes(S.totalRevenue)}`, 'All time', 'Successful payments only'],
      ['📅', 'Revenue — This Month', `KES ${kes(S.thisMonth)}`, 'Current month', ''],
      ['📆', 'Revenue — Year to Date', `KES ${kes(S.ytd)}`, `${new Date().getFullYear()}`, ''],
      ['🏪', 'Total Registered Vendors', T.total ?? 0, 'All time', ''],
      ['🆕', 'New Vendors (Last 30 days)', T.last30 ?? 0, 'Last 30 days', ''],
      ['✅', 'Active Subscriptions', U.active ?? 0, 'Live now', ''],
      ['⚠️', 'Subscriptions Expiring Soon', U.expiringSoon ?? 0, 'Next 7 days', 'Action required'],
      ['💳', 'Total Transactions', S.totalTx ?? 0, 'All time', ''],
      ['✔️', 'Successful Transactions', S.successTx ?? 0, 'All time', ''],
      ['❌', 'Failed Transactions', S.failedTx ?? 0, 'All time', ''],
      ['🏧', 'Pending Payouts (KES)', `KES ${kes(P.pendingAmt)}`, 'Unsettled', `${P.pendingCnt ?? 0} pending transactions`],
      ['💸', 'Total Paid Out', `KES ${kes(P.paidAmt)}`, 'All time', `${P.paidCnt ?? 0} disbursements`],
      ['🛒', 'Platform Sales Volume', `KES ${kes(V.total)}`, 'All time', `${V.cnt ?? 0} sales`],
    ];

    kpis.forEach((row, idx) => {
      const r = ws1.addRow(row);
      if (idx === 0) {
        r.eachCell(c => {
          c.font = { bold: true, color: { argb: HEADER_FONT }, size: 10 };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
          c.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        r.height = 20;
      } else {
        r.eachCell(c => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? ALT_ROW : 'FFFFFF' } };
          c.font = { size: 10 };
          c.alignment = { vertical: 'middle' };
        });
        if (String(row[2]).startsWith('KES')) r.getCell(3).font = { bold: true, size: 10, color: { argb: BRAND_GREEN } };
        r.height = 20;
      }
    });

    // Monthly revenue sub-table
    ws1.addRow([]);
    ws1.addRow(['📅 Monthly Revenue — Last 12 Months']).getCell(1).font = { bold: true, size: 11, color: { argb: HEADER_FILL } };
    const mhRow = ws1.addRow(['Month', 'Revenue (KES)', 'Transactions', '', '']);
    mhRow.eachCell((c, i) => {
      if (i <= 3) {
        c.font = { bold: true, color: { argb: HEADER_FONT }, size: 10 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
    revenueByMonth.forEach((m, idx) => {
      const r = ws1.addRow([m.month, Number(m.revenue || 0), Number(m.cnt || 0), '', '']);
      r.eachCell((c, i) => {
        if (i <= 3) {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? ALT_ROW : 'FFFFFF' } };
          c.font = { size: 9 };
          if (i === 2) { c.numFmt = '#,##0.00'; c.font = { bold: true, size: 9 }; }
        }
      });
      r.height = 18;
    });

    // Plan revenue sub-table
    ws1.addRow([]);
    ws1.addRow(['📋 Subscription Revenue by Plan']).getCell(1).font = { bold: true, size: 11, color: { argb: '7C3AED' } };
    ws1.addRow(['Plan', 'Active Subscribers', 'Revenue (KES)', '', '']).eachCell((c, i) => {
      if (i <= 3) {
        c.font = { bold: true, color: { argb: HEADER_FONT }, size: 10 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7C3AED' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
    subByPlan.forEach((p, idx) => {
      const r = ws1.addRow([p.plan || 'N/A', Number(p.cnt || 0), Number(p.revenue || 0), '', '']);
      r.eachCell((c, i) => {
        if (i <= 3) {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'F5F3FF' : 'FFFFFF' } };
          c.font = { size: 9 };
          if (i === 3) { c.numFmt = '#,##0.00'; c.font = { bold: true, size: 9 }; }
        }
      });
      r.height = 18;
    });

    // ── SHEET 2: Transactions ────────────────────────────────────────────────
    const ws2 = wb.addWorksheet('💳 Transactions', { tabColor: { argb: '065F46' } });
    addSheetTitle(ws2, '💳 Payment Ledger', `${generatedAt}  ·  ${transactions.length} records`, 9);
    applyHeaderRow(ws2, [
      { header: 'Transaction ID', key: 'id', width: 28 },
      { header: 'Vendor', key: 'businessName', width: 26 },
      { header: 'Slug', key: 'slug', width: 18 },
      { header: 'Type', key: 'transactionType', width: 22 },
      { header: 'Amount (KES)', key: 'amount', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'M-Pesa Ref', key: 'mpesaRequestId', width: 30 },
      { header: 'Reference', key: 'reference', width: 20 },
      { header: 'Date', key: 'createdAt', width: 24 },
    ], 3);
    fillDataRows(ws2, transactions.map(t => ({
      id: t.id, businessName: t.businessName || 'N/A', slug: t.slug || '',
      transactionType: t.transactionType || '', amount: Number(t.amount || 0),
      status: t.status === 0 ? 'Success' : t.status === 2 ? 'Pending' : 'Failed',
      mpesaRequestId: t.mpesaRequestId || '', reference: t.reference || '',
      createdAt: t.createdAt ? new Date(t.createdAt).toLocaleString('en-KE') : '',
    })));
    ws2.eachRow((row, rn) => {
      if (rn < 4) return;
      const c = row.getCell(6);
      if (c.value === 'Failed') { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARN_RED } }; c.font = { bold: true, color: { argb: 'DC2626' }, size: 9 }; }
      else if (c.value === 'Success') { c.font = { bold: true, color: { argb: BRAND_GREEN }, size: 9 }; }
    });
    ws2.getColumn('amount').numFmt = '#,##0.00';

    // ── SHEET 3: Tenants ─────────────────────────────────────────────────────
    const ws3 = wb.addWorksheet('🏪 Tenants', { tabColor: { argb: '1D4ED8' } });
    addSheetTitle(ws3, '🏪 Vendor Directory', `${generatedAt}  ·  ${tenants.length} vendors`, 10);
    applyHeaderRow(ws3, [
      { header: 'Business Name', key: 'businessName', width: 28 },
      { header: 'Slug', key: 'slug', width: 20 },
      { header: 'Owner Name', key: 'ownerName', width: 22 },
      { header: 'Owner Email', key: 'ownerEmail', width: 28 },
      { header: 'Business Email', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'County', key: 'county', width: 18 },
      { header: 'Plan', key: 'plan', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Joined', key: 'createdAt', width: 20 },
    ], 3);
    fillDataRows(ws3, tenants.map(t => ({
      businessName: t.businessName || '', slug: t.slug || '',
      ownerName: t.ownerName || '', ownerEmail: t.ownerEmail || '',
      email: t.ownerEmail || '', phone: t.ownerPhone || '', county: 'Kenya',
      plan: t.plan || 'Free', status: t.isActive === 0 ? 'Suspended' : 'Active',
      createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-KE') : '',
    })));

    // ── SHEET 4: Subscriptions ───────────────────────────────────────────────
    const ws4 = wb.addWorksheet('📋 Subscriptions', { tabColor: { argb: '7C3AED' } });
    addSheetTitle(ws4, '📋 Subscription Records', `${generatedAt}  ·  ${subscriptions.length} records`, 8);
    applyHeaderRow(ws4, [
      { header: 'Subscription ID', key: 'id', width: 28 },
      { header: 'Vendor', key: 'businessName', width: 26 },
      { header: 'Plan', key: 'plan', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Amount (KES)', key: 'amount', width: 16 },
      { header: 'Start Date', key: 'startDate', width: 18 },
      { header: 'End Date', key: 'endDate', width: 18 },
      { header: 'Created', key: 'createdAt', width: 20 },
    ], 3);
    fillDataRows(ws4, subscriptions.map(s => ({
      id: s.id, businessName: s.businessName || '', plan: s.plan || '',
      status: s.status === 0 ? 'Active' : 'Inactive', amount: Number(s.amount || 0),
      startDate: s.startDate ? new Date(s.startDate).toLocaleDateString('en-KE') : '',
      endDate: s.endDate ? new Date(s.endDate).toLocaleDateString('en-KE') : '',
      createdAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-KE') : '',
    })));
    ws4.getColumn('amount').numFmt = '#,##0.00';

    // ── SHEET 5: M-Pesa Logs ─────────────────────────────────────────────────
    const ws5 = wb.addWorksheet('📱 M-Pesa', { tabColor: { argb: '047857' } });
    addSheetTitle(ws5, '📱 M-Pesa STK / C2B Logs', `${generatedAt}  ·  ${mpesaLogs.length} entries`, 9);
    applyHeaderRow(ws5, [
      { header: 'ID', key: 'id', width: 28 },
      { header: 'Type', key: 'type', width: 16 },
      { header: 'Vendor', key: 'businessName', width: 26 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Amount (KES)', key: 'amount', width: 16 },
      { header: 'Result Code', key: 'resultCode', width: 14 },
      { header: 'Result Description', key: 'resultDesc', width: 36 },
      { header: 'Checkout Request ID', key: 'checkoutRequestId', width: 30 },
      { header: 'Date', key: 'createdAt', width: 24 },
    ], 3);
    fillDataRows(ws5, mpesaLogs.map(m => ({
      id: m.id, type: m.type === 0 ? 'STK-Response' : m.type === 1 ? 'STK-Callback' : 'C2B',
      businessName: m.businessName || 'N/A', phone: m.phone || '',
      amount: Number(m.amount || 0), resultCode: m.resultCode ?? '',
      resultDesc: m.resultDesc || '', checkoutRequestId: m.checkoutRequestId || '',
      createdAt: m.createdAt ? new Date(m.createdAt).toLocaleString('en-KE') : '',
    })));
    ws5.getColumn('amount').numFmt = '#,##0.00';

    // ── SHEET 6: Payouts ─────────────────────────────────────────────────────
    const ws6 = wb.addWorksheet('💸 Payouts', { tabColor: { argb: 'B45309' } });
    addSheetTitle(ws6, '💸 Payout Disbursements', `${generatedAt}  ·  ${payouts.length} records`, 7);
    applyHeaderRow(ws6, [
      { header: 'Payout ID', key: 'id', width: 28 },
      { header: 'Vendor', key: 'businessName', width: 26 },
      { header: 'Amount (KES)', key: 'amount', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Tenant ID', key: 'tenantId', width: 22 },
      { header: 'Created', key: 'createdAt', width: 22 },
      { header: 'Updated', key: 'updatedAt', width: 22 },
    ], 3);
    fillDataRows(ws6, payouts.map(p => ({
      id: p.id, businessName: p.businessName || '', amount: Number(p.amount || 0),
      status: p.status || '', tenantId: p.tenantId || '',
      createdAt: p.createdAt ? new Date(p.createdAt).toLocaleString('en-KE') : '',
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleString('en-KE') : '',
    })));
    ws6.getColumn('amount').numFmt = '#,##0.00';
    ws6.eachRow((row, rn) => {
      if (rn < 4) return;
      const c = row.getCell(4);
      if (c.value === 'PENDING') { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } }; c.font = { bold: true, color: { argb: 'B45309' }, size: 9 }; }
      else if (c.value === 'PAID') { c.font = { bold: true, color: { argb: BRAND_GREEN }, size: 9 }; }
    });

    // ── SHEET 7: Sales Volume ────────────────────────────────────────────────
    const ws7 = wb.addWorksheet('🛒 Sales Volume', { tabColor: { argb: 'BE185D' } });
    addSheetTitle(ws7, '🛒 POS Sales Volume by Vendor', `${generatedAt}`, 7);
    applyHeaderRow(ws7, [
      { header: 'Vendor', key: 'businessName', width: 28 },
      { header: 'Slug', key: 'slug', width: 20 },
      { header: 'Total Sales (KES)', key: 'totalSales', width: 22 },
      { header: 'M-Pesa (KES)', key: 'mpesa', width: 18 },
      { header: 'Cash (KES)', key: 'cash', width: 16 },
      { header: 'Sale Count', key: 'saleCount', width: 14 },
      { header: 'Last Sale', key: 'lastSale', width: 22 },
    ], 3);
    fillDataRows(ws7, salesByTenant.map(s => ({
      businessName: s.businessName || '', slug: s.slug || '',
      totalSales: Number(s.totalSales || 0), mpesa: Number(s.mpesa || 0),
      cash: Number(s.cash || 0), saleCount: Number(s.saleCount || 0),
      lastSale: s.lastSale ? new Date(s.lastSale).toLocaleDateString('en-KE') : '',
    })));
    ['totalSales', 'mpesa', 'cash'].forEach(col => { ws7.getColumn(col).numFmt = '#,##0.00'; });

    // ── SHEET 8: Top 20 Vendors ──────────────────────────────────────────────
    const ws8 = wb.addWorksheet('🏆 Top Vendors', { tabColor: { argb: 'D97706' } });
    addSheetTitle(ws8, '🏆 Top 20 Revenue-Generating Vendors', `${generatedAt}`, 5);
    applyHeaderRow(ws8, [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Vendor', key: 'businessName', width: 30 },
      { header: 'Slug', key: 'slug', width: 20 },
      { header: 'Platform Revenue (KES)', key: 'revenue', width: 24 },
      { header: 'Payment Count', key: 'paymentCount', width: 16 },
    ], 3);
    fillDataRows(ws8, topVendors.map((t, i) => ({
      rank: i + 1, businessName: t.businessName || '',
      slug: t.slug || '', revenue: Number(t.revenue || 0),
      paymentCount: Number(t.paymentCount || 0),
    })));
    ws8.getColumn('revenue').numFmt = '#,##0.00';
    [['4', 'FFD70050'], ['5', 'C0C0C050'], ['6', 'CD7F3250']].forEach(([rn, argb]) => {
      ws8.getRow(Number(rn)).eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
        c.font = { bold: true, size: 9 };
      });
    });

    // ── SHEET 9: Activity Log ────────────────────────────────────────────────
    const ws9 = wb.addWorksheet('🔐 Activity Log', { tabColor: { argb: '991B1B' } });
    addSheetTitle(ws9, '🔐 System & User Activity Log', `${generatedAt}  ·  ${activityLog.length} entries`, 6);
    applyHeaderRow(ws9, [
      { header: 'Category', key: 'logName', width: 16 },
      { header: 'Action', key: 'action', width: 28 },
      { header: 'Details', key: 'details', width: 54 },
      { header: 'User ID', key: 'userId', width: 24 },
      { header: 'IP Address', key: 'ipAddress', width: 18 },
      { header: 'Timestamp', key: 'createdAt', width: 24 },
    ], 3);
    fillDataRows(ws9, activityLog.map(a => ({
      logName: a.logName || '', action: a.action || '', details: a.details || '',
      userId: a.userId || '', ipAddress: a.ipAddress || '',
      createdAt: a.createdAt ? new Date(a.createdAt).toLocaleString('en-KE') : '',
    })));
    ws9.eachRow((row, rn) => {
      if (rn < 4) return;
      if (row.getCell(1).value === 'Security') {
        row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARN_RED } }; });
      }
    });

    // ── Log the export ───────────────────────────────────────────────────────
    try {
      const adminUserId = req.user?.userId || req.user?.id || 'SYSTEM';
      await db.query(`INSERT INTO activitylog (id,tenantId,userId,action,logName,details,createdAt)
        VALUES (?,'SYSTEM',?,'Platform Report Exported','Maintenance',?,NOW())`,
        [ulid(), adminUserId,
         `Admin exported intelligence report (${transactions.length} tx, ${tenants.length} vendors, ${activityLog.length} activity entries)`]);
    } catch (logErr) {
      console.warn('[EXPORT-REPORT] Warning logging export to activitylog:', logErr.message);
    }

    // ── Send response buffer ─────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="hlynk_report_${stamp}.xlsx"`);
    res.setHeader('Content-Length', buffer.byteLength);
    return res.send(Buffer.from(buffer));

  } catch (err) {
    console.error('[EXPORT-REPORT]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate report.' });
  }
};
