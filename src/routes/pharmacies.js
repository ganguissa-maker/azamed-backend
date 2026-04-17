// src/routes/pharmacies.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly, ownStructure } = require('../middleware/auth');

const prisma = new PrismaClient();

// ─── GET /api/pharmacies/catalogue/medicaments ────────────────
// Catalogue COMPLET AZAMED — pas de filtre sur les structures
router.get('/catalogue/medicaments', async (req, res) => {
  try {
    const { search, classe, page = 1, limit = 500 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { isActive: true };
    if (search) {
      where.OR = [
        { nomCommercial: { contains: search, mode: 'insensitive' } },
        { dci: { contains: search, mode: 'insensitive' } },
        { classeTherapeutique: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (classe) {
      where.classeTherapeutique = { contains: classe, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.medicament.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [
          { classeTherapeutique: 'asc' },
          { nomCommercial: 'asc' },
        ],
      }),
      prisma.medicament.count({ where }),
    ]);

    res.json({
      data,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    console.error('Erreur catalogue médicaments:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ─── GET /api/pharmacies/search?medicament=Paracétamol ────────
router.get('/search', async (req, res) => {
  try {
    const { medicament, dci, classe, ville, disponible, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const medicamentWhere = {};
    if (medicament) {
      medicamentWhere.OR = [
        { nomCommercial: { contains: medicament, mode: 'insensitive' } },
        { dci: { contains: medicament, mode: 'insensitive' } },
      ];
    }
    if (dci) medicamentWhere.dci = { contains: dci, mode: 'insensitive' };
    if (classe) medicamentWhere.classeTherapeutique = { contains: classe, mode: 'insensitive' };

    const pharmacieWhere = { typeStructure: 'PHARMACIE', isActive: true };
    if (ville) pharmacieWhere.ville = { contains: ville, mode: 'insensitive' };

    const where = {
      medicament: medicamentWhere,
      pharmacie: pharmacieWhere,
    };
    if (disponible === 'true') {
      where.disponible = true;
      where.enStock = true;
    }

    const [results, total] = await Promise.all([
      prisma.pharmacieMedicament.findMany({
        where,
        include: {
          medicament: true,
          pharmacie: {
            include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: { prix: 'asc' },
      }),
      prisma.pharmacieMedicament.count({ where }),
    ]);

    const enriched = results.map((r) => ({
      ...r,
      pharmacie: {
        ...r.pharmacie,
        niveauAbonnement: r.pharmacie.abonnements[0]?.niveau || 'BASIC',
      },
    }));

    res.json({ data: enriched, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur recherche médicament.' });
  }
});

// ─── GET /api/pharmacies/:id/medicaments ─────────────────────
router.get('/:id/medicaments', async (req, res) => {
  try {
    const { search, disponible, page = 1, limit = 500 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { pharmacieId: req.params.id };
    if (disponible === 'true') where.disponible = true;

    const medWhere = {};
    if (search) {
      medWhere.OR = [
        { nomCommercial: { contains: search, mode: 'insensitive' } },
        { dci: { contains: search, mode: 'insensitive' } },
        { classeTherapeutique: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.pharmacieMedicament.findMany({
        where: { ...where, medicament: medWhere },
        include: { medicament: true },
        skip,
        take: parseInt(limit),
        orderBy: { medicament: { nomCommercial: 'asc' } },
      }),
      prisma.pharmacieMedicament.count({ where: { ...where, medicament: medWhere } }),
    ]);

    res.json({ data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// ─── PUT /api/pharmacies/:id/medicaments/:medicamentId ────────
router.put('/:id/medicaments/:medicamentId', protect, structureOnly, async (req, res) => {
  try {
    const { disponible, enStock, prix, deGarde } = req.body;

    const result = await prisma.pharmacieMedicament.upsert({
      where: {
        pharmacieId_medicamentId: {
          pharmacieId: req.params.id,
          medicamentId: req.params.medicamentId,
        },
      },
      update: {
        disponible: disponible ?? false,
        enStock: enStock ?? false,
        prix: prix ?? null,
        deGarde: deGarde ?? false,
      },
      create: {
        pharmacieId: req.params.id,
        medicamentId: req.params.medicamentId,
        disponible: disponible ?? false,
        enStock: enStock ?? false,
        prix: prix ?? null,
        deGarde: deGarde ?? false,
      },
      include: { medicament: true },
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur mise à jour.' });
  }
});

// ─── PUT /api/pharmacies/:id/medicaments (batch) ─────────────
router.put('/:id/medicaments', protect, structureOnly, async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Tableau requis.' });

    const results = await Promise.all(
      updates.map((u) =>
        prisma.pharmacieMedicament.upsert({
          where: {
            pharmacieId_medicamentId: {
              pharmacieId: req.params.id,
              medicamentId: u.medicamentId,
            },
          },
          update: { disponible: u.disponible ?? false, enStock: u.enStock ?? false, prix: u.prix ?? null, deGarde: u.deGarde ?? false },
          create: { pharmacieId: req.params.id, medicamentId: u.medicamentId, disponible: u.disponible ?? false, enStock: u.enStock ?? false, prix: u.prix ?? null, deGarde: u.deGarde ?? false },
        })
      )
    );

    res.json({ message: `${results.length} médicaments mis à jour.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur.' });
  }
});

module.exports = router;
