// Using global fetch available in Node

const url = 'http://localhost:3000/api/v1/staff/createStaff';
const payload = {
  name: 'Test Dummy',
  phone: '0751111111',
  email: 'ibenjamkapa@gmail.com',
  password: 'Secret123',
  permissions: [],
  commissionType: 'NONE',
  commissionRate: 0,
  baseSalary: 0,
};
(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log('Response:', data);
  } catch (e) {
    console.error('Error:', e);
  }
})();
