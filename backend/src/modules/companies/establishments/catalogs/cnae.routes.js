import { Router } from 'express';
import prisma from '../../../../../prisma/client.js';
import { authenticateToken } from '../../../auth/auth.middleware.js';
import { authorizePermissions } from '../../../permission/permissions.middleware.js';

const router = Router();

// GET /api/catalogs/cnaes?q=0111
router.get('/cnaes', authenticateToken, authorizePermissions(['company.read', 'establishment.read']), async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const where = q ? {
      OR: [
        { code: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } }
      ]
    } : {};
    const items = await prisma.cNAE.findMany({
      where,
      take: 20,
      orderBy: [{ code: 'asc' }]
    });
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

export default router;
