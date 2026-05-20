import { db } from '../dbms/mysql.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const email = process.argv[2];
const JWT_SECRET = process.env.JWT_SECRET || 'hlynk_jwt_secret_dev_2025_change_in_production';

if (!email) {
  console.log('Usage: node scripts/generate_token.js [user_email]');
  process.exit(1);
}

async function generate() {
  try {
    const [users] = await db.query('SELECT id, tenantId, role, name FROM User WHERE email = ?', [email]);
    if (users.length === 0) {
      console.error(`❌ User with email "${email}" not found.`);
      process.exit(1);
    }
    const user = users[0];
    
    const payload = { 
      userId: user.id, 
      tenantId: user.tenantId, 
      role: user.role,
      name: user.name 
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    
    console.log(`\n🔑 TOKEN GENERATED FOR: ${user.name} (${user.role})`);
    console.log('-------------------------------------------');
    console.log(token);
    console.log('-------------------------------------------');
    console.log('Note: This token is valid for 24 hours.');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error generating token:', err.message);
    process.exit(1);
  }
}

generate();
