// src/routes/pharmacies.js
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

// ─── GET /api/pharmacies/catalogue/medicaments ────────────────
router.get('/catalogue/medicaments', async (req, res) => {
  try {
    const { search, categorie, page = 1, limit = 30 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = { isActive: true };
    if (categorie) where.classeTherapeutique = { contains: categorie, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { nomCommercial: { contains: search, mode: 'insensitive' } },
        { dci:           { contains: search, mode: 'insensitive' } },
        { classeTherapeutique: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.medicament.findMany({ where, skip, take: parseInt(limit), orderBy: { nomCommercial: 'asc' } }),
      prisma.medicament.count({ where }),
    ]);
    res.json({ data, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pharmacies/search ───────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { medicament, disponible, limit = 5 } = req.query;
    if (!medicament) return res.json({ data: [] });
    const where = {
      medicament: {
        OR: [
          { nomCommercial: { contains: medicament, mode: 'insensitive' } },
          { dci:           { contains: medicament, mode: 'insensitive' } },
        ],
      },
      pharmacie: { isActive: true, isVerified: true },
    };
    if (disponible === 'true') where.enStock = true;
    const data = await prisma.pharmacieMedicament.findMany({
      where, take: parseInt(limit),
      include: {
        medicament: true,
        pharmacie:  { select: { id: true, nomCommercial: true, ville: true, telephone: true } },
      },
      orderBy: { prix: 'asc' },
    });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pharmacies/garde ────────────────────────────────
// Pharmacies de garde actuellement
router.get('/garde', async (req, res) => {
  try {
    const { ville } = req.query;
    const where = {
      estDeGarde: true,
      isActive:   true,
      isVerified: true,
    };
    if (ville) where.ville = { contains: ville, mode: 'insensitive' };
    const data = await prisma.structure.findMany({
      where,
      orderBy: { nomCommercial: 'asc' },
      include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    res.json({ data, total: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pharmacies/:id/medicaments ─────────────────────
router.get('/:id/medicaments', async (req, res) => {
  try {
    const { search, disponible, limit = 200 } = req.query;
    const where = { pharmacieId: req.params.id };
    if (disponible === 'true') where.enStock = true;
    if (search) {
      where.medicament = {
        OR: [
          { nomCommercial: { contains: search, mode: 'insensitive' } },
          { dci:           { contains: search, mode: 'insensitive' } },
        ],
      };
    }
    const data = await prisma.pharmacieMedicament.findMany({
      where, take: parseInt(limit),
      include: { medicament: true },
      orderBy: { medicament: { nomCommercial: 'asc' } },
    });
    // Grouper par classe thérapeutique
    const grouped = data.reduce((acc, m) => {
      const key = m.medicament.classeTherapeutique || 'Autres';
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
      return acc;
    }, {});
    res.json({ data, grouped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/pharmacies/:id/medicaments ─────────────────────
router.post('/:id/medicaments', protect, structureOnly, async (req, res) => {
  try {
    const { medicamentId, prix, enStock } = req.body;
    const existing = await prisma.pharmacieMedicament.findFirst({
      where: { pharmacieId: req.params.id, medicamentId },
    });
    let result;
    if (existing) {
      result = await prisma.pharmacieMedicament.update({
        where: { id: existing.id },
        data: { prix: prix ? parseFloat(prix) : null, enStock: enStock !== false },
        include: { medicament: true },
      });
    } else {
      result = await prisma.pharmacieMedicament.create({
        data: {
          pharmacieId: req.params.id,
          medicamentId,
          prix:    prix ? parseFloat(prix) : null,
          enStock: enStock !== false,
        },
        include: { medicament: true },
      });
    }
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/pharmacies/:id/medicaments/:medId ────────────
router.delete('/:id/medicaments/:medId', protect, structureOnly, async (req, res) => {
  try {
    await prisma.pharmacieMedicament.deleteMany({
      where: { pharmacieId: req.params.id, medicamentId: req.params.medId },
    });
    res.json({ message: 'Médicament retiré de la pharmacie.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/pharmacies/:id/garde ────────────────────────────
// Activer/désactiver le mode garde de la pharmacie
router.put('/:id/garde', protect, structureOnly, async (req, res) => {
  try {
    const { estDeGarde } = req.body;
    const structure = await prisma.structure.update({
      where: { id: req.params.id },
      data:  { estDeGarde: Boolean(estDeGarde) },
    });
    res.json({
      message: estDeGarde ? 'Pharmacie en mode garde activé.' : 'Mode garde désactivé.',
      structure,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
