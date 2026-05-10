const axios = require('axios');
const API_BASE = 'https://nexus-api.myvnc.com/api';

async function checkLogin(email) {
  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: email,
      password: 'password123'
    }, { validateStatus: () => true });
    console.log(`Login ${email}: ${res.status} ${res.data?.message || ''}`);
  } catch (err) {
    console.log(`Error ${email}: ${err.message}`);
  }
}

checkLogin('alice@nexus.sync');
checkLogin('alice@nexus-sync.com');
