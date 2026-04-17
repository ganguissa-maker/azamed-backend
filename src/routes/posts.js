// src/routes/posts.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly, ownStructure, adminOnly } = require('../middleware/auth');

const prisma = new PrismaClient();

// Limites de posts selon abonnement
const LIMITE_POSTS = {
  BASIC: { par: 'semaine', max: 1 },
  PREMIUM1: { par: 'jour', max: 2 },
  PREMIUM2: { par: 'jour', max: 5 },
};

async function getNombrePostsRecents(structureId, niveau) {
  const config = LIMITE_POSTS[niveau] || LIMITE_POSTS.BASIC;
  let depuis;
  if (config.par === 'jour') {
    depuis = new Date();
    depuis.setHours(0, 0, 0, 0);
  } else {
    depuis = new Date();
    depuis.setDate(depuis.getDate() - depuis.getDay()); // début de semaine
    depuis.setHours(0, 0, 0, 0);
  }

  return prisma.post.count({
    where: {
      structureId,
      isActive: true,
      createdAt: { gte: depuis },
    },
  });
}

// ─── GET /api/posts — Fil d'actualité public ──────────────────
router.get('/', async (req, res) => {
  try {
    const { pays, ville, quartier, typeStructure, structureId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const structureWhere = { isActive: true };
    if (pays) structureWhere.pays = { contains: pays, mode: 'insensitive' };
    if (ville) structureWhere.ville = { contains: ville, mode: 'insensitive' };
    if (quartier) structureWhere.quartier = { contains: quartier, mode: 'insensitive' };
    if (typeStructure) structureWhere.typeStructure = typeStructure;

    const where = {
      isApproved: true,
      isActive: true,
      structure: structureWhere,
    };
    if (structureId) where.structureId = structureId;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          structure: {
            select: {
              id: true, nomCommercial: true, logoUrl: true, typeStructure: true, ville: true,
              abonnements: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.post.count({ where }),
    ]);

    // Trier : PREMIUM2 > PREMIUM1 > BASIC, puis par date
    const enriched = posts.map((p) => ({
      ...p,
      structure: {
        ...p.structure,
        niveauAbonnement: p.structure.abonnements[0]?.niveau || 'BASIC',
      },
    }));

    const order = { PREMIUM2: 0, PREMIUM1: 1, BASIC: 2 };
    enriched.sort((a, b) => {
      const diff = order[a.structure.niveauAbonnement] - order[b.structure.niveauAbonnement];
      if (diff !== 0) return diff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ data: enriched, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur fil actualité.' });
  }
});

// ─── POST /api/posts — Créer un post ─────────────────────────
router.post('/', protect, structureOnly, async (req, res) => {
  try {
    const { contenu, typePost, mediaUrl, videoUrl } = req.body;

    if (!contenu || contenu.trim().length < 10) {
      return res.status(400).json({ error: 'Contenu trop court (min. 10 caractères).' });
    }

    const structure = await prisma.structure.findUnique({
      where: { userId: req.user.id },
      include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!structure) return res.status(404).json({ error: 'Structure non trouvée.' });

    const niveau = structure.abonnements[0]?.niveau || 'BASIC';
    const limite = LIMITE_POSTS[niveau];
    const nbPosts = await getNombrePostsRecents(structure.id, niveau);

    if (nbPosts >= limite.max) {
      return res.status(429).json({
        error: `Limite atteinte : ${limite.max} post(s) par ${limite.par} pour le niveau ${niveau}.`,
        limite: limite.max,
        par: limite.par,
        niveau,
      });
    }

    // PREMIUM2 uniquement peut poster des vidéos
    if (videoUrl && niveau !== 'PREMIUM2') {
      return res.status(403).json({ error: 'Vidéos disponibles uniquement pour PREMIUM 2.' });
    }

    const post = await prisma.post.create({
      data: {
        structureId: structure.id,
        contenu: contenu.trim(),
        typePost: typePost || 'AUTRE',
        mediaUrl,
        videoUrl,
        isApproved: true, // Auto-approuvé (modération optionnelle)
      },
      include: {
        structure: {
          select: { id: true, nomCommercial: true, logoUrl: true, typeStructure: true },
        },
      },
    });

    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur création post.' });
  }
});

// ─── DELETE /api/posts/:id — Supprimer un post ───────────────
router.delete('/:id', protect, structureOnly, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post non trouvé.' });

    const structure = await prisma.structure.findUnique({ where: { userId: req.user.id } });
    if (post.structureId !== structure?.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Non autorisé.' });
    }

    await prisma.post.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Post supprimé.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur.' });
  }
});

// ─── PUT /api/posts/:id/epingler — Épingler (PREMIUM2) ───────
router.put('/:id/epingler', protect, structureOnly, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    const structure = await prisma.structure.findUnique({
      where: { userId: req.user.id },
      include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (post.structureId !== structure?.id) return res.status(403).json({ error: 'Non autorisé.' });

    const niveau = structure.abonnements[0]?.niveau;
    if (niveau !== 'PREMIUM2') {
      return res.status(403).json({ error: 'Épinglage disponible uniquement pour PREMIUM 2.' });
    }

    // Désépingler les autres posts de cette structure
    await prisma.post.updateMany({
      where: { structureId: structure.id, isPinned: true },
      data: { isPinned: false },
    });

    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data: { isPinned: !post.isPinned },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erreur.' });
  }
});

module.exports = router;
