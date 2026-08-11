const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createProfile, patchProfile, assignUsers } = require('../middleware/schemas');
const { isManagerRole } = require('../utils/authz');

const requireProfileManager = (req, res, next) => {
  if (!isManagerRole(req.user?.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

// Identifikátor profilu se dostane do cesty na disku DŘÍV, než controller
// ověří, že takový profil vůbec existuje — multer běží před ním. A Express
// dekóduje %2F, takže `..%2F..%2Fevil` skončí v req.params.id jako
// `../../evil` a path.join z toho udělá cestu MIMO adresář pro nahrávání.
// Ověřeno testem, ne odvozeno.
//
// Přihlášená manažerka tak mohla nechat vytvořit adresář a zapsat obrázek
// kamkoli, kam má proces právo psát. Přepsat cizí soubor nešlo (jméno se
// generuje náhodně a přípona je z whitelistu), ale i tak to sem nepatří.
const ID_PROFILU = /^[A-Za-z0-9_-]+$/;

const overIdProfilu = (req, res, next) => {
  if (!ID_PROFILU.test(String(req.params.id || ''))) {
    return res.status(400).json({ message: 'Invalid profile id' });
  }
  next();
};

const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Pojistka i po kontrole výše: basename usekne cokoli s lomítkem, takže
    // se z tohohle místa nedá vyjít z adresáře ani kdyby stráž někdo obešel.
    const dir = path.join(
      __dirname, '..', '..', 'uploads', 'profile-gallery',
      path.basename(String(req.params.id || ''))
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`);
  }
});

const galleryUpload = multer({
  storage: galleryStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype || '')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  }
});

const handleGalleryUpload = (req, res, next) => {
  galleryUpload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
};

// Správa profilů (vytváření, editace, přiřazování uživatelů, credentials) je dle
// ROLES.md výhradně manažerská operace — Operator/Model spravují jen chaty a
// kalendář u přiřazených profilů, ne samotné profily. Bez těchto gate mohl každý
// přihlášený uživatel agentury měnit libovolný profil (name, commission, …).
router.get('/', authMiddleware, profileController.getProfiles);
router.post('/', authMiddleware, requireProfileManager, validate(createProfile), profileController.createProfile);
router.patch('/:id', authMiddleware, requireProfileManager, validate(patchProfile), profileController.patchProfile);
router.get('/:id/gallery', authMiddleware, profileController.getGallery);
router.get('/:id/gallery/:photoId/file', authMiddleware, profileController.getGalleryPhoto);
router.post('/:id/gallery', authMiddleware, requireProfileManager, overIdProfilu, handleGalleryUpload, profileController.uploadGalleryPhoto);
router.delete('/:id/gallery/:photoId', authMiddleware, requireProfileManager, profileController.deleteGalleryPhoto);
router.patch('/:id/assignees', authMiddleware, requireProfileManager, validate(assignUsers), profileController.assignUsersToProfile);
router.post('/:id/sync', authMiddleware, profileController.syncProfile);
router.get('/:id/credentials', authMiddleware, requireProfileManager, profileController.getCredentials);
router.post('/:id/credentials', authMiddleware, requireProfileManager, profileController.updateCredentials);
router.post('/:id/boost', authMiddleware, profileController.boostProfile);

module.exports = router;
