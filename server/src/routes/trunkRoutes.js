const express = require('express');
const router  = express.Router();
const trunk   = require('../controllers/trunkController');
const auth    = require('../middleware/authMiddleware');

// Vše manager+, agency-scoped (viz controller).
router.get('/',                       auth, trunk.listTrunks);
router.post('/',                      auth, express.json(), trunk.createTrunk);
router.patch('/:id',                  auth, express.json(), trunk.updateTrunk);
router.delete('/:id',                 auth, trunk.deleteTrunk);

// DIDy na trunku
router.post('/:id/dids',              auth, express.json(), trunk.addDid);
router.delete('/:trunkId/dids/:didId', auth, trunk.deleteDid);

module.exports = router;
