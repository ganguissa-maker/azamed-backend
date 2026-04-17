// src/routes/admin.js — Routes admin complètes
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, adminOnly } = require('../middleware/auth');

const prisma = new PrismaClient();

// Toutes les routes admin nécessitent d'être connecté en tant qu'ADMIN
router.use(protect, adminOnly);

// ─── GET /api/admin/dashboard ─────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalStructures,
      totalPosts,
      totalMedicaments,
      totalExamens,
      parType,
      nonVerifies,
      inscriptionsAujourdhui,
      inscriptionsRecentes,
      vuesToday,
    ] = await Promise.all([
      prisma.structure.count({ where: { isActive: true } }),
      prisma.post.count({ where: { isActive: true } }),
      prisma.medicament.count({ where: { isActive: true } }),
      prisma.examen.count({ where: { isActive: true } }),
      prisma.structure.groupBy({ by: ['typeStructure'], _count: true, orderBy: { _count: { typeStructure: 'desc' } } }),
      prisma.structure.count({ where: { isVerified: false, isActive: true } }),
      prisma.structure.count({ where: { createdAt: { gte: today } } }),
      prisma.structure.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { user: { select: { email: true } } },
      }),
      // Vues d'aujourd'hui
      prisma.analyticsEvent.count({
        where: { type: 'VUE_STRUCTURE', createdAt: { gte: today } },
      }).catch(() => null),
    ]);

    res.json({
      totalStructures,
      totalPosts,
      totalMedicaments,
      totalExamens,
      parType,
      nonVerifies,
      inscriptionsAujourdhui,
      inscriptionsRecentes,
      vuesToday,
    });
  } catch (err) {
    console.error('Dashboard admin:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/structures ────────────────────────────────
router.get('/structures', async (req, res) => {
  try {
    const { search, type, status, page = 1, limit = 15 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (type)   where.typeStructure = type;
    if (status === 'actif')    where.isActive = true;
    if (status === 'suspendu') where.isActive = false;
    if (search) {
      where.OR = [
        { nomCommercial: { contains: search, mode: 'insensitive' } },
        { ville:         { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.structure.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, role: true } },
          abonnements: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.structure.count({ where }),
    ]);

    res.json({
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/structures/:id/verifier ───────────────────
router.put('/structures/:id/verifier', async (req, res) => {
  try {
    const structure = await prisma.structure.update({
      where: { id: req.params.id },
      data: { isVerified: true },
    });
    res.json({ message: `${structure.nomCommercial} est maintenant vérifiée.`, structure });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/structures/:id/suspendre ─────────────────
router.put('/structures/:id/suspendre', async (req, res) => {
  try {
    const current = await prisma.structure.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Structure introuvable.' });
    const structure = await prisma.structure.update({
      where: { id: req.params.id },
      data: { isActive: !current.isActive },
    });
    const action = structure.isActive ? 'réactivée' : 'suspendue';
    res.json({ message: `${structure.nomCommercial} a été ${action}.`, structure });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/structures/:id ────────────────────────
router.delete('/structures/:id', async (req, res) => {
  try {
    const structure = await prisma.structure.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (!structure) return res.status(404).json({ error: 'Structure introuvable.' });

    // Supprimer en cascade dans l'ordre correct
    await prisma.$transaction([
      prisma.pharmacieMedicament.deleteMany({ where: { pharmacieId: req.params.id } }),
      prisma.laboExamen.deleteMany({ where: { laboId: req.params.id } }),
      prisma.hopitalService.deleteMany({ where: { hopitalId: req.params.id } }),
      prisma.post.deleteMany({ where: { structureId: req.params.id } }),
      prisma.abonnement.deleteMany({ where: { structureId: req.params.id } }),
      prisma.analyticsEvent.deleteMany({ where: { structureId: req.params.id } }),
      prisma.structure.delete({ where: { id: req.params.id } }),
      prisma.user.delete({ where: { id: structure.userId } }),
    ]);

    res.json({ message: `${structure.nomCommercial} et son compte ont été supprimés définitivement.` });
  } catch (err) {
    console.error('DELETE structure:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/posts ─────────────────────────────────────
router.get('/posts', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { isActive: true };
    if (status === 'pending')  { where.isApproved = false; where.isRejected = false; }
    if (status === 'approved') { where.isApproved = true; }
    if (status === 'rejected') { where.isRejected = true; }

    const [data, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          structure: { select: { nomCommercial: true, typeStructure: true, ville: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({ data, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/posts/:id/moderer ────────────────────────
router.put('/posts/:id/moderer', async (req, res) => {
  try {
    const { action } = req.body;
    const data = action === 'approuver'
      ? { isApproved: true, isRejected: false }
      : { isApproved: false, isRejected: true };
    await prisma.post.update({ where: { id: req.params.id }, data });
    res.json({ message: action === 'approuver' ? 'Publication approuvée.' : 'Publication rejetée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/posts/:id ─────────────────────────────
router.delete('/posts/:id', async (req, res) => {
  try {
    await prisma.post.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Publication supprimée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/analytics ────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const jours = parseInt(req.query.jours) || 30;
    const depuis = new Date();
    depuis.setDate(depuis.getDate() - jours);

    const [vues, recherches] = await Promise.all([
      // Total vues sur la période
      prisma.analyticsEvent.count({
        where: { type: 'VUE_STRUCTURE', createdAt: { gte: depuis } },
      }).catch(() => 0),
      // Top recherches
      prisma.analyticsEvent.groupBy({
        by: ['query'],
        where: { type: 'RECHERCHE', createdAt: { gte: depuis }, query: { not: null } },
        _count: true,
        orderBy: { _count: { query: 'desc' } },
        take: 20,
      }).catch(() => []),
    ]);

    const recherchesFormatted = recherches.map((r) => ({
      query: r.query,
      _count: r._count,
    }));

    res.json({ vues, recherches: recherchesFormatted, jours });
  } catch (err) {
    console.error('Analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/top-structures ───────────────────────────
router.get('/top-structures', async (req, res) => {
  try {
    const jours = parseInt(req.query.jours) || 30;
    const depuis = new Date();
    depuis.setDate(depuis.getDate() - jours);

    const topEvents = await prisma.analyticsEvent.groupBy({
      by: ['structureId'],
      where: { type: 'VUE_STRUCTURE', createdAt: { gte: depuis }, structureId: { not: null } },
      _count: true,
      orderBy: { _count: { structureId: 'desc' } },
      take: 10,
    }).catch(() => []);

    const structureIds = topEvents.map((e) => e.structureId).filter(Boolean);

    const structures = structureIds.length > 0
      ? await prisma.structure.findMany({
          where: { id: { in: structureIds } },
          select: { id: true, nomCommercial: true, typeStructure: true, ville: true },
        })
      : [];

    const data = topEvents.map((e) => {
      const s = structures.find((st) => st.id === e.structureId);
      return { ...s, _count: e._count };
    }).filter((s) => s.id);

    res.json({ data });
  } catch (err) {
    console.error('Top structures:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/medicaments ─────────────────────────────
router.post('/medicaments', async (req, res) => {
  try {
    const { nomCommercial, dci, classeTherapeutique, forme, dosage, laboratoireFabricant } = req.body;
    if (!nomCommercial || !dci) return res.status(400).json({ error: 'Nom commercial et DCI requis.' });
    const med = await prisma.medicament.create({
      data: { nomCommercial, dci, classeTherapeutique, forme, dosage, laboratoireFabricant },
    });
    res.status(201).json(med);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Ce médicament existe déjà.' });
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/medicaments/:id ───────────────────────
router.delete('/medicaments/:id', async (req, res) => {
  try {
    await prisma.medicament.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Médicament retiré du catalogue.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// À AJOUTER à la fin de src/routes/admin.js
// (avant module.exports = router;)

// ─── POST /api/admin/examens ──────────────────────────────────
router.post('/examens', async (req, res) => {
  try {
    const { nom, codeAzamed, categorie, description } = req.body;
    if (!nom || !codeAzamed || !categorie) {
      return res.status(400).json({ error: 'Nom, code AZAMED et catégorie sont requis.' });
    }
    const examen = await prisma.examen.create({
      data: { nom, codeAzamed, categorie, description: description || null },
    });
    res.status(201).json(examen);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Un examen avec ce code existe déjà.' });
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/examens/:id ───────────────────────────
router.delete('/examens/:id', async (req, res) => {
  try {
    await prisma.examen.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Examen retiré du catalogue.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/services ─────────────────────────────────
router.post('/services', async (req, res) => {
  try {
    const { nom, categorie, description } = req.body;
    if (!nom || !categorie) {
      return res.status(400).json({ error: 'Nom et catégorie sont requis.' });
    }
    const service = await prisma.serviceMedical.create({
      data: { nom, categorie, description: description || null },
    });
    res.status(201).json(service);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Ce service existe déjà.' });
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/services/:id ──────────────────────────
router.delete('/services/:id', async (req, res) => {
  try {
    await prisma.serviceMedical.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Service retiré du catalogue.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;