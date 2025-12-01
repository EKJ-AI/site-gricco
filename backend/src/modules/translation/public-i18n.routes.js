// src/modules/translation/public-i18n.routes.js
import { Router } from 'express';
import {
  getDictionary,
  exportDictionary,
  exportAllDictionaries,
  listPublicCultures
} from './translation.controller.js';

const router = Router();

// Mantém URLs usadas no frontend:
//   GET /api/public/i18n/:cultureId
//   GET /api/public/i18n/export/:cultureId
//   GET /api/public/i18n/export-all
router.get('/i18n/cultures', listPublicCultures); // 👈 NOVA ROTA PÚBLICA
router.get('/i18n/:cultureId', getDictionary);
router.get('/i18n/export/:cultureId', exportDictionary);
router.get('/i18n/export-all', exportAllDictionaries);

export default router;
