const jwt = require('jsonwebtoken');
const prisma = require('../services/db');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    // Single-purpose tokens (e.g. password reset) must not act as session bearers.
    if (decoded.type === 'password_reset') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    // Jediný DB lookup: čerstvá role (autorita) + tokenVersion (revokace relay tokenů).
    // #7: NIKDY nedůvěřujeme roli zapečené v JWT — zastará, jakmile admin uživateli
    // roli změní (degradace/povýšení). Autoritou je vždy aktuální role z DB.
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        tokenVersion: true,
        role: { select: { name: true, isManager: true, isAppOwner: true } }
      }
    });

    // Relay tokeny (automatizace) jsou revokovatelné přes user.tokenVersion.
    if (decoded.type === 'relay') {
      if (!dbUser || (decoded.tv || 0) !== (dbUser.tokenVersion || 0)) {
        return res.status(401).json({ message: 'Relay token revoked' });
      }
    }

    // Čerstvá role z DB přepíše zastaralý snapshot v tokenu. Když uživatel v DB není
    // (smazaný účet), roli nepřepisujeme — access token je krátkodobý a refresh
    // takovému účtu stejně selže; instant revokace smazaného účtu řeší tokenVersion.
    if (dbUser?.role) {
      decoded.role = dbUser.role;
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
