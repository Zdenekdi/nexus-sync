/**
 * BACKEND EXAMPLE - Express.js with Firebase Firestore
 * 
 * This is a reference implementation showing how to build
 * the API endpoints that the frontend expects.
 * 
 * Adapt this for your specific database & authentication.
 */

const express = require('express');
const admin = require('firebase-admin');

// Initialize Firebase
// admin.initializeApp(serviceAccountKey);
const db = admin.firestore();

const app = express();
app.use(express.json());

// ============================================================
// MIDDLEWARE
// ============================================================

// Auth middleware
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.userId = decodedToken.uid;
    req.user = await db.collection('users').doc(decodedToken.uid).get();
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Agency isolation middleware
const agencyMiddleware = (req, res, next) => {
  const agencyId = req.query.agencyId || req.user.data().agencyId;
  
  // Verify user belongs to agency
  if (req.user.data().agencyId !== agencyId && req.user.data().role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  req.agencyId = agencyId;
  next();
};

app.use(authMiddleware);
app.use(agencyMiddleware);

// ============================================================
// MESSAGES ENDPOINTS
// ============================================================

// Create message
app.post('/api/messages', async (req, res) => {
  try {
    const { channel, conversationId, from, to, content, metadata } = req.body;
    
    const message = {
      channel,
      conversationId,
      sender: from,
      recipient: to,
      content,
      metadata: metadata || {},
      status: 'sent',
      agencyId: req.agencyId,
      operatorId: req.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('messages').add(message);
    res.json({ id: docRef.id, ...message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get message
app.get('/api/messages/:id', async (req, res) => {
  try {
    const doc = await db.collection('messages').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversation messages
app.get('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const query = await db.collection('messages')
      .where('conversationId', '==', req.params.id)
      .where('agencyId', '==', req.agencyId)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();
    
    const messages = [];
    query.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ messages, total: messages.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark message as read
app.patch('/api/messages/:id/read', async (req, res) => {
  try {
    await db.collection('messages').doc(req.params.id).update({
      read: true,
      readAt: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search messages
app.get('/api/messages/search', async (req, res) => {
  try {
    const { q, channel, conversationId } = req.query;
    
    let query = db.collection('messages')
      .where('agencyId', '==', req.agencyId);
    
    if (channel) query = query.where('channel', '==', channel);
    if (conversationId) query = query.where('conversationId', '==', conversationId);
    
    // Full text search would require dedicated search index
    const snapshot = await query.get();
    
    const results = [];
    snapshot.forEach(doc => {
      if (q && !doc.data().content.includes(q)) return;
      results.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// CONVERSATIONS ENDPOINTS
// ============================================================

// Create conversation
app.post('/api/conversations', async (req, res) => {
  try {
    const { participants, metadata } = req.body;
    
    const conversation = {
      participants,
      metadata: metadata || {},
      status: 'active',
      agencyId: req.agencyId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('conversations').add(conversation);
    res.json({ id: docRef.id, ...conversation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversation
app.get('/api/conversations/:id', async (req, res) => {
  try {
    const doc = await db.collection('conversations').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const { channel, status, limit = 20 } = req.query;
    
    let query = db.collection('conversations')
      .where('agencyId', '==', req.agencyId);
    
    if (channel) query = query.where('channel', '==', channel);
    if (status) query = query.where('status', '==', status);
    
    const snapshot = await query.limit(parseInt(limit)).get();
    
    const conversations = [];
    snapshot.forEach(doc => {
      conversations.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update conversation
app.patch('/api/conversations/:id', async (req, res) => {
  try {
    await db.collection('conversations').doc(req.params.id).update({
      ...req.body,
      updatedAt: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Close conversation
app.post('/api/conversations/:id/close', async (req, res) => {
  try {
    const { reason } = req.body;
    
    await db.collection('conversations').doc(req.params.id).update({
      status: 'closed',
      closedAt: new Date(),
      closureReason: reason || ''
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign operator
app.post('/api/conversations/:id/assign', async (req, res) => {
  try {
    const { operatorId } = req.body;
    
    await db.collection('conversations').doc(req.params.id).update({
      assignedOperator: operatorId,
      status: 'active',
      assignedAt: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ANALYTICS ENDPOINTS
// ============================================================

// Track event
app.post('/api/analytics/events', async (req, res) => {
  try {
    const { type, operatorId, talentId, metadata } = req.body;
    
    const event = {
      type,
      operatorId: operatorId || null,
      talentId: talentId || null,
      agencyId: req.agencyId,
      metadata: metadata || {},
      timestamp: new Date()
    };
    
    await db.collection('events').add(event);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get operator KPIs
app.get('/api/analytics/operators/:id/kpis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const snapshot = await db.collection('events')
      .where('operatorId', '==', req.params.id)
      .where('agencyId', '==', req.agencyId)
      .where('timestamp', '>=', new Date(startDate))
      .where('timestamp', '<=', new Date(endDate))
      .get();
    
    // Calculate KPIs from events
    const events = [];
    snapshot.forEach(doc => events.push(doc.data()));
    
    const kpis = {
      operatorId: req.params.id,
      messagesSent: events.filter(e => e.type === 'message.sent').length,
      avgHandleTime: 3.2, // Calculate from data
      customerSatisfaction: 4.8,
      responseTime: 1.2,
      conversionRate: 12.5,
      onlineTime: 40
    };
    
    res.json(kpis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get talent KPIs
app.get('/api/analytics/talents/:id/kpis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const snapshot = await db.collection('events')
      .where('talentId', '==', req.params.id)
      .where('agencyId', '==', req.agencyId)
      .where('timestamp', '>=', new Date(startDate))
      .where('timestamp', '<=', new Date(endDate))
      .get();
    
    const events = [];
    snapshot.forEach(doc => events.push(doc.data()));
    
    const kpis = {
      talentId: req.params.id,
      totalSessions: events.filter(e => e.type === 'session.start').length,
      totalEarnings: 8500,
      avgSessionDuration: 25.3,
      clientRating: 4.9,
      noShowRate: 2.1
    };
    
    res.json(kpis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agency analytics
app.get('/api/analytics/agencies/:id', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const snapshot = await db.collection('events')
      .where('agencyId', '==', req.params.id)
      .where('timestamp', '>=', new Date(startDate))
      .where('timestamp', '<=', new Date(endDate))
      .get();
    
    const analytics = {
      agencyId: req.params.id,
      totalMessages: 5234,
      totalCalls: 342,
      totalRevenue: 125000,
      activeOperators: 12,
      activeTalents: 34,
      avgCustomerSatisfaction: 4.7
    };
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get real-time dashboard
app.get('/api/analytics/agencies/:id/realtime', async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const snapshot = await db.collection('events')
      .where('agencyId', '==', req.params.id)
      .where('timestamp', '>=', oneHourAgo)
      .get();
    
    const dashboard = {
      timestamp: new Date(),
      agencyId: req.params.id,
      onlineOperators: 8,
      activeChats: 23,
      pendingMessages: 5,
      avgResponseTime: 0.8,
      messagesLastHour: 342,
      callsLastHour: 23
    };
    
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', async (req, res) => {
  try {
    await db.collection('_health').doc('check').set({ timestamp: new Date() });
    res.json({ status: 'ok', db: true });
  } catch (error) {
    res.status(500).json({ status: 'error', db: false, error: error.message });
  }
});

// ============================================================
// SERVER
// ============================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
