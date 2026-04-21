// src/routes/hopitaux.js
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

// ─── GET /api/hopitaux/catalogue/services ─────────────────────
router.get('/catalogue/services', async (req, res) => {
  try {
    const { search, categorie, page = 1, limit = 30 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = { isActive: true };
    if (categorie) where.categorie = { contains: categorie, mode: 'insensitive' };
    if (search)    where.nom = { contains: search, mode: 'insensitive' };
    const [data, total] = await Promise.all([
      prisma.serviceMedical.findMany({ where, skip, take: parseInt(limit), orderBy: { nom: 'asc' } }),
      prisma.serviceMedical.count({ where }),
    ]);
    res.json({ data, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/hopitaux/:id/services ───────────────────────────
router.get('/:id/services', async (req, res) => {
  try {
    const { disponible } = req.query;
    const where = { hopitalId: req.params.id };
    if (disponible === 'true') where.estDisponible = true;
    const data = await prisma.hopitalService.findMany({
      where,
      include: { service: true },
      orderBy: { service: { nom: 'asc' } },
    });
    // Grouper par catégorie
    const grouped = data.reduce((acc, s) => {
      const key = s.service.categorie || 'Autres';
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});
    res.json({ data, grouped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/hopitaux/:id/services ──────────────────────────
// modeConsultation: 'SUR_RDV' | 'JOURS_OUVRABLES' | 'TOUS_LES_JOURS'
router.post('/:id/services', protect, structureOnly, async (req, res) => {
  try {
    const { serviceId, prixConsultation, modeConsultation, estDisponible } = req.body;
    if (!serviceId) return res.status(400).json({ error: 'serviceId requis.' });

    const existing = await prisma.hopitalService.findFirst({
      where: { hopitalId: req.params.id, serviceId },
    });

    let result;
    if (existing) {
      result = await prisma.hopitalService.update({
        where: { id: existing.id },
        data: {
          prixConsultation: prixConsultation ? parseFloat(prixConsultation) : null,
          modeConsultation: modeConsultation || 'JOURS_OUVRABLES',
          estDisponible:    estDisponible !== false,
        },
        include: { service: true },
      });
    } else {
      result = await prisma.hopitalService.create({
        data: {
          hopitalId:        req.params.id,
          serviceId,
          prixConsultation: prixConsultation ? parseFloat(prixConsultation) : null,
          modeConsultation: modeConsultation || 'JOURS_OUVRABLES',
          estDisponible:    estDisponible !== false,
        },
        include: { service: true },
      });
    }
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/hopitaux/:id/services/:svcId ─────────────────
router.delete('/:id/services/:svcId', protect, structureOnly, async (req, res) => {
  try {
    await prisma.hopitalService.deleteMany({
      where: { hopitalId: req.params.id, serviceId: req.params.svcId },
    });
    res.json({ message: 'Service retiré.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/hopitaux/:id/garde-medecin ──────────────────────
// Médecin de garde
router.put('/:id/garde-medecin', protect, structureOnly, async (req, res) => {
  try {
    const { medecinDeGarde } = req.body;
    const structure = await prisma.structure.update({
      where: { id: req.params.id },
      data:  { medecinDeGarde: Boolean(medecinDeGarde) },
    });
    res.json({ message: medecinDeGarde ? 'Médecin de garde activé.' : 'Médecin de garde désactivé.', structure });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
