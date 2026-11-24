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

  const SMTP_HOST = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || params.smtp_host;
  const SMTP_PORT = parseInt(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || params.smtp_port);
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

const C = {
  deep: '#0A3B2E', // page surround and headings
  emerald: '#0B5D45', // buttons, seal, accents
  mint: '#D5E5DC', // hairlines
  frame: '#BFD8CB', // inner frame
  ink: '#26352F', // body text
  muted: '#51645B',
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

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
  success: { bg: '#E6F4EC', fg: C.emerald },
  warning: { bg: '#FEF3C7', fg: '#92400E' },
  urgent: { bg: '#FEE2E2', fg: '#991B1B' },
};

// Quiet centred status pill above the headline
const badge = (tone, text) => {
  const t = BADGE_TONES[tone] || BADGE_TONES.success;
  return `<p style="margin:0 0 14px 0; text-align:center;"><span style="display:inline-block; padding:4px 12px; border-radius:999px; background-color:${t.bg}; color:${t.fg}; font-family:${SANS}; font-size:12px; line-height:16px; font-weight:600;">${text}</span></p>`;
};

const heading = (text) =>
  `<h2 style="margin:0 0 26px 0; text-align:center; font-family:${SERIF}; font-size:30px; line-height:37px; font-weight:normal; letter-spacing:-0.4px; color:${C.deep};">${text}</h2>`;

