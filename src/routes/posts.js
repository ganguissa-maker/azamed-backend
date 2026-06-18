// src/routes/posts.js — Gère multipart/form-data (image/vidéo) avec multer
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

// ── Config multer : stockage local dans /uploads ──────────────
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `post-${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format non supporté.'));
  },
});

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
          structure: { select: { id:true, nomCommercial:true, ville:true, typeStructure:true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({ data, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/posts — créer une publication (multipart) ───────
router.post('/', protect, structureOnly, upload.single('media'), async (req, res) => {
  try {
    const structureId = req.user.structure?.id;
    if (!structureId) return res.status(400).json({ error: 'Structure introuvable.' });

    const { contenu, typePost } = req.body;
    if (!contenu || !contenu.trim()) {
      return res.status(400).json({ error: 'Le contenu est requis (minimum 10 caractères).' });
    }
    if (contenu.trim().length < 10) {
      return res.status(400).json({ error: 'Le contenu doit contenir au moins 10 caractères.' });
    }

    // URL publique du fichier uploadé
    let mediaUrl = null;
    if (req.file) {
      const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      mediaUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    const post = await prisma.post.create({
      data: {
        contenu:    contenu.trim(),
        typePost:   typePost || 'AUTRE',
        structureId,
        mediaUrl,
        isApproved: true,
        isActive:   true,
      },
      include: {
        structure: { include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } } },
      },
    });

    res.status(201).json(post);
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/posts/:id ──────────────────────────────────────
router.put('/:id', protect, structureOnly, upload.single('media'), async (req, res) => {
  try {
    const structureId = req.user.structure?.id;
    const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Publication introuvable.' });
    if (existing.structureId !== structureId) return res.status(403).json({ error: 'Non autorisé.' });

    const { contenu, typePost, isPinned } = req.body;
    let mediaUrl = undefined;
    if (req.file) {
      const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      mediaUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: {
        contenu:  contenu !== undefined ? contenu : undefined,
        typePost: typePost !== undefined ? typePost : undefined,
        mediaUrl: mediaUrl,
        isPinned: isPinned !== undefined ? (isPinned === 'true' || isPinned === true) : undefined,
      },
    });

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/posts/:id ──────────────────────────────────────
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

// ── GET /api/posts/mes ─────────────────────────────────────────
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

module.exports = router;
