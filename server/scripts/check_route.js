import axios from 'axios';

async function testRoute() {
  try {
    const res = await axios.post('http://localhost:3000/api/v1/sales/mpesa-push', {
      phone: '0712345678',
      amount: 1,
      reference: 'TEST'
    });
    console.log('Response:', res.status, res.data);
  } catch (err) {
    if (err.response) {
      console.log('Error Response:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

testRoute();
