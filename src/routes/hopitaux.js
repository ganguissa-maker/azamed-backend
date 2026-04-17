// src/routes/hopitaux.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');

const prisma = new PrismaClient();

// ─── GET /api/hopitaux/catalogue/services ────────────────────
// Catalogue COMPLET — tous les services médicaux AZAMED
router.get('/catalogue/services', async (req, res) => {
  try {
    const { categorie, search } = req.query;

    const where = { isActive: true };
    if (categorie) where.categorie = categorie;
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { categorie: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const services = await prisma.serviceMedical.findMany({
      where,
      orderBy: [{ categorie: 'asc' }, { nom: 'asc' }],
    });

    const grouped = services.reduce((acc, s) => {
      if (!acc[s.categorie]) acc[s.categorie] = [];
      acc[s.categorie].push(s);
      return acc;
    }, {});

    res.json({
      data: services,
      grouped,
      categories: Object.keys(grouped),
      total: services.length,
    });
  } catch (err) {
    console.error('Erreur catalogue services:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ─── GET /api/hopitaux/search?service=Cardiologie ─────────────
router.get('/search', async (req, res) => {
  try {
    const { service, categorie, ville, urgences, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const svcWhere = {};
    if (service) svcWhere.nom = { contains: service, mode: 'insensitive' };
    if (categorie) svcWhere.categorie = categorie;
    if (urgences === 'true') svcWhere.nom = { contains: 'Urgences', mode: 'insensitive' };

    const hopWhere = { isActive: true };
    if (ville) hopWhere.ville = { contains: ville, mode: 'insensitive' };

    const where = { disponible: true, service: svcWhere, hopital: hopWhere };

    const [results, total] = await Promise.all([
      prisma.hopitalService.findMany({
        where,
        include: {
          service: true,
          hopital: { include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } } },
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.hopitalService.count({ where }),
    ]);

    const enriched = results.map((r) => ({
      ...r,
      hopital: { ...r.hopital, niveauAbonnement: r.hopital.abonnements[0]?.niveau || 'BASIC' },
    }));

    res.json({ data: enriched, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur recherche hôpitaux.' });
  }
});

// ─── GET /api/hopitaux/:id/services ──────────────────────────
router.get('/:id/services', async (req, res) => {
  try {
    const { disponible } = req.query;

    const where = { hopitalId: req.params.id };
    if (disponible === 'true') where.disponible = true;

    const data = await prisma.hopitalService.findMany({
      where,
      include: { service: true },
      orderBy: { service: { categorie: 'asc' } },
    });

    const grouped = data.reduce((acc, s) => {
      const cat = s.service.categorie;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    }, {});

    res.json({ data, grouped, total: data.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// ─── PUT /api/hopitaux/:id/services (batch) ──────────────────
router.put('/:id/services', protect, structureOnly, async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Tableau requis.' });

    const results = await Promise.all(
      updates.map((u) =>
        prisma.hopitalService.upsert({
          where: { hopitalId_serviceId: { hopitalId: req.params.id, serviceId: u.serviceId } },
          update: { disponible: u.disponible ?? false, surRdv: u.surRdv ?? false, prixConsultation: u.prixConsultation ?? null, prixChambre: u.prixChambre ?? null },
          create: { hopitalId: req.params.id, serviceId: u.serviceId, disponible: u.disponible ?? false, surRdv: u.surRdv ?? false, prixConsultation: u.prixConsultation ?? null, prixChambre: u.prixChambre ?? null },
        })
      )
    );

    res.json({ message: `${results.length} services mis à jour.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur.' });
  }
});

module.exports = router;
