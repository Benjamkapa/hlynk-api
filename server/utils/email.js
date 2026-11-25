import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env'), quiet: true });

// Read params.json if available
let params = {};
try {
  const paramsPath = path.join(__dirname, '../configs/params.json');
  if (fs.existsSync(paramsPath)) {
    params = JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
  }
} catch (e) {}

let transporter = null;

export const getTransporter = () => {
  if (transporter) return transporter;

  const SMTP_HOST = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || params.smtp_host || 'smtp-relay.brevo.com';
  const SMTP_PORT = parseInt(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || params.smtp_port || '587', 10);
  const SMTP_USER = process.env.BREVO_SMTP_USER || process.env.SMTP_USER || params.smtp_user;
  const SMTP_PASS = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS || params.smtp_pass || params.brevo_api_key;

  if (!SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  return transporter;
};

/* ───────────────────────── Design tokens ───────────────────────── */

const LOGO_URL = 'https://ik.imagekit.io/jyhkrwjfg/logo.png';
const LOGO_WIDTH = 96; // displayed width in px. Upload the PNG at 2x (192px wide) so it stays sharp on phones.

const C = {
  bg: '#EEF1EF', // page background (soft grey-green)
  deep: '#0F2A22', // headings
  emerald: '#0B6B50', // links and buttons
  line: '#E6ECE8', // hairlines
  tint: '#F3F8F5', // note block background
  ink: '#2B3A34', // body text
  muted: '#5F706A',
  footer: '#14352B', // dark footer block
  footerText: '#9FBFB1',
};
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif";

/* ───────────────────────── Small helpers ───────────────────────── */

// User-supplied values (names, titles, messages) must never inject HTML into an email.
const esc = (value = '') =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toText = (html) =>
  html
    .replace(/<div style="display:none[\s\S]*?<\/div>/i, '')
    .replace(/<(style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h\d|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const BADGE_TONES = {
  warning: '#92400E',
  urgent: '#991B1B',
};

// Only warnings and urgent notices get a small label. Friendly emails stay clean.
const badge = (tone, text) =>
  BADGE_TONES[tone]
    ? `<p style="margin:0 0 6px 0; font-family:${SANS}; font-size:13px; line-height:18px; font-weight:600; color:${BADGE_TONES[tone]};">${text}</p>`
    : '';

const heading = (text) =>
  `<h2 style="margin:0 0 22px 0; font-family:${SANS}; font-size:24px; line-height:32px; font-weight:400; color:${C.deep};">${text}</h2>`;

// Simple divided list
const steps = (items) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 8px 0;">${items
    .map(
      (item, i) => `<tr><td style="padding:11px 0; border-top:1px solid ${C.line};${i === items.length - 1 ? ` border-bottom:1px solid ${C.line};` : ''} font-family:${SANS}; font-size:14px; line-height:21px; color:${C.muted};"><strong style="color:${C.ink};">${item.title}</strong><br>${item.text}</td></tr>`,
    )
    .join('')}</table>`;

// Soft note block
const box = (innerHtml) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;"><tr><td bgcolor="${C.tint}" style="background-color:${C.tint}; padding:14px 16px; font-family:${SANS}; font-size:14px; line-height:22px; color:${C.muted};">${innerHtml}</td></tr></table>`;

/**
 * Common base wrapper for hlynk branded emails.
 * Same signature as before: { title, bodyHtml, ctaText, ctaUrl, footerNote }
 */
const renderEmailLayout = ({ title, bodyHtml, ctaText, ctaUrl, footerNote }) => {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${esc(title)}</title>
  <style>
    body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; }
    table { border-collapse:collapse; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    a { color:${C.emerald}; }
    .content p { margin:0 0 14px 0; }
    @media only screen and (max-width:560px) {
      .container { width:100% !important; }
      .outer { padding:0 !important; }
      .px { padding-left:24px !important; padding-right:24px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${C.bg};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all; font-size:1px; line-height:1px; color:${C.bg};">
    ${esc(title)}
    &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}">
    <tr>
      <td class="outer" align="center" style="padding:32px 12px;">
        <table role="presentation" class="container" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px; max-width:520px;">

          <!-- White body -->
          <tr>
            <td bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Logo -->
                <tr>
                  <td class="px" align="left" style="padding:36px 40px 0 40px;">
                    <img src="${LOGO_URL}" alt="hlynk" width="${LOGO_WIDTH}" style="display:block; width:${LOGO_WIDTH}px; max-width:${LOGO_WIDTH}px; height:auto; border:0; font-family:${SANS}; font-size:20px; font-weight:700; color:${C.emerald};">
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td class="px content" style="padding:32px 40px 0 40px; font-family:${SANS}; font-size:14px; line-height:22px; color:${C.ink};">
                    ${bodyHtml}
                    ${
                      ctaText && ctaUrl
                        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 4px 0;">
                      <tr>
                        <td align="center" bgcolor="${C.emerald}" style="background-color:${C.emerald}; border-radius:4px;">
                          <a href="${ctaUrl}" target="_blank" style="display:inline-block; padding:12px 26px; font-family:${SANS}; font-size:14px; line-height:20px; font-weight:600; color:#FFFFFF !important; text-decoration:none;">${ctaText}</a>
                        </td>
                      </tr>
                    </table>`
                        : ''
                    }
                    ${footerNote ? `<p style="margin:18px 0 0 0; font-family:${SANS}; font-size:13px; line-height:20px; color:${C.muted};">${footerNote}</p>` : ''}
                  </td>
                </tr>

                <!-- Sign-off -->
                <tr>
                  <td class="px" style="padding:22px 40px 40px 40px; font-family:${SANS}; font-size:14px; line-height:22px; color:${C.ink};">
                    The hlynk Team
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Dark footer block -->
          <tr>
            <td class="px" align="center" bgcolor="${C.footer}" style="background-color:${C.footer}; padding:28px 40px 30px 40px;">
              <p style="margin:0 0 20px 0; font-family:${SANS}; font-size:12px; line-height:18px; font-weight:600; color:#FFFFFF;">
                <a href="https://hlynk.co.ke/dashboard" style="color:#FFFFFF; text-decoration:none;">Manage Your Account</a>
                &nbsp;|&nbsp;
                <a href="mailto:info@hlynk.co.ke" style="color:#FFFFFF; text-decoration:none;">Customer Support</a>
                &nbsp;|&nbsp;
                <a href="https://hlynk.co.ke" style="color:#FFFFFF; text-decoration:none;">hlynk.co.ke</a>
              </p>
              <p style="margin:0 0 10px 0; font-family:${SANS}; font-size:11px; line-height:17px; color:${C.footerText}; text-align:left;">
                You are receiving this email because you have an account on hlynk. Need support? Email us at
                <a href="mailto:info@hlynk.co.ke" style="color:#CDE6DB;">info@hlynk.co.ke</a> or call support.
              </p>
              <p style="margin:0; font-family:${SANS}; font-size:11px; line-height:17px; color:${C.footerText}; text-align:left;">
                &copy; ${currentYear} hlynk. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Core generic send function
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const client = getTransporter();

    if (!client) {
      console.warn(`[Email] Brevo / SMTP credentials not configured. Skipping email to "${to}" (Subject: "${subject}")`);
      return { success: false, reason: 'SMTP_NOT_CONFIGURED' };
    }

    const fromName = process.env.EMAIL_FROM_NAME || 'hlynk';
    const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM || params.email_from || 'info@hlynk.co.ke';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: text || toText(html), // plain text fallback
      html,
    };

    const info = await client.sendMail(mailOptions);
    console.log(`✉️ [Email] Sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`🔴 [Email] Failed sending email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * 1. Welcome Email for Newly Signed In / Registered Users
 */
export const sendWelcomeEmail = async ({ email, name, businessName }) => {
  const greeting = name ? `Hi ${esc(name)},` : 'Hello,';
  const bizTitle = businessName ? ` for <strong>${esc(businessName)}</strong>` : '';

  const bodyHtml = `
    ${badge('success', 'Welcome aboard')}
    ${heading('Your hlynk dashboard is ready')}
    <p>${greeting}</p>
    <p>Thank you for joining us${bizTitle}. Here is where we suggest you begin:</p>
    ${steps([
      { title: 'Add your products', text: 'Set up your stock in <strong>Inventory</strong>.' },
      { title: 'Record your first sale', text: 'Use the <strong>POS</strong> to sell and issue receipts.' },
      { title: 'Share your business link', text: 'Let customers find you in one tap.' },
    ])}
    <p style="margin-top:14px;">Your <strong>14-day free trial</strong> is active. No card needed.</p>
  `;

  const html = renderEmailLayout({
    title: 'Welcome to hlynk',
    bodyHtml,
    ctaText: 'Open my dashboard',
    ctaUrl: 'https://hlynk.co.ke/dashboard',
    footerNote: 'If you ever need onboarding help, our support team is ready on WhatsApp and email.',
  });

  return sendEmail({
    to: email,
    subject: `Welcome to hlynk, ${businessName || name || 'Partner'}`,
    html,
  });
};

/**
 * 2. Subscription Expiry Reminder (e.g. 3 Days Remaining)
 */
export const sendSubscriptionReminderEmail = async ({ email, name, businessName, daysRemaining = 3, planName = 'Business Pro', expiryDate }) => {
  const greeting = name ? `Hi ${esc(name)},` : 'Hello,';
  const dateStr = expiryDate ? new Date(expiryDate).toLocaleDateString('en-KE', { dateStyle: 'medium' }) : 'soon';

  const bodyHtml = `
    ${badge('warning', `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`)}
    ${heading('Your subscription is expiring soon')}
    <p>${greeting}</p>
    <p>This is a quick reminder that your <strong>${esc(planName)}</strong> plan for <strong>${esc(businessName || 'your business')}</strong> is scheduled to expire on <strong>${dateStr}</strong> (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left).</p>
    <p>To avoid any disruption to your sales, barcode scanning, M-Pesa reconciliation and receipts, please renew before the expiry date.</p>
    ${box(`
      <strong style="color:${C.deep};">Plan details</strong><br>
      Business: ${esc(businessName || 'N/A')}<br>
      Tier: ${esc(planName)}<br>
      Renew easily with an M-Pesa STK push on your phone.
    `)}
  `;

  const html = renderEmailLayout({
    title: 'Subscription Expiry Reminder',
    bodyHtml,
    ctaText: 'Renew subscription',
    ctaUrl: 'https://hlynk.co.ke/dashboard/subscription',
    footerNote: 'Renewing early extends seamlessly from your current expiry date without losing any active days.',
  });

  return sendEmail({
    to: email,
    subject: `Reminder: Your hlynk subscription expires in ${daysRemaining} days (${businessName || 'Action Required'})`,
    html,
  });
};

/**
 * 3. Subscription Expired & 3-Day Post-Expiry Grace Reminder
 */
export const sendSubscriptionExpiredEmail = async ({ email, name, businessName, daysExpired = 0, planName = 'Business Pro' }) => {
  const greeting = name ? `Hi ${esc(name)},` : 'Hello,';
  const isGracePeriod = daysExpired > 0;

  const badgeTone = isGracePeriod ? 'urgent' : 'warning';
  const badgeText = isGracePeriod ? `Expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago` : 'Plan expired today';
  const headline = isGracePeriod
    ? `Action required: your account expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago`
    : 'Your subscription has ended';

  const bodyHtml = `
    ${badge(badgeTone, badgeText)}
    ${heading(headline)}
    <p>${greeting}</p>
    <p>The subscription for <strong>${esc(businessName || 'your business')}</strong> (${esc(planName)}) ${isGracePeriod ? `expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago` : 'has expired today'}.</p>
    <p>Your business records, inventory and past sales receipts are securely saved. Active selling and multi-device access are paused until you renew.</p>
    ${steps([
      { title: 'Open your billing page', text: 'Use the button below.' },
      { title: 'Enter your M-Pesa number', text: 'The one you would like to pay with.' },
      { title: 'Approve the prompt on your phone', text: 'Your access is restored immediately.' },
    ])}
  `;

  const html = renderEmailLayout({
    title: 'hlynk Subscription Notice',
    bodyHtml,
    ctaText: 'Renew and restore access',
    ctaUrl: 'https://hlynk.co.ke/dashboard/subscription',
    footerNote: 'Need flexible arrangements or help with payment? Contact our support desk at info@hlynk.co.ke.',
  });

  return sendEmail({
    to: email,
    subject: isGracePeriod
      ? `Action Required: Your hlynk service expired ${daysExpired} days ago (${businessName || 'your account'})`
      : `Your hlynk subscription expired today (${businessName || 'your account'})`,
    html,
  });
};

/**
 * 4. Super Admin Broadcast & Promotional Messages
 */
export const sendBroadcastEmail = async ({ email, name, businessName, title, message, type = 'info', actionUrl = 'https://hlynk.co.ke/dashboard', actionText = 'Open hlynk' }) => {
  const greeting = name ? `Hi ${esc(name)},` : 'Hello Partner,';
  const badgeTone = type === 'warning' ? 'warning' : 'success';

  // Escape first, then turn newlines into paragraphs or line breaks
  const formattedMsg = esc(message).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>');

  const bodyHtml = `
    ${badge(badgeTone, 'Announcement')}
    ${heading(esc(title))}
    <p>${greeting}</p>
    <p>${formattedMsg}</p>
  `;

  const html = renderEmailLayout({
    title,
    bodyHtml,
    ctaText: actionText,
    ctaUrl: actionUrl,
    footerNote: 'You received this official announcement as an active business partner on the hlynk platform.',
  });

  return sendEmail({
    to: email,
    subject: title,
    html,
  });
};

/**
 * 5. Account Removed / Deleted Farewell Email
 */
export const sendAccountDeletedEmail = async ({ email, name, businessName, deletedBy = 'self' }) => {
  const greeting = name ? `Hi ${esc(name)},` : 'Hello,';
  const bizText = businessName ? ` for <strong>${esc(businessName)}</strong>` : '';
  const reasonText =
    deletedBy === 'admin'
      ? `Your hlynk account${bizText} has been removed by a platform administrator.`
      : deletedBy === 'owner'
        ? `Your staff access${bizText} on hlynk has been removed by your business administrator.`
        : `Your hlynk account${bizText} and its associated records have been permanently deleted as requested.`;

  const bodyHtml = `
    ${badge('warning', 'Account removed')}
    ${heading('Sorry to see you go')}
    <p>${greeting}</p>
    <p>${reasonText}</p>
    <p>Thank you for spending time with hlynk. If this was done in error, or if you ever decide to return and set up a fresh workspace, our team is always happy to help.</p>
  `;

  const html = renderEmailLayout({
    title: 'Account Removed — hlynk',
    bodyHtml,
    ctaText: 'Contact support',
    ctaUrl: 'mailto:info@hlynk.co.ke',
    footerNote: 'If you did not expect this change, please reach out to info@hlynk.co.ke immediately.',
  });

  return sendEmail({
    to: email,
    subject: `Your hlynk account${businessName ? ` (${businessName})` : ''} has been removed`,
    html,
  });
};

/**
 * 6. Polite 3-Day Inactivity Reminder
 */
export const sendInactivityReminderEmail = async ({ email, name, businessName, daysInactive = 3 }) => {
  const greeting = name ? `Hi ${esc(name)},` : 'Hi there,';
  const bizName = businessName ? esc(businessName) : 'your business';

  const bodyHtml = `
    ${badge('success', 'We miss you')}
    ${heading('Your biashara misses you')}
    <p>${greeting}</p>
    <p>It has been <strong>${daysInactive} days</strong> since we last saw activity on <strong>${bizName}</strong>.</p>
    <p>Your inventory, sales tools and M-Pesa tracking are right where you left them, ready whenever you are.</p>
    ${steps([
      { title: 'Check today’s stock', text: 'Keep tabs on fast-moving items in seconds.' },
      { title: 'Record a quick sale', text: 'Issue clean digital receipts in one tap.' },
    ])}
  `;

  const html = renderEmailLayout({
    title: 'Quick check-in from hlynk',
    bodyHtml,
    ctaText: 'Jump back into hlynk',
    ctaUrl: 'https://hlynk.co.ke/dashboard',
    footerNote: 'Need a hand getting set up or importing your products? Just reply to this email.',
  });

  return sendEmail({
    to: email,
    subject: `${businessName ? `${businessName} — ` : ''}Your hlynk workspace is waiting for you`,
    html,
  });
};

export default {
  sendEmail,
  sendWelcomeEmail,
  sendSubscriptionReminderEmail,
  sendSubscriptionExpiredEmail,
  sendBroadcastEmail,
  sendAccountDeletedEmail,
  sendInactivityReminderEmail,
  getTransporter,
};

// import nodemailer from 'nodemailer';
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import dotenv from 'dotenv';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dotenv.config({ path: path.join(__dirname, '../.env'), quiet: true });

// // Read params.json if available
// let params = {};
// try {
//   const paramsPath = path.join(__dirname, '../configs/params.json');
//   if (fs.existsSync(paramsPath)) {
//     params = JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
//   }
// } catch (e) {}

// let transporter = null;

// export const getTransporter = () => {
//   if (transporter) return transporter;

//   const SMTP_HOST = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || params.smtp_host;
//   const SMTP_PORT = parseInt(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || params.smtp_port);
//   const SMTP_USER = process.env.BREVO_SMTP_USER || process.env.SMTP_USER || params.smtp_user;
//   const SMTP_PASS = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS || params.smtp_pass || params.brevo_api_key;

//   if (!SMTP_USER || !SMTP_PASS) {
//     return null;
//   }

//   transporter = nodemailer.createTransport({
//     host: SMTP_HOST,
//     port: SMTP_PORT,
//     secure: SMTP_PORT === 465, // true for 465, false for 587
//     auth: {
//       user: SMTP_USER,
//       pass: SMTP_PASS,
//     },
//     tls: {
//       rejectUnauthorized: process.env.NODE_ENV === 'production',
//     },
//   });

//   return transporter;
// };

// /* ───────────────────────── Design tokens ───────────────────────── */

// const C = {
//   deep: '#0A3B2E', // page surround and headings
//   emerald: '#0B5D45', // buttons, seal, accents
//   mint: '#D5E5DC', // hairlines
//   frame: '#BFD8CB', // inner frame
//   ink: '#26352F', // body text
//   muted: '#51645B',
// };
// const SERIF = "Georgia, 'Times New Roman', serif";
// const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// /* ───────────────────────── Small helpers ───────────────────────── */

// // User-supplied values (names, titles, messages) must never inject HTML into an email.
// const esc = (value = '') =>
//   String(value ?? '')
//     .replace(/&/g, '&amp;')
//     .replace(/</g, '&lt;')
//     .replace(/>/g, '&gt;')
//     .replace(/"/g, '&quot;')
//     .replace(/'/g, '&#39;');

// const toText = (html) =>
//   html
//     .replace(/<div style="display:none[\s\S]*?<\/div>/i, '')
//     .replace(/<(style|head)[\s\S]*?<\/\1>/gi, '')
//     .replace(/<br\s*\/?>/gi, '\n')
//     .replace(/<\/(p|div|tr|h\d|li)>/gi, '\n')
//     .replace(/<[^>]+>/g, '')
//     .replace(/&nbsp;/g, ' ')
//     .replace(/&amp;/g, '&')
//     .replace(/[ \t]+\n/g, '\n')
//     .replace(/\n{3,}/g, '\n\n')
//     .trim();

// const BADGE_TONES = {
//   success: { bg: '#E6F4EC', fg: C.emerald },
//   warning: { bg: '#FEF3C7', fg: '#92400E' },
//   urgent: { bg: '#FEE2E2', fg: '#991B1B' },
// };

// // Quiet centred status pill above the headline
// const badge = (tone, text) => {
//   const t = BADGE_TONES[tone] || BADGE_TONES.success;
//   return `<p style="margin:0 0 14px 0; text-align:center;"><span style="display:inline-block; padding:4px 12px; border-radius:999px; background-color:${t.bg}; color:${t.fg}; font-family:${SANS}; font-size:12px; line-height:16px; font-weight:600;">${text}</span></p>`;
// };

// const heading = (text) =>
//   `<h2 style="margin:0 0 26px 0; text-align:center; font-family:${SERIF}; font-size:30px; line-height:37px; font-weight:normal; letter-spacing:-0.4px; color:${C.deep};">${text}</h2>`;

// // Hairline-separated list (replaces bullet lists and tinted boxes)
// const steps = (items) =>
//   `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px 0;">${items
//     .map(
//       (item, i) => `<tr><td style="padding:16px 0; border-top:1px solid ${C.mint};${i === items.length - 1 ? ` border-bottom:1px solid ${C.mint};` : ''} font-family:${SANS}; font-size:14px; line-height:22px; color:${C.muted};"><span style="font-family:${SERIF}; font-size:16px; color:${C.emerald};">${item.title}</span><br>${item.text}</td></tr>`,
//     )
//     .join('')}</table>`;

// // Quiet note block (replaces the old tinted .box)
// const box = (innerHtml) =>
//   `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;"><tr><td style="padding:16px 0; border-top:1px solid ${C.mint}; border-bottom:1px solid ${C.mint}; font-family:${SANS}; font-size:14px; line-height:23px; color:${C.muted};">${innerHtml}</td></tr></table>`;

// /**
//  * Common base wrapper for hlynk branded emails.
//  * Same signature as before: { title, bodyHtml, ctaText, ctaUrl, footerNote }
//  */
// const renderEmailLayout = ({ title, bodyHtml, ctaText, ctaUrl, footerNote }) => {
//   const currentYear = new Date().getFullYear();
//   return `
// <!DOCTYPE html>
// <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
// <head>
//   <meta charset="utf-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <meta name="x-apple-disable-message-reformatting">
//   <meta name="color-scheme" content="light">
//   <meta name="supported-color-schemes" content="light">
//   <title>${esc(title)}</title>
//   <style>
//     body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; }
//     table { border-collapse:collapse; }
//     a { color:${C.emerald}; }
//     .content p { margin:0 0 16px 0; }
//     @media only screen and (max-width:620px) {
//       .container { width:100% !important; }
//       .outer { padding:20px 10px !important; }
//       .px { padding-left:26px !important; padding-right:26px !important; }
//     }
//   </style>
// </head>
// <body style="margin:0; padding:0; background-color:${C.deep};">
//   <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all; font-size:1px; line-height:1px; color:${C.deep};">
//     ${esc(title)}
//     &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847;
//   </div>

//   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.deep}">
//     <tr>
//       <td class="outer" align="center" style="padding:48px 16px;">
//         <table role="presentation" class="container" width="580" cellpadding="0" cellspacing="0" border="0" style="width:580px; max-width:580px;">
//           <tr>
//             <td bgcolor="#FFFFFF" style="background-color:#FFFFFF; padding:10px; border-radius:4px;">
//               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.frame};">

//                 <!-- Seal and tagline -->
//                 <tr>
//                   <td align="center" style="padding-bottom:44px 40px 0 40px;">
//                     <table role="presentation" cellpadding="0" cellspacing="0" border="0">
//                       <tr>
//                         <img src="https://ik.imagekit.io/jyhkrwjfg/logo.png" alt="hlynk Logo" width="80">  
//                       </tr>
//                     </table>
//                   </td>
//                 </tr>

//                 <!-- Rule -->
//                 <tr>
//                   <td align="center" style="padding:26px 0 0 0;">
//                     <table role="presentation" cellpadding="0" cellspacing="0" border="0">
//                       <tr><td width="48" height="1" bgcolor="${C.emerald}" style="width:48px; height:1px; font-size:0; line-height:0;">&nbsp;</td></tr>
//                     </table>
//                   </td>
//                 </tr>

//                 <!-- Content -->
//                 <tr>
//                   <td class="px content" style="padding:34px 52px 0 52px; font-family:${SERIF}; font-size:16px; line-height:27px; color:${C.ink};">
//                     ${bodyHtml}
//                     ${
//                       ctaText && ctaUrl
//                         ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:30px auto 8px auto;">
//                       <tr>
//                         <td align="center" bgcolor="${C.emerald}" style="background-color:${C.emerald}; border-radius:2px;">
//                           <a href="${ctaUrl}" target="_blank" style="display:inline-block; padding:15px 38px; font-family:${SANS}; font-size:15px; line-height:18px; font-weight:600; letter-spacing:0.6px; color:#FFFFFF !important; text-decoration:none;">${ctaText}</a>
//                         </td>
//                       </tr>
//                     </table>`
//                         : ''
//                     }
//                     ${footerNote ? `<p style="margin:24px 0 0 0; text-align:center; font-family:${SANS}; font-size:13px; line-height:20px; color:#6B7F76;">${footerNote}</p>` : ''}
//                   </td>
//                 </tr>

//                 <!-- Sign-off -->
//                 <tr>
//                   <td class="px" style="padding:34px 52px 44px 52px; font-family:${SERIF}; font-size:16px; line-height:26px; color:${C.ink};">
//                     With warm regards,<br>
//                     <span style="font-size:20px; line-height:32px; font-style:italic; color:${C.emerald};">The hlynk Team</span>
//                   </td>
//                 </tr>

//               </table>
//             </td>
//           </tr>

//           <!-- Footer on emerald -->
//           <tr>
//             <td align="center" style="padding:28px 24px 0 24px; font-family:${SANS}; font-size:12px; line-height:19px; color:#8FB8A6;">
//               Need support? Email us at <a href="mailto:info@hlynk.co.ke" style="color:#D1FAE5;">info@hlynk.co.ke</a> or call support.<br><br>
//               &copy; ${currentYear} hlynk. All rights reserved.
//             </td>
//           </tr>
//         </table>
//       </td>
//     </tr>
//   </table>
// </body>
// </html>
//   `.trim();
// };

// /**
//  * Core generic send function
//  */
// export const sendEmail = async ({ to, subject, html, text }) => {
//   try {
//     const client = getTransporter();

//     if (!client) {
//       console.warn(`[Email] Brevo / SMTP credentials not configured. Skipping email to "${to}" (Subject: "${subject}")`);
//       return { success: false, reason: 'SMTP_NOT_CONFIGURED' };
//     }

//     const fromName = process.env.EMAIL_FROM_NAME || 'hlynk';
//     const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM || params.email_from || 'info@hlynk.co.ke';

//     const mailOptions = {
//       from: `"${fromName}" <${fromEmail}>`,
//       to,
//       subject,
//       text: text || toText(html), // plain text fallback
//       html,
//     };

//     const info = await client.sendMail(mailOptions);
//     console.log(`✉️ [Email] Sent successfully to ${to}. MessageId: ${info.messageId}`);
//     return { success: true, messageId: info.messageId };
//   } catch (error) {
//     console.error(`🔴 [Email] Failed sending email to ${to}:`, error.message);
//     return { success: false, error: error.message };
//   }
// };

// /**
//  * 1. Welcome Email for Newly Signed In / Registered Users
//  */
// export const sendWelcomeEmail = async ({ email, name, businessName }) => {
//   const greeting = name ? `Dear ${esc(name)},` : 'Hello,';
//   const bizTitle = businessName ? ` for <strong>${esc(businessName)}</strong>` : '';

//   const bodyHtml = `
//     ${badge('success', 'Welcome aboard')}
//     ${heading('Your hlynk dashboard is ready.')}
//     <p>${greeting}</p>
//     <p>Thank you for joining us${bizTitle}. We are glad you are here. Whenever you are ready, this is where we suggest you begin:</p>
//     ${steps([
//       { title: 'Add your products.', text: 'Set up your stock in <strong>Inventory</strong>.' },
//       { title: 'Record your first sale.', text: 'Use the <strong>POS</strong> to sell and issue receipts.' },
//       { title: 'Share your business link.', text: 'Let customers find you in one tap.' },
//     ])}
//     <p style="margin-top:18px;">Your <strong>14-day free trial</strong> is active. No card needed.</p>
//   `;

//   const html = renderEmailLayout({
//     title: 'Welcome to hlynk',
//     bodyHtml,
//     ctaText: 'Open my dashboard',
//     ctaUrl: 'https://hlynk.co.ke/dashboard',
//     footerNote: 'If you ever need onboarding help, our support team is ready on WhatsApp and email.',
//   });

//   return sendEmail({
//     to: email,
//     subject: `Welcome to hlynk, ${businessName || name || 'Partner'}`,
//     html,
//   });
// };

// /**
//  * 2. Subscription Expiry Reminder (e.g. 3 Days Remaining)
//  */
// export const sendSubscriptionReminderEmail = async ({ email, name, businessName, daysRemaining = 3, planName = 'Business Pro', expiryDate }) => {
//   const greeting = name ? `Dear ${esc(name)},` : 'Hello,';
//   const dateStr = expiryDate ? new Date(expiryDate).toLocaleDateString('en-KE', { dateStyle: 'medium' }) : 'soon';

//   const bodyHtml = `
//     ${badge('warning', `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`)}
//     ${heading('Your subscription is expiring soon.')}
//     <p>${greeting}</p>
//     <p>This is a quick reminder that your <strong>${esc(planName)}</strong> plan for <strong>${esc(businessName || 'your business')}</strong> is scheduled to expire on <strong>${dateStr}</strong> (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left).</p>
//     <p>To avoid any disruption to your day-to-day sales, barcode scanning, M-Pesa reconciliation and receipts, please renew before the expiry date.</p>
//     ${box(`
//       <span style="font-family:${SERIF}; font-size:16px; color:${C.emerald};">Plan details</span><br>
//       Business: ${esc(businessName || 'N/A')}<br>
//       Tier: ${esc(planName)}<br>
//       Renew easily with an M-Pesa STK push on your phone.
//     `)}
//   `;

//   const html = renderEmailLayout({
//     title: 'Subscription Expiry Reminder',
//     bodyHtml,
//     ctaText: 'Renew subscription',
//     ctaUrl: 'https://hlynk.co.ke/dashboard/subscription',
//     footerNote: 'Renewing early extends seamlessly from your current expiry date without losing any active days.',
//   });

//   return sendEmail({
//     to: email,
//     subject: `Reminder: Your hlynk subscription expires in ${daysRemaining} days (${businessName || 'Action Required'})`,
//     html,
//   });
// };

// /**
//  * 3. Subscription Expired & 3-Day Post-Expiry Grace Reminder
//  */
// export const sendSubscriptionExpiredEmail = async ({ email, name, businessName, daysExpired = 0, planName = 'Business Pro' }) => {
//   const greeting = name ? `Dear ${esc(name)},` : 'Hello,';
//   const isGracePeriod = daysExpired > 0;

//   const badgeTone = isGracePeriod ? 'urgent' : 'warning';
//   const badgeText = isGracePeriod ? `Expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago` : 'Plan expired today';
//   const headline = isGracePeriod
//     ? `Action required: your account expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago.`
//     : 'Your subscription has ended.';

//   const bodyHtml = `
//     ${badge(badgeTone, badgeText)}
//     ${heading(headline)}
//     <p>${greeting}</p>
//     <p>The subscription for <strong>${esc(businessName || 'your business')}</strong> (${esc(planName)}) ${isGracePeriod ? `expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago` : 'has expired today'}.</p>
//     <p>Your business records, inventory catalogue and past sales receipts are securely saved. Active selling and multi-device access are paused until you renew.</p>
//     ${steps([
//       { title: 'Open your billing page.', text: 'Use the button below.' },
//       { title: 'Enter your M-Pesa number.', text: 'The one you would like to pay with.' },
//       { title: 'Approve the prompt on your phone.', text: 'Your access is restored immediately.' },
//     ])}
//   `;

//   const html = renderEmailLayout({
//     title: 'hlynk Subscription Notice',
//     bodyHtml,
//     ctaText: 'Renew and restore access',
//     ctaUrl: 'https://hlynk.co.ke/dashboard/subscription',
//     footerNote: 'Need flexible arrangements or help with payment? Contact our support desk at info@hlynk.co.ke.',
//   });

//   return sendEmail({
//     to: email,
//     subject: isGracePeriod
//       ? `Action Required: Your hlynk service expired ${daysExpired} days ago (${businessName || 'your account'})`
//       : `Your hlynk subscription expired today (${businessName || 'your account'})`,
//     html,
//   });
// };

// /**
//  * 4. Super Admin Broadcast & Promotional Messages
//  */
// export const sendBroadcastEmail = async ({ email, name, businessName, title, message, type = 'info', actionUrl = 'https://hlynk.co.ke/dashboard', actionText = 'Open hlynk' }) => {
//   const greeting = name ? `Dear ${esc(name)},` : 'Hello Partner,';
//   const badgeTone = type === 'warning' ? 'warning' : 'success';

//   // Escape first, then turn newlines into paragraphs or line breaks
//   const formattedMsg = esc(message).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>');

//   const bodyHtml = `
//     ${badge(badgeTone, 'Announcement')}
//     ${heading(esc(title))}
//     <p>${greeting}</p>
//     <p>${formattedMsg}</p>
//   `;

//   const html = renderEmailLayout({
//     title,
//     bodyHtml,
//     ctaText: actionText,
//     ctaUrl: actionUrl,
//     footerNote: 'You received this official announcement as an active business partner on the hlynk platform.',
//   });

//   return sendEmail({
//     to: email,
//     subject: title,
//     html,
//   });
// };

// /**
//  * 5. Account Removed / Deleted Farewell Email
//  */
// export const sendAccountDeletedEmail = async ({ email, name, businessName, deletedBy = 'self' }) => {
//   const greeting = name ? `Dear ${esc(name)},` : 'Hello,';
//   const bizText = businessName ? ` for <strong>${esc(businessName)}</strong>` : '';
//   const reasonText =
//     deletedBy === 'admin'
//       ? `Your hlynk account${bizText} has been removed by platform administrator.`
//       : deletedBy === 'owner'
//         ? `Your staff access${bizText} on hlynk has been removed by your business administrator.`
//         : `Your hlynk account${bizText} and its associated records have been permanently deleted as requested.`;

//   const bodyHtml = `
//     ${badge('warning', 'Account removed')}
//     ${heading('Sorry to see you go.')}
//     <p>${greeting}</p>
//     <p>${reasonText}</p>
//     <p>Thank you for spending time with hlynk. If this was done in error, or if you ever decide to return and set up a fresh workspace, our team is always happy to help.</p>
//   `;

//   const html = renderEmailLayout({
//     title: 'Account Removed — hlynk',
//     bodyHtml,
//     ctaText: 'Contact Support',
//     ctaUrl: 'mailto:info@hlynk.co.ke',
//     footerNote: 'If you did not expect this change, please reach out to info@hlynk.co.ke immediately.',
//   });

//   return sendEmail({
//     to: email,
//     subject: `Your hlynk account${businessName ? ` (${businessName})` : ''} has been removed`,
//     html,
//   });
// };

// /**
//  * 6. Polite & Catchy 3-Day Inactivity Reminder
//  */
// export const sendInactivityReminderEmail = async ({ email, name, businessName, daysInactive = 3 }) => {
//   const greeting = name ? `Hey ${esc(name)},` : 'Hey there,';
//   const bizName = businessName ? esc(businessName) : 'your business';

//   const bodyHtml = `
//     ${badge('success', 'We miss you')}
//     ${heading('Your biashara misses you.')}
//     <p>${greeting}</p>
//     <p>It has been <strong>${daysInactive} days</strong> since we last saw activity on <strong>${bizName}</strong>.</p>
//     <p>Your inventory, sales tools, and M-Pesa tracking are right where you left them — ready whenever you are to ring up your next sale and keep your numbers sharp.</p>
//     ${steps([
//       { title: 'Check today’s stock.', text: 'Keep tabs on fast-moving items in seconds.' },
//       { title: 'Record a quick sale.', text: 'Issue clean digital receipts in one tap.' },
//     ])}
//   `;

//   const html = renderEmailLayout({
//     title: 'Quick check-in from hlynk',
//     bodyHtml,
//     ctaText: 'Jump back into hlynk',
//     ctaUrl: 'https://hlynk.co.ke/dashboard',
//     footerNote: 'Need a hand getting set up or importing your products? Just reply to this email.',
//   });

//   return sendEmail({
//     to: email,
//     subject: `${businessName ? `${businessName} — ` : ''}Your hlynk workspace is waiting for you`,
//     html,
//   });
// };

// export default {
//   sendEmail,
//   sendWelcomeEmail,
//   sendSubscriptionReminderEmail,
//   sendSubscriptionExpiredEmail,
//   sendBroadcastEmail,
//   sendAccountDeletedEmail,
//   sendInactivityReminderEmail,
//   getTransporter,
// };
