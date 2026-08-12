const prisma = require('../services/db');
const authMiddleware = require('./authMiddleware');
const { secureCompare, deriveRelaySecret } = require('../utils/security');

/**
 * Ověření pro koncové body, na které sahá jak prohlížeč, tak relay telefon.
 *
 * Relay běží na cizím telefonu jako služba na pozadí. WebView, který drží
 * přihlášení, systém dřív nebo později zabije — a nativní služba pak zůstane
 * s access tokenem, který má životnost jednu hodinu. Po jejím uplynutí
 * dostávala na `/messages/outbox` napořád 401, mlčky se vracela a odchozí SMS
 * zůstávaly viset na `pending_relay`. Nešlo to poznat: aplikace běžela,
 * oznámení svítilo, jen nic nedělala.
 *
 * Řešením není delší token, ale pověření, které nevyprší a patří ZAŘÍZENÍ:
 * per-device secret HMAC(DEVICE_SECRET, installationId), který telefon dostane
 * při párování z `/device/verify`. Stejné pověření už používají WebRTC cesty
 * (`relayAuthMiddleware`), takže se nezavádí nic nového.
 *
 * Precedence: hlavičky zařízení mají přednost. Když dorazí a nesedí, žádost
 * padne — nepropadá se zpátky na Bearer. Tichý přechod mezi dvěma způsoby
 * ověření je přesně to, u čeho se pak nedá zjistit, čí přístup se vlastně
 * použil.
 */
module.exports = async (req, res, next) => {
  const installationId = req.headers['x-installation-id'];
  const deviceSecret = req.headers['x-device-secret'];

  // Bez hlaviček zařízení jde všechno beze změny přes běžné přihlášení.
  if (!installationId || !deviceSecret) return authMiddleware(req, res, next);

  try {
    const ocekavany = deriveRelaySecret(String(installationId));
    if (!ocekavany || !secureCompare(deviceSecret, ocekavany)) {
      return res.status(401).json({ message: 'Invalid device secret' });
    }

    const binding = await prisma.deviceBinding.findFirst({
      where: { installationId: String(installationId), active: true },
      select: { installationId: true, userId: true, agencyId: true, profileId: true },
    });
    if (!binding || !binding.agencyId) {
      return res.status(401).json({ message: 'Relay device not bound' });
    }

    // Role zařízení není role uživatele. Telefon nesmí zdědit oprávnění
    // manažerky jen proto, že je spárovaný pod jejím účtem — tyhle cesty
    // stejně pracují jen s agencyId a profileId.
    req.user = {
      userId: binding.userId,
      agencyId: binding.agencyId,
      role: { name: 'Relay Device', isManager: false, isAppOwner: false },
    };
    req.relayBinding = binding;
    return next();
  } catch {
    return res.status(500).json({ message: 'Device auth failed' });
  }
};
