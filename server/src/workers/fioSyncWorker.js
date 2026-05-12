/**
 * Fio Bank Sync Worker
 * This script polls the Fio API for new transactions and activates subscriptions automatically.
 * Run this via cron every 5-15 minutes.
 */
const axios = require('axios');
const prisma = require('../services/db');
const billingController = require('../controllers/billingController');
const logger = require('../services/logger');

const FIO_TOKEN = process.env.FIO_API_TOKEN;
const DAYS_BACK = 3; // How many days to check back for transactions

async function syncFioTransactions() {
  if (!FIO_TOKEN) {
    logger.warn('[FioWorker] FIO_API_TOKEN not set, skipping sync.');
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const past = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    logger.info(`[FioWorker] Checking transactions from ${past} to ${today}`);

    // Fio REST API URL for transaction list
    const url = `https://www.fio.cz/ib_api/rest/periods/${FIO_TOKEN}/${past}/${today}/transactions.json`;
    
    const response = await axios.get(url);
    const transactions = response.data?.accountStatement?.transactionList?.transaction || [];

    logger.info(`[FioWorker] Found ${transactions.length} transactions`);

    for (const tx of transactions) {
      // 1. Extract Variable Symbol (column 5 in Fio JSON) and Amount (column 1)
      const vs = tx.column5?.value; 
      const amount = tx.column1?.value;
      const currency = tx.column14?.value;

      if (!vs) continue;

      // 2. Check if we have a pending subscription with this VS
      const result = await billingController._activateSubscription(String(vs), true);
      
      if (result.success) {
        logger.info(`[FioWorker] SUCCESS: Activated subscription via VS ${vs} (Amount: ${amount} ${currency})`);
      }
    }

  } catch (error) {
    logger.error('[FioWorker] Error during sync:', error.message);
    if (error.response) {
      logger.error('[FioWorker] API Response:', error.response.data);
    }
  }
}

// If run directly
if (require.main === module) {
  syncFioTransactions().then(() => process.exit(0));
}

module.exports = { syncFioTransactions };
