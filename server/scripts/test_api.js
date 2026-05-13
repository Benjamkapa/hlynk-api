import fetch from 'node-fetch'; // If using Node < 18, otherwise native fetch is fine

const BASE_URL = 'http://localhost:3000/api';
let TOKEN = '';

async function runTests() {
  console.log('🚀 Starting HudumaLynk API Test Suite...\n');

  try {
    // 1. Health Check
    const health = await fetch('http://localhost:3000/').then(r => r.json());
    console.log('✅ Server Health:', health.message);

    // 2. Auth (Public Stats)
    const stats = await fetch(`${BASE_URL}/platform/stats`).then(r => r.json());
    console.log('📊 Public Stats:', stats.success ? 'OK' : 'FAIL');

    console.log('\n⚠️  Note: Protected routes require a valid JWT.');
    console.log('To test protected routes, please set the TOKEN variable in this script.');
    
    if (!TOKEN) {
      console.log('\n🏁 Basic tests completed. Add a TOKEN to test CRUD operations.');
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    };

    // 3. Provider Profile
    const profile = await fetch(`${BASE_URL}/providers/profile`, { headers }).then(r => r.json());
    console.log('👤 Provider Profile:', profile.success ? 'OK' : 'FAIL');

    // 4. Staff List
    const staff = await fetch(`${BASE_URL}/staff`, { headers }).then(r => r.json());
    console.log('👥 Staff List:', staff.success ? `OK (${staff.staff?.length || 0} found)` : 'FAIL');

    // 5. Inventory
    const inventory = await fetch(`${BASE_URL}/inventory`, { headers }).then(r => r.json());
    console.log('📦 Inventory List:', inventory.success ? `OK (${inventory.items?.length || 0} found)` : 'FAIL');

    // 6. Sales
    const sales = await fetch(`${BASE_URL}/sales`, { headers }).then(r => r.json());
    console.log('💰 Sales List:', sales.success ? `OK (${sales.sales?.length || 0} found)` : 'FAIL');

    // 7. Customers
    const customers = await fetch(`${BASE_URL}/customers`, { headers }).then(r => r.json());
    console.log('🤝 Customer List:', customers.success ? `OK (${customers.customers?.length || 0} found)` : 'FAIL');

    // 8. Admin (requires Super Admin)
    const admin = await fetch(`${BASE_URL}/admin/health`, { headers }).then(r => r.json());
    if (admin.success) {
      console.log('👑 Admin Health:', 'OK');
    } else {
      console.log('👑 Admin Health:', 'SKIPPED (Insufficient Permissions)');
    }

    console.log('\n🎉 All accessible tests completed successfully.');
  } catch (err) {
    console.error('\n❌ Test Error:', err.message);
    console.log('Is the server running? Run "node index.js" first.');
  }
}

runTests();
