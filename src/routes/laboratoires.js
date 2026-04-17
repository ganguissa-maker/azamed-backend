// src/routes/laboratoires.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');

const prisma = new PrismaClient();

// ─── GET /api/laboratoires/catalogue/examens ─────────────────
// Catalogue COMPLET — tous les examens AZAMED
router.get('/catalogue/examens', async (req, res) => {
  try {
    const { categorie, search } = req.query;

    const where = { isActive: true };
    if (categorie) where.categorie = categorie;
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { codeAzamed: { contains: search, mode: 'insensitive' } },
        { categorie: { contains: search, mode: 'insensitive' } },
      ];
    }

    const examens = await prisma.examen.findMany({
      where,
      orderBy: [{ categorie: 'asc' }, { nom: 'asc' }],
    });

    // Grouper par catégorie
    const grouped = examens.reduce((acc, e) => {
      if (!acc[e.categorie]) acc[e.categorie] = [];
      acc[e.categorie].push(e);
      return acc;
    }, {});

    res.json({
      data: examens,
      grouped,
      categories: Object.keys(grouped),
      total: examens.length,
    });
  } catch (err) {
    console.error('Erreur catalogue examens:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ─── GET /api/laboratoires/search?examen=NFS ─────────────────
router.get('/search', async (req, res) => {
  try {
    const { examen, categorie, ville, prixMax, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const examenWhere = { isActive: true };
    if (examen) {
      examenWhere.OR = [
        { nom: { contains: examen, mode: 'insensitive' } },
        { codeAzamed: { contains: examen, mode: 'insensitive' } },
        { categorie: { contains: examen, mode: 'insensitive' } },
      ];
    }
    if (categorie) examenWhere.categorie = { contains: categorie, mode: 'insensitive' };

    const laboWhere = { typeStructure: 'LABORATOIRE', isActive: true };
    if (ville) laboWhere.ville = { contains: ville, mode: 'insensitive' };

    const where = { disponible: true, examen: examenWhere, labo: laboWhere };
    if (prixMax) where.prix = { lte: parseFloat(prixMax) };

    const [results, total] = await Promise.all([
      prisma.laboExamen.findMany({
        where,
        include: {
          examen: true,
          labo: { include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } } },
        },
        skip,
        take: parseInt(limit),
        orderBy: [{ prix: 'asc' }, { delaiMin: 'asc' }],
      }),
      prisma.laboExamen.count({ where }),
    ]);

    const enriched = results.map((r) => ({
      ...r,
      labo: { ...r.labo, niveauAbonnement: r.labo.abonnements[0]?.niveau || 'BASIC' },
    }));

    res.json({ data: enriched, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur recherche examens.' });
  }
});

// ─── GET /api/laboratoires/:id/examens ───────────────────────
router.get('/:id/examens', async (req, res) => {
  try {
    const { disponible } = req.query;

    const where = { laboId: req.params.id };
    if (disponible === 'true') where.disponible = true;

    const data = await prisma.laboExamen.findMany({
      where,
      include: { examen: true },
      orderBy: { examen: { categorie: 'asc' } },
    });

    const grouped = data.reduce((acc, e) => {
      const cat = e.examen.categorie;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(e);
      return acc;
    }, {});

    res.json({ data, grouped, total: data.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// ─── PUT /api/laboratoires/:id/examens (batch) ───────────────
router.put('/:id/examens', protect, structureOnly, async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Tableau requis.' });

    const results = await Promise.all(
      updates.map((u) =>
        prisma.laboExamen.upsert({
          where: { laboId_examenId: { laboId: req.params.id, examenId: u.examenId } },
          update: { disponible: u.disponible ?? false, prix: u.prix ?? null, delaiMin: u.delaiMin ?? null, delaiMax: u.delaiMax ?? null },
          create: { laboId: req.params.id, examenId: u.examenId, disponible: u.disponible ?? false, prix: u.prix ?? null, delaiMin: u.delaiMin ?? null, delaiMax: u.delaiMax ?? null },
        })
      )
    );

    res.json({ message: `${results.length} examens mis à jour.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur.' });
  }
});

module.exports = router;