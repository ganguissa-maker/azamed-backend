// src/routes/posts.js — avec support images et vidéos
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');
const multer = require('multer');

const prisma = new PrismaClient();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format non supporté. Images (JPG, PNG, WEBP) et vidéos (MP4, WEBM) uniquement.'));
  },
});

// ─── GET /api/posts ──────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, structureId, typeStructure, ville } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { isActive: true, isApproved: true };
    if (structureId) where.structureId = structureId;

    if (typeStructure || ville) {
      where.structure = {};
      if (typeStructure) where.structure.typeStructure = typeStructure;
      if (ville) where.structure.ville = { contains: ville, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          structure: {
            include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({
      data,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/posts ─────────────────────────────────────────
router.post('/', protect, structureOnly, upload.single('media'), async (req, res) => {
  try {
    const { contenu, typePost, imageUrl: bodyImageUrl, videoUrl: bodyVideoUrl } = req.body;

    if (!contenu || contenu.length < 10) {
      return res.status(400).json({ error: 'Le contenu doit avoir au moins 10 caractères.' });
    }

    let imageUrl = bodyImageUrl || null;
    let videoUrl = bodyVideoUrl || null;

    // Upload Cloudinary si fichier présent et Cloudinary configuré
    if (req.file && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== 'placeholder') {
      try {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key:    process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        const b64     = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        const isVideo = req.file.mimetype.startsWith('video/');
        const result  = await cloudinary.uploader.upload(dataURI, {
          resource_type: isVideo ? 'video' : 'image',
          folder: 'azamed/posts',
        });
        if (isVideo) videoUrl = result.secure_url;
        else         imageUrl = result.secure_url;
      } catch (uploadErr) {
        console.error('Cloudinary upload error:', uploadErr.message);
      }
    }

    const structureId = req.user.structure?.id;
    if (!structureId) return res.status(400).json({ error: 'Structure introuvable.' });

    const post = await prisma.post.create({
      data: {
        contenu,
        typePost:   typePost || 'AUTRE',
        structureId,
        imageUrl,
        videoUrl,
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

// ─── DELETE /api/posts/:id ───────────────────────────────────
router.delete('/:id', protect, structureOnly, async (req, res) => {
  try {
    await prisma.post.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Publication supprimée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/posts/:id/epingler ─────────────────────────────
router.put('/:id/epingler', protect, structureOnly, async (req, res) => {
  try {
    const post    = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post introuvable.' });
    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data:  { isPinned: !post.isPinned },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/posts/track-view ──────────────────────────────
router.post('/track-view', async (req, res) => {
  try {
    const { page } = req.body;
    await prisma.analyticsEvent.create({
      data: { type: 'VUE_PAGE', query: page || 'home' },
    }).catch(() => {});
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

module.exports = router;
