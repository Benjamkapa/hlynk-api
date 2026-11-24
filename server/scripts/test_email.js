import { sendWelcomeEmail, sendSubscriptionReminderEmail, sendSubscriptionExpiredEmail, sendBroadcastEmail, getTransporter } from '../utils/email.js';

const targetEmail = process.argv[2];
const emailType = process.argv[3] || 'welcome'; // welcome | reminder | expired | broadcast

if (!targetEmail || !targetEmail.includes('@')) {
  console.log('Usage: node scripts/test_email.js <email> [type]');
  console.log('Types: welcome (default), reminder, expired, broadcast');
  process.exit(1);
}

console.log(`\n🔍 Checking Brevo / SMTP Configuration...`);
const transporter = getTransporter();

if (!transporter) {
  console.error('❌ Brevo SMTP credentials not configured!');
  console.error('👉 Please set BREVO_SMTP_USER and BREVO_SMTP_KEY in .env or params.json');
  process.exit(1);
}

console.log('📡 Verifying SMTP connection to Brevo...');
transporter.verify(async (error, success) => {
  if (error) {
    console.error('❌ SMTP Connection failed:', error.message);
    process.exit(1);
  } else {
    console.log('✅ SMTP Server is ready to take our messages!');

    let result;
    switch (emailType) {
      case 'welcome':
        console.log(`🚀 Sending test WELCOME email to ${targetEmail}...`);
        result = await sendWelcomeEmail({
          email: targetEmail,
          name: 'Test Partner',
          businessName: 'Demo Biashara'
        });
        break;
      case 'reminder':
        console.log(`🚀 Sending test SUBSCRIPTION REMINDER email to ${targetEmail}...`);
        result = await sendSubscriptionReminderEmail({
          email: targetEmail,
          name: 'Test Partner',
          businessName: 'Demo Biashara',
          daysRemaining: 3,
          expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        });
        break;
      case 'expired':
        console.log(`🚀 Sending test SUBSCRIPTION EXPIRED email to ${targetEmail}...`);
        result = await sendSubscriptionExpiredEmail({
          email: targetEmail,
          name: 'Test Partner',
          businessName: 'Demo Biashara',
          daysExpired: 0
        });
        break;
      case 'broadcast':
        console.log(`🚀 Sending test BROADCAST email to ${targetEmail}...`);
        result = await sendBroadcastEmail({
          email: targetEmail,
          name: 'Test Partner',
          businessName: 'Demo Biashara',
          title: 'Exciting New Feature 🎉',
          message: 'We just launched a new analytics dashboard that helps you track sales in real time. Check it out now!',
          type: 'info',
          actionUrl: 'https://hlynk.co.ke/dashboard',
          actionText: 'Open Dashboard'
        });
        break;
      default:
        console.error('❌ Unknown email type:', emailType);
        process.exit(1);
    }

    if (result && result.success) {
      console.log(`🎉 SUCCESS! Email delivered. Message ID: ${result.messageId}`);
    } else {
      console.error('❌ Send error:', result ? result.error || result.reason : 'no result');
    }

    process.exit(0);
  }
});
