// src/routes/structures.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly, ownStructure } = require('../middleware/auth');

const prisma = new PrismaClient();

// ─── GET /api/structures — Liste publique avec filtres ────────
router.get('/', async (req, res) => {
  try {
    const {
      type, pays, ville, quartier, search,
      page = 1, limit = 20, lat, lng, radius,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { isActive: true };
    if (type) where.typeStructure = type;
    if (pays) where.pays = { contains: pays, mode: 'insensitive' };
    if (ville) where.ville = { contains: ville, mode: 'insensitive' };
    if (quartier) where.quartier = { contains: quartier, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { nomCommercial: { contains: search, mode: 'insensitive' } },
        { nomLegal: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [structures, total] = await Promise.all([
      prisma.structure.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          abonnements: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { posts: true } },
        },
        orderBy: [
          // Premium d'abord (tri côté app selon abonnement)
          { createdAt: 'desc' },
        ],
      }),
      prisma.structure.count({ where }),
    ]);

    // Enrichir avec le niveau d'abonnement actif
    const enriched = structures.map((s) => ({
      ...s,
      niveauAbonnement: s.abonnements[0]?.niveau || 'BASIC',
    }));

    // Trier : PREMIUM2 > PREMIUM1 > BASIC
    const order = { PREMIUM2: 0, PREMIUM1: 1, BASIC: 2 };
    enriched.sort((a, b) => order[a.niveauAbonnement] - order[b.niveauAbonnement]);

    res.json({
      data: enriched,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des structures.' });
  }
});

// ─── GET /api/structures/:id — Détail public ─────────────────
router.get('/:id', async (req, res) => {
  try {
    const structure = await prisma.structure.findUnique({
      where: { id: req.params.id, isActive: true },
      include: {
        abonnements: { orderBy: { createdAt: 'desc' }, take: 1 },
        posts: {
          where: { isApproved: true, isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            pharmacieMedicaments: { where: { disponible: true } },
            laboExamens: { where: { disponible: true } },
            hopitalServices: { where: { disponible: true } },
          },
        },
      },
    });

    if (!structure) {
      return res.status(404).json({ error: 'Structure non trouvée.' });
    }

    // Enregistrer l'événement analytics
    await prisma.analyticsEvent.create({
      data: {
        structureId: structure.id,
        eventType: 'vue_profil',
        userIp: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    res.json({
      ...structure,
      niveauAbonnement: structure.abonnements[0]?.niveau || 'BASIC',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// ─── PUT /api/structures/:id — Mise à jour ────────────────────
router.put('/:id', protect, structureOnly, ownStructure, async (req, res) => {
  try {
    const {
      nomCommercial, nomLegal, telephone, whatsapp, email,
      adresse, ville, quartier, latitude, longitude,
      horaires, joursFeries, description, statutJuridique,
      logoUrl, photoUrl,
    } = req.body;

    const updated = await prisma.structure.update({
      where: { id: req.params.id },
      data: {
        nomCommercial, nomLegal, telephone, whatsapp, email,
        adresse, ville, quartier, latitude, longitude,
        horaires, joursFeries, description, statutJuridique,
        logoUrl, photoUrl,
      },
    });

    res.json({ message: 'Profil mis à jour.', structure: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur mise à jour.' });
  }
});

// ─── GET /api/structures/:id/stats — Stats (Premium) ─────────
router.get('/:id/stats', protect, ownStructure, async (req, res) => {
  try {
    const structure = await prisma.structure.findUnique({
      where: { id: req.params.id },
      include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    const niveau = structure?.abonnements[0]?.niveau || 'BASIC';

    // Stats de base (tous)
    const vues7j = await prisma.analyticsEvent.count({
      where: {
        structureId: req.params.id,
        eventType: 'vue_profil',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    const stats = { vues7j, niveau };

    // Stats avancées (Premium seulement)
    if (niveau === 'PREMIUM1' || niveau === 'PREMIUM2') {
      const [clicsWhatsapp, clicsAppel, vues30j] = await Promise.all([
        prisma.analyticsEvent.count({
          where: { structureId: req.params.id, eventType: 'clic_whatsapp' },
        }),
        prisma.analyticsEvent.count({
          where: { structureId: req.params.id, eventType: 'clic_appel' },
        }),
        prisma.analyticsEvent.count({
          where: {
            structureId: req.params.id,
            eventType: 'vue_profil',
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);
      stats.clicsWhatsapp = clicsWhatsapp;
      stats.clicsAppel = clicsAppel;
      stats.vues30j = vues30j;
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Erreur stats.' });
  }
});

module.exports = router;
