const express = require('express');
const request = require('supertest');
const app = express();
app.get('/test', (req, res) => res.json({ ok: true }));

async function runTest() {
  try {
    const res = await request(app).get('/test');
    console.log('Result:', res.body);
    process.exit(0);
  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
}

runTest();
