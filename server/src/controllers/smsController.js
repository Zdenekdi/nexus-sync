const { getIO } = require('../services/socket');
const prisma = require('../services/db');
const pushService = require('../services/pushService');

exports.incomingSms = async (req, res) => {
  try {
    const { from, body, timestamp, installationId } = req.body;
    const agencyId = req.user.agencyId; // Z relay JWT

    if (!from || !body) {
      return res.status(400).json({ error: 'Missing from or body' });
    }

    const io = getIO();
    
    // Přepošli všem operátorům v agentuře do prohlížeče
    io.to(`agency_${agencyId}`).emit('sms:incoming', {
      from,
      body,
      timestamp: timestamp || Date.now(),
      installationId
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Incoming SMS error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.sendSms = async (req, res) => {
  try {
    const { to, text } = req.body;
    const agencyId = req.user.agencyId;

    if (!to || !text) {
      return res.status(400).json({ error: 'Missing to or text' });
    }

    // Pro odeslání přes relay využijeme existující pushService nebo najdeme aktivní relay 
    // a pošleme událost. Socket: "relay_event" (type: send_sms) nebo FCM pushService.
    const io = getIO();
    // V této jednodušší verzi zkusíme emitovat socket event všem relay zařízením dané agentury,
    // jelikož se identifikují podle agencyId.
    // Pro Relay používáme místnost agency_${agencyId}.
    io.to(`agency_${agencyId}`).emit('relay_event', {
      type: 'send_sms',
      to,
      content: text,
      agencyId
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
