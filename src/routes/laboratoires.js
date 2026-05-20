// src/routes/laboratoires.js
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/laboratoires/:id/examens
router.get('/:id/examens', async (req, res) => {
  try {
    const data = await prisma.laboExamen.findMany({
      where: { laboId: req.params.id },
      include: { examen: true },
      orderBy: { examen: { nom:'asc' } },
    });
    res.json({ data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/laboratoires/:id/examens
router.post('/:id/examens', protect, structureOnly, async (req, res) => {
  try {
    const { examenId, disponible, prix, delaiMin, delaiMax } = req.body;
    if (!examenId) return res.status(400).json({ error: 'examenId requis.' });
    const item = await prisma.laboExamen.upsert({
      where: { laboId_examenId: { laboId: req.params.id, examenId } },
      update: { disponible: disponible ?? true, prix: prix || null, delaiMin: delaiMin || null, delaiMax: delaiMax || null },
      create: { laboId: req.params.id, examenId, disponible: disponible ?? true, prix: prix || null, delaiMin: delaiMin || null, delaiMax: delaiMax || null },
      include: { examen: true },
    });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/laboratoires/:id/examens/:itemId
router.put('/:id/examens/:itemId', protect, structureOnly, async (req, res) => {
  try {
    const { disponible, prix, delaiMin, delaiMax } = req.body;
    const item = await prisma.laboExamen.update({
      where: { id: req.params.itemId },
      data: {
        disponible: disponible !== undefined ? disponible : undefined,
        prix:       prix       !== undefined ? prix       : undefined,
        delaiMin:   delaiMin   !== undefined ? delaiMin   : undefined,
        delaiMax:   delaiMax   !== undefined ? delaiMax   : undefined,
      },
      include: { examen: true },
    });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/laboratoires/:id/examens/:itemId
router.delete('/:id/examens/:itemId', protect, structureOnly, async (req, res) => {
  try {
    await prisma.laboExamen.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Examen retiré.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/examens — catalogue public
router.get('/catalogue', async (req, res) => {
  try {
    const { search, categorie, limit = 100 } = req.query;
    const where = { isActive: true };
    if (categorie) where.categorie = categorie;
    if (search) where.OR = [
      { nom: { contains: search, mode:'insensitive' } },
      { categorie: { contains: search, mode:'insensitive' } },
      { codeAzamed: { contains: search, mode:'insensitive' } },
    ];
    const data = await prisma.examen.findMany({ where, take: parseInt(limit), orderBy: { nom:'asc' } });
    res.json({ data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
