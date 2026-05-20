// src/routes/pharmacies.js
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/pharmacies/garde — pharmacies de garde
router.get('/garde', async (req, res) => {
  try {
    const data = await prisma.structure.findMany({
      where: { typeStructure:'PHARMACIE', isVerified:true, isActive:true, estDeGarde:true },
      include: { abonnements: { orderBy:{ createdAt:'desc' }, take:1 } },
      orderBy: { nomCommercial:'asc' },
    });
    res.json({ data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pharmacies/:id/medicaments
router.get('/:id/medicaments', async (req, res) => {
  try {
    const data = await prisma.pharmacieMedicament.findMany({
      where: { pharmacieId: req.params.id },
      include: { medicament: true },
      orderBy: { medicament: { nomCommercial:'asc' } },
    });
    res.json({ data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/pharmacies/:id/medicaments
router.post('/:id/medicaments', protect, structureOnly, async (req, res) => {
  try {
    const { medicamentId, enStock, disponible, prix, deGarde } = req.body;
    if (!medicamentId) return res.status(400).json({ error: 'medicamentId requis.' });
    const item = await prisma.pharmacieMedicament.upsert({
      where: { pharmacieId_medicamentId: { pharmacieId: req.params.id, medicamentId } },
      update: { enStock: enStock ?? true, disponible: disponible ?? true, prix: prix || null, deGarde: deGarde ?? false },
      create: { pharmacieId: req.params.id, medicamentId, enStock: enStock ?? true, disponible: disponible ?? true, prix: prix || null, deGarde: deGarde ?? false },
      include: { medicament: true },
    });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/pharmacies/:id/medicaments/:itemId
router.put('/:id/medicaments/:itemId', protect, structureOnly, async (req, res) => {
  try {
    const { enStock, disponible, prix, deGarde } = req.body;
    const item = await prisma.pharmacieMedicament.update({
      where: { id: req.params.itemId },
      data: {
        enStock:   enStock   !== undefined ? enStock   : undefined,
        disponible:disponible!== undefined ? disponible: undefined,
        prix:      prix      !== undefined ? prix      : undefined,
        deGarde:   deGarde   !== undefined ? deGarde   : undefined,
      },
      include: { medicament: true },
    });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/pharmacies/:id/medicaments/:itemId
router.delete('/:id/medicaments/:itemId', protect, structureOnly, async (req, res) => {
  try {
    await prisma.pharmacieMedicament.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Médicament retiré.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/pharmacies/:id/garde
router.put('/:id/garde', protect, structureOnly, async (req, res) => {
  try {
    const { estDeGarde } = req.body;
    const structure = await prisma.structure.update({
      where: { id: req.params.id },
      data: { estDeGarde: estDeGarde ?? false },
    });
    res.json(structure);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