// Hairline-separated list (replaces bullet lists and tinted boxes)
const steps = (items) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px 0;">${items
    .map(
      (item, i) => `<tr><td style="padding:16px 0; border-top:1px solid ${C.mint};${i === items.length - 1 ? ` border-bottom:1px solid ${C.mint};` : ''} font-family:${SANS}; font-size:14px; line-height:22px; color:${C.muted};"><span style="font-family:${SERIF}; font-size:16px; color:${C.emerald};">${item.title}</span><br>${item.text}</td></tr>`,
    )
    .join('')}</table>`;

// Quiet note block (replaces the old tinted .box)
const box = (innerHtml) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;"><tr><td style="padding:16px 0; border-top:1px solid ${C.mint}; border-bottom:1px solid ${C.mint}; font-family:${SANS}; font-size:14px; line-height:23px; color:${C.muted};">${innerHtml}</td></tr></table>`;

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
    a { color:${C.emerald}; }
    .content p { margin:0 0 16px 0; }
    @media only screen and (max-width:620px) {
      .container { width:100% !important; }
      .outer { padding:20px 10px !important; }
      .px { padding-left:26px !important; padding-right:26px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${C.deep};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all; font-size:1px; line-height:1px; color:${C.deep};">
    ${esc(title)}
    &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.deep}">
    <tr>
      <td class="outer" align="center" style="padding:48px 16px;">
        <table role="presentation" class="container" width="580" cellpadding="0" cellspacing="0" border="0" style="width:580px; max-width:580px;">
          <tr>
            <td bgcolor="#FFFFFF" style="background-color:#FFFFFF; padding:10px; border-radius:4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.frame};">

                <!-- Seal and tagline -->
                <tr>
                  <td align="center" style="padding-bottom:44px 40px 0 40px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <img src="https://ik.imagekit.io/jyhkrwjfg/logo.png" alt="hlynk Logo" width="80">  
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Rule -->
                <tr>
                  <td align="center" style="padding:26px 0 0 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr><td width="48" height="1" bgcolor="${C.emerald}" style="width:48px; height:1px; font-size:0; line-height:0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td class="px content" style="padding:34px 52px 0 52px; font-family:${SERIF}; font-size:16px; line-height:27px; color:${C.ink};">
                    ${bodyHtml}
                    ${
                      ctaText && ctaUrl
                        ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:30px auto 8px auto;">
                      <tr>
                        <td align="center" bgcolor="${C.emerald}" style="background-color:${C.emerald}; border-radius:2px;">
                          <a href="${ctaUrl}" target="_blank" style="display:inline-block; padding:15px 38px; font-family:${SANS}; font-size:15px; line-height:18px; font-weight:600; letter-spacing:0.6px; color:#FFFFFF !important; text-decoration:none;">${ctaText}</a>
                        </td>
                      </tr>
                    </table>`
                        : ''
                    }
                    ${footerNote ? `<p style="margin:24px 0 0 0; text-align:center; font-family:${SANS}; font-size:13px; line-height:20px; color:#6B7F76;">${footerNote}</p>` : ''}
                  </td>
                </tr>

                <!-- Sign-off -->
                <tr>
                  <td class="px" style="padding:34px 52px 44px 52px; font-family:${SERIF}; font-size:16px; line-height:26px; color:${C.ink};">
                    With warm regards,<br>
                    <span style="font-size:20px; line-height:32px; font-style:italic; color:${C.emerald};">The hlynk Team</span>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer on emerald -->
          <tr>
            <td align="center" style="padding:28px 24px 0 24px; font-family:${SANS}; font-size:12px; line-height:19px; color:#8FB8A6;">
              Need support? Email us at <a href="mailto:info@hlynk.co.ke" style="color:#D1FAE5;">info@hlynk.co.ke</a> or call support.<br><br>
              &copy; ${currentYear} hlynk. All rights reserved.
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
  const greeting = name ? `Dear ${esc(name)},` : 'Hello,';
  const bizTitle = businessName ? ` for <strong>${esc(businessName)}</strong>` : '';

  const bodyHtml = `
    ${badge('success', 'Welcome aboard')}
    ${heading('Your hlynk dashboard is ready.')}
    <p>${greeting}</p>
    <p>Thank you for joining us${bizTitle}. We are glad you are here. Whenever you are ready, this is where we suggest you begin:</p>
    ${steps([
      { title: 'Add your products.', text: 'Set up your stock in <strong>Inventory</strong>.' },
      { title: 'Record your first sale.', text: 'Use the <strong>POS</strong> to sell and issue receipts.' },
      { title: 'Share your business link.', text: 'Let customers find you in one tap.' },
    ])}
    <p style="margin-top:18px;">Your <strong>14-day free trial</strong> is active. No card needed.</p>
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
  const greeting = name ? `Dear ${esc(name)},` : 'Hello,';
  const dateStr = expiryDate ? new Date(expiryDate).toLocaleDateString('en-KE', { dateStyle: 'medium' }) : 'soon';

  const bodyHtml = `
    ${badge('warning', `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`)}
    ${heading('Your subscription is expiring soon.')}
    <p>${greeting}</p>
    <p>This is a quick reminder that your <strong>${esc(planName)}</strong> plan for <strong>${esc(businessName || 'your business')}</strong> is scheduled to expire on <strong>${dateStr}</strong> (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left).</p>
    <p>To avoid any disruption to your day-to-day sales, barcode scanning, M-Pesa reconciliation and receipts, please renew before the expiry date.</p>
    ${box(`
      <span style="font-family:${SERIF}; font-size:16px; color:${C.emerald};">Plan details</span><br>
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
  const greeting = name ? `Dear ${esc(name)},` : 'Hello,';
  const isGracePeriod = daysExpired > 0;

  const badgeTone = isGracePeriod ? 'urgent' : 'warning';
  const badgeText = isGracePeriod ? `Expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago` : 'Plan expired today';
  const headline = isGracePeriod
    ? `Action required: your account expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago.`
    : 'Your subscription has ended.';

  const bodyHtml = `
    ${badge(badgeTone, badgeText)}
    ${heading(headline)}
    <p>${greeting}</p>
    <p>The subscription for <strong>${esc(businessName || 'your business')}</strong> (${esc(planName)}) ${isGracePeriod ? `expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago` : 'has expired today'}.</p>
    <p>Your business records, inventory catalogue and past sales receipts are securely saved. Active selling and multi-device access are paused until you renew.</p>
    ${steps([
      { title: 'Open your billing page.', text: 'Use the button below.' },
      { title: 'Enter your M-Pesa number.', text: 'The one you would like to pay with.' },
      { title: 'Approve the prompt on your phone.', text: 'Your access is restored immediately.' },
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
  const greeting = name ? `Dear ${esc(name)},` : 'Hello Partner,';
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

export default {
  sendEmail,
  sendWelcomeEmail,
  sendSubscriptionReminderEmail,
  sendSubscriptionExpiredEmail,
  sendBroadcastEmail,
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

//   const SMTP_HOST = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || params.smtp_host || 'smtp-relay.brevo.com';
//   const SMTP_PORT = parseInt(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || params.smtp_port || '587', 10);
//   const SMTP_USER = process.env.BREVO_SMTP_USER || process.env.SMTP_USER || params.smtp_user || '';
//   const SMTP_PASS = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS || params.smtp_pass || params.brevo_api_key || '';

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

// /**
//  * Common base wrapper for Hlynk branded emails
//  */
// const renderEmailLayout = ({ title, bodyHtml, ctaText, ctaUrl, footerNote }) => {
//   const currentYear = new Date().getFullYear();
//   return `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="utf-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <title>${title}</title>
//   <style>
//     body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
//     .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding: 40px 10px; }
//     .main { background: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
//     .header { background: #0D4A3E; padding: 32px 24px; text-align: center; }
//     .header h1 { margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
//     .header p { margin: 6px 0 0; color: #a7f3d0; font-size: 14px; }
//     .content { padding: 32px 24px; font-size: 15px; line-height: 1.6; color: #334155; }
//     .cta-container { text-align: center; margin: 32px 0 20px; }
//     .btn { display: inline-block; background-color: #0D4A3E; color: #ffffff !important; padding: 13px 32px; font-weight: 600; font-size: 15px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(13,74,62,0.2); }
//     .btn:hover { background-color: #0b3d33; }
//     .footer { padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
//     .footer a { color: #0D4A3E; text-decoration: underline; }
//     .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
//     .badge-success { background: #dcfce7; color: #166534; }
//     .badge-warning { background: #fef3c7; color: #92400e; }
//     .badge-urgent { background: #fee2e2; color: #991b1b; }
//     .box { background: #f8fafc; border-left: 4px solid #0D4A3E; padding: 16px; margin: 20px 0; border-radius: 4px; }
//   </style>
// </head>
// <body>
//   <table class="wrapper" cellpadding="0" cellspacing="0" border="0">
//     <tr>
//       <td align="center">
//         <table class="main" cellpadding="0" cellspacing="0" border="0" width="100%">
//           <tr>
//             <td class="header" align="center">
//               <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">hlynk</h1>
//               <p style="margin: 6px 0 0; color: #a7f3d0; font-size: 13px; font-weight: 500;">Operating System for Kenyan Biashara</p>
//             </td>
//           </tr>
//           <tr>
//             <td class="content">
//               ${bodyHtml}
//               ${ctaText && ctaUrl ? `
//                 <div class="cta-container">
//                   <a href="${ctaUrl}" class="btn" target="_blank">${ctaText} &rarr;</a>
//                 </div>
//               ` : ''}
//               ${footerNote ? `<p style="font-size: 13px; color: #64748b; margin-top: 24px;">${footerNote}</p>` : ''}
//             </td>
//           </tr>
//           <tr>
//             <td class="footer">
//               <p>© ${currentYear} hlynk. All rights reserved.</p>
//               <p>Need support? Email us at <a href="mailto:info@hlynk.co.ke">info@hlynk.co.ke</a> or call support.</p>
//               <p style="margin-top:8px;">
//                 <a href="https://wa.me/254750954980" style="margin-right:8px; text-decoration:none;">💬 WhatsApp</a>
//                 <a href="https://www.tiktok.com/@hlynk_inc" style="margin-right:8px; text-decoration:none;">🎵 TikTok</a>
//                 <a href="https://www.instagram.com/hlynk_inc" style="margin-right:8px; text-decoration:none;">📸 Instagram</a>
//                 <a href="tel:+254790590653" style="margin-right:8px; text-decoration:none;">📞 Call</a>
//               </p>
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
//       text: text || html.replace(/<[^>]*>?/gm, ''), // plain text fallback
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
//   const greeting = name ? `Hi ${name},` : 'Hello,';
//   const bizTitle = businessName ? ` for <strong>${businessName}</strong>` : '';

//   const bodyHtml = `
//     <span class="badge badge-success">🎉 Welcome aboard!</span>
//     <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Your hlynk dashboard is ready 🚀</h2>
//     <p>${greeting}</p>
//     <p>We’re thrilled to have you${bizTitle} on board. Get up‑and‑running in three quick steps:</p>
//     <ul style="margin: 8px 0 0 20px; color: #475569;">
//       <li>📦 Add products in <strong>Inventory</strong>.</li>
//       <li>💰 Record sales via <strong>POS</strong>.</li>
//       <li>🔗 Share your Business link.</li>
//     </ul>
//     <p>Enjoy a <strong>14‑day free trial</strong> – no card needed.</p>
//   `;

//   const html = renderEmailLayout({
//     title: 'Welcome to hlynk',
//     bodyHtml,
//     ctaText: 'Open My Dashboard',
//     ctaUrl: 'https://hlynk.co.ke/dashboard',
//     footerNote: 'If you ever need onboarding help, our support team is ready on WhatsApp and email.'
//   });

//   return sendEmail({
//     to: email,
//     subject: `Welcome to hlynk, ${businessName || name || 'Partner'}! 🚀`,
//     html
//   });
// };

// /**
//  * 2. Subscription Expiry Reminder (e.g. 3 Days Remaining)
//  */
// export const sendSubscriptionReminderEmail = async ({ email, name, businessName, daysRemaining = 3, planName = 'Business Pro', expiryDate }) => {
//   const greeting = name ? `Hi ${name},` : 'Hello,';
//   const dateStr = expiryDate ? new Date(expiryDate).toLocaleDateString('en-KE', { dateStyle: 'medium' }) : 'soon';

//   const bodyHtml = `
//     <span class="badge badge-warning">⏳ Expiry Reminder (${daysRemaining} Days Left)</span>
//     <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Your subscription is expiring soon</h2>
//     <p>${greeting}</p>
//     <p>This is a quick reminder that your <strong>${planName}</strong> plan for <strong>${businessName || 'your business'}</strong> is scheduled to expire on <strong>${dateStr}</strong> (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left).</p>
    
//     <p>To avoid any disruption to your day-to-day sales, barcode scanning, M-Pesa reconciliation, and receipts, please renew your subscription before the expiry date.</p>
    
//     <div class="box">
//       <strong>Plan Details:</strong><br/>
//       Business: ${businessName || 'N/A'}<br/>
//       Tier: ${planName}<br/>
//       Renewable easily via M-Pesa STK push directly on your phone.
//     </div>
//   `;

//   const html = renderEmailLayout({
//     title: 'Subscription Expiry Reminder',
//     bodyHtml,
//     ctaText: 'Renew Subscription Now',
//     ctaUrl: 'https://hlynk.co.ke/dashboard/subscription',
//     footerNote: 'Renewing early extends seamlessly from your current expiry date without losing any active days.'
//   });

//   return sendEmail({
//     to: email,
//     subject: `Reminder: Your hlynk subscription expires in ${daysRemaining} days (${businessName || 'Action Required'})`,
//     html
//   });
// };

// /**
//  * 3. Subscription Expired & 3-Day Post-Expiry Grace Reminder
//  */
// export const sendSubscriptionExpiredEmail = async ({ email, name, businessName, daysExpired = 0, planName = 'Business Pro' }) => {
//   const greeting = name ? `Hi ${name},` : 'Hello,';
//   const isGracePeriod = daysExpired > 0;
  
//   const badgeClass = isGracePeriod ? 'badge-urgent' : 'badge-warning';
//   const badgeText = isGracePeriod ? `⚠️ Expired ${daysExpired} Days Ago` : '⚠️ Plan Expired Today';
//   const headline = isGracePeriod 
//     ? 'Action required: Your account expired 3 days ago'
//     : 'Your subscription has ended';

//   const bodyHtml = `
//     <span class="badge ${badgeClass}">${badgeText}</span>
//     <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">${headline}</h2>
//     <p>${greeting}</p>
//     <p>The subscription for <strong>${businessName || 'your business'}</strong> (${planName}) ${isGracePeriod ? `expired ${daysExpired} days ago` : 'has expired today'}.</p>
    
//     <p>Your business records, inventory catalogs, and past sales receipts are securely saved, but active selling and multi-device access are currently paused until renewal.</p>
    
//     <div class="box">
//       <strong>How to restore full access:</strong>
//       <ol style="margin: 8px 0 0 0; padding-left: 20px; color: #475569;">
//         <li>Click the button below to open your billing portal.</li>
//         <li>Enter your M-Pesa phone number.</li>
//         <li>Authorize the payment on your phone pin prompt to immediately reactivate.</li>
//       </ol>
//     </div>
//   `;

//   const html = renderEmailLayout({
//     title: 'hlynk Subscription Notice',
//     bodyHtml,
//     ctaText: 'Renew & Restore Access',
//     ctaUrl: 'https://hlynk.co.ke/dashboard/subscription',
//     footerNote: 'Need flexible arrangements or help with payment? Contact our support desk at info@hlynk.co.ke.'
//   });

//   return sendEmail({
//     to: email,
//     subject: isGracePeriod 
//       ? `Action Required: Your hlynk service expired ${daysExpired} days ago (${businessName})`
//       : `Your hlynk subscription expired today (${businessName})`,
//     html
//   });
// };

// /**
//  * 4. Super Admin Broadcast & Promotional Messages
//  */
// export const sendBroadcastEmail = async ({ email, name, businessName, title, message, type = 'info', actionUrl = 'https://hlynk.co.ke/dashboard', actionText = 'Open hlynk' }) => {
//   const greeting = name ? `Hi ${name},` : 'Hello Partner,';
//   const badgeClass = type === 'success' ? 'badge-success' : type === 'warning' ? 'badge-warning' : 'badge-success';

//   // Format newlines into paragraphs or break tags
//   const formattedMsg = message.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>');

//   const bodyHtml = `
//     <span class="badge ${badgeClass}">Announcement</span>
//     <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">${title}</h2>
//     <p>${greeting}</p>
//     <div style="font-size: 15px; color: #334155; line-height: 1.6;">
//       <p>${formattedMsg}</p>
//     </div>
//   `;

//   const html = renderEmailLayout({
//     title,
//     bodyHtml,
//     ctaText: actionText,
//     ctaUrl: actionUrl,
//     footerNote: 'You received this official announcement as an active business partner on the hlynk platform.'
//   });

//   return sendEmail({
//     to: email,
//     subject: title,
//     html
//   });
// };

// export default {
//   sendEmail,
//   sendWelcomeEmail,
//   sendSubscriptionReminderEmail,
//   sendSubscriptionExpiredEmail,
//   sendBroadcastEmail,
//   getTransporter
// };
