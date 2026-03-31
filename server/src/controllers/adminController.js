const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../services/logger');

// Výchozí konfigurace funkcí (pokud nejsou v DB ještě uloženy)
const defaultFeatures = [
  { id: 'ai_trans', label: 'AI Voice Relay (Beta)', desc: 'Enable neural speech-to-speech routing', active: true },
  { id: 'vc_hub', label: 'Cross-Agency Analytics', desc: 'Enable view of aggregated data', active: true },
  { id: 'crm_adv', label: 'Proxy Pooling', desc: 'Allow sharing device nodes', active: true },
  { id: 'stats_bi', label: 'Payout Processing', desc: 'Automate weekly commission transfers', active: false }
];

exports.getGlobalFeatures = async (req, res) => {
  try {
    const userRole = req.user?.role;
    // Povolíme přístup App Ownerovi a Managerům
    if (!userRole || (!userRole.isAppOwner && !userRole.isManager)) {
      return res.status(403).json({ error: 'Access denied: Requires App Owner or Manager role.' });
    }

    // Načteme všechny nastavení z DB
    const settings = await prisma.globalSetting.findMany({
      where: {
        key: {
          startsWith: 'feature_'
        }
      }
    });

    const settingsMap = settings.reduce((acc, current) => {
      acc[current.key] = current.value === 'true';
      return acc;
    }, {});

    // Spojíme výchozí stav se stavem z databáze
    const features = defaultFeatures.map(feature => ({
      ...feature,
      active: settingsMap[`feature_${feature.id}`] !== undefined ? settingsMap[`feature_${feature.id}`] : feature.active
    }));

    res.json(features);
  } catch (err) {
    logger.error('Error fetching global features:', err.message);
    res.status(500).json({ error: 'Failed to fetch global features' });
  }
};

exports.updateGlobalFeature = async (req, res) => {
  try {
    const userRole = req.user?.role;
    // Měnit stav může POUZE App Owner (zabezpečení)
    if (!userRole || !userRole.isAppOwner) {
      return res.status(403).json({ error: 'Access denied: Requires App Owner role to modify global features.' });
    }

    const { id } = req.params;
    const { active } = req.body;

    if (active === undefined) {
      return res.status(400).json({ error: 'Missing active status in body' });
    }

    const key = `feature_${id}`;
    const stringValue = active ? 'true' : 'false';

    // Upsert uloží nebo zaktualizuje záznam
    const updatedSetting = await prisma.globalSetting.upsert({
      where: { key: key },
      update: { value: stringValue },
      create: { key: key, value: stringValue }
    });

    res.json({ id, active: updatedSetting.value === 'true' });
  } catch (err) {
    logger.error(`Error updating global feature ${req.params.id}:`, err.message);
    res.status(500).json({ error: 'Failed to update global feature' });
  }
};
