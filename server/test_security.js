// test_security.js
async function testAttack() {
  const url = 'http://localhost:3000/api/v1/payments/mpesa/callback';
  
  console.log('--- Simulating Unauthorized Callback Attack ---');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Body: {
          stkCallback: { ResultCode: 0, ResultDesc: "Fake Success", CheckoutRequestID: "ws_TEST_123" }
        }
      })
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);

    if (response.status === 403) {
      console.log('✅ TEST PASSED: The attack was blocked by your IP Whitelist!');
    } else {
      console.log('❌ TEST FAILED: The request got through. Check your middleware.');
    }
  } catch (err) {
    console.error('Error connecting to server:', err.message);
  }
}

testAttack();
