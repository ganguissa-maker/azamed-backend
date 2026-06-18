// src/routes/posts.js — Publications actualités (champ corrigé: mediaUrl)
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

// ── GET /api/posts — liste publique ───────────────────────────
router.get('/', async (req, res) => {
  try {
    const { structureId, limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { isApproved: true, isActive: true };
    if (structureId) where.structureId = structureId;

    const [data, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          structure: {
            select: { id: true, nomCommercial: true, ville: true, typeStructure: true },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({ data, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/posts/mes — mes publications (structure connectée) ─
router.get('/mes', protect, structureOnly, async (req, res) => {
  try {
    const structureId = req.user.structure?.id;
    if (!structureId) return res.status(400).json({ error: 'Structure introuvable.' });

    const data = await prisma.post.findMany({
      where: { structureId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/posts — créer une publication ───────────────────
router.post('/', protect, structureOnly, async (req, res) => {
  try {
    const structureId = req.user.structure?.id;
    if (!structureId) return res.status(400).json({ error: 'Structure introuvable.' });

    const { contenu, typePost, mediaUrl } = req.body;
    if (!contenu || !contenu.trim()) {
      return res.status(400).json({ error: 'Le contenu est requis.' });
    }

    // ✅ CORRECTION : le schema Prisma utilise "mediaUrl", pas "imageUrl"/"videoUrl"
    const post = await prisma.post.create({
      data: {
        contenu:    contenu.trim(),
        typePost:   typePost || 'ACTUALITE',
        structureId,
        mediaUrl:   mediaUrl || null,
        isApproved: true,
        isActive:   true,
      },
      include: {
        structure: {
          include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
      },
    });

    res.status(201).json(post);
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/posts/:id — modifier une publication ─────────────
router.put('/:id', protect, structureOnly, async (req, res) => {
  try {
    const structureId = req.user.structure?.id;
    const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Publication introuvable.' });
    if (existing.structureId !== structureId) return res.status(403).json({ error: 'Non autorisé.' });

    const { contenu, typePost, mediaUrl, isPinned } = req.body;

    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: {
        contenu:  contenu !== undefined ? contenu : undefined,
        typePost: typePost !== undefined ? typePost : undefined,
        mediaUrl: mediaUrl !== undefined ? mediaUrl : undefined,
        isPinned: isPinned !== undefined ? isPinned : undefined,
      },
    });

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/posts/:id — supprimer une publication ─────────
router.delete('/:id', protect, structureOnly, async (req, res) => {
  try {
    const structureId = req.user.structure?.id;
    const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Publication introuvable.' });
    if (existing.structureId !== structureId) return res.status(403).json({ error: 'Non autorisé.' });

    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ message: 'Publication supprimée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
