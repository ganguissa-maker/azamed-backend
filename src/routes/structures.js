// src/routes/structures.js — Seules les structures vérifiées sont visibles publiquement
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly, adminOnly } = require('../middleware/auth');

const prisma = new PrismaClient();

// ─── GET /api/structures — liste publique (vérifiées seulement) ──
router.get('/', async (req, res) => {
  try {
    const {
      type, ville, search, page = 1, limit = 15,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isActive:   true,
      isVerified: true, // ← SEULES LES STRUCTURES VÉRIFIÉES SONT VISIBLES
    };

    if (type)   where.typeStructure = type;
    if (ville)  where.ville = { contains: ville, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { nomCommercial: { contains: search, mode: 'insensitive' } },
        { ville:         { contains: search, mode: 'insensitive' } },
        { quartier:      { contains: search, mode: 'insensitive' } },
        { description:   { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.structure.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          abonnements: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.structure.count({ where }),
    ]);

    res.json({
      data,
      pagination: {
        total,
        page:  parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/structures/:id — fiche détail (vérifiée seulement) ──
router.get('/:id', async (req, res) => {
  try {
    const structure = await prisma.structure.findFirst({
      where: {
        id:         req.params.id,
        isActive:   true,
        isVerified: true, // ← vérifiée obligatoirement
      },
      include: {
        abonnements: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!structure) {
      return res.status(404).json({ error: 'Structure introuvable ou non vérifiée.' });
    }

    // Tracker la vue
    await prisma.analyticsEvent.create({
      data: { type: 'VUE_STRUCTURE', structureId: structure.id },
    }).catch(() => {});

    res.json(structure);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/structures/me — fiche de MA structure (authentifié) ──
router.get('/me/profil', protect, structureOnly, async (req, res) => {
  try {
    const structure = await prisma.structure.findUnique({
      where: { userId: req.user.id },
      include: {
        abonnements: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!structure) return res.status(404).json({ error: 'Structure introuvable.' });
    res.json(structure);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/structures/:id — modifier ma structure ──────────
router.put('/:id', protect, structureOnly, async (req, res) => {
  try {
    const {
      nomCommercial, nomLegal, telephone, whatsapp, adresse,
      pays, ville, quartier, description, horaires, latitude, longitude,
    } = req.body;

    // Vérifier que c'est bien SA structure
    if (req.user.structure?.id !== req.params.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès non autorisé.' });
    }

    const structure = await prisma.structure.update({
      where: { id: req.params.id },
      data: {
        nomCommercial, nomLegal, telephone, whatsapp, adresse,
        pays, ville, quartier, description, horaires,
        latitude:  latitude  ? parseFloat(latitude)  : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      },
    });

    res.json(structure);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;