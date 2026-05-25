// src/routes/pharmacies.js
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/pharmacies/garde
router.get('/garde', async (req, res) => {
  try {
    const { ville } = req.query;
    const where = { typeStructure:'PHARMACIE', isVerified:true, isActive:true, estDeGarde:true };
    if (ville) where.ville = { contains: ville, mode:'insensitive' };
    const data = await prisma.structure.findMany({ where, orderBy:{ nomCommercial:'asc' } });
    res.json({ data });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// GET /api/pharmacies — liste publique pharmacies vérifiées
router.get('/', async (req, res) => {
  try {
    const { search, ville, garde, page=1, limit=15 } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const where = { typeStructure:'PHARMACIE', isVerified:true, isActive:true };
    if (ville)  where.ville = { contains:ville, mode:'insensitive' };
    if (garde === 'true') where.estDeGarde = true;
    if (search) where.OR = [
      { nomCommercial:{ contains:search, mode:'insensitive' } },
      { ville:        { contains:search, mode:'insensitive' } },
      { quartier:     { contains:search, mode:'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      prisma.structure.findMany({ where, skip, take:parseInt(limit), orderBy:{ nomCommercial:'asc' },
        include:{ abonnements:{ orderBy:{ createdAt:'desc' }, take:1 } } }),
      prisma.structure.count({ where }),
    ]);
    res.json({ data, pagination:{ total, page:parseInt(page), pages:Math.ceil(total/parseInt(limit)) } });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// GET /api/pharmacies/:id/medicaments
router.get('/:id/medicaments', async (req, res) => {
  try {
    const data = await prisma.pharmacieMedicament.findMany({
      where:{ pharmacieId:req.params.id },
      include:{ medicament:true },
      orderBy:{ medicament:{ nomCommercial:'asc' } },
    });
    res.json({ data });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// POST /api/pharmacies/:id/medicaments
router.post('/:id/medicaments', protect, structureOnly, async (req, res) => {
  try {
    const { medicamentId, enStock=true, disponible=true, prix, deGarde=false } = req.body;
    if (!medicamentId) return res.status(400).json({ error:'medicamentId requis.' });
    const item = await prisma.pharmacieMedicament.upsert({
      where:{ pharmacieId_medicamentId:{ pharmacieId:req.params.id, medicamentId } },
      update:{ enStock, disponible, prix:prix||null, deGarde },
      create:{ pharmacieId:req.params.id, medicamentId, enStock, disponible, prix:prix||null, deGarde },
      include:{ medicament:true },
    });
    res.status(201).json(item);
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// PUT /api/pharmacies/:id/medicaments/:itemId
router.put('/:id/medicaments/:itemId', protect, structureOnly, async (req, res) => {
  try {
    const { enStock, disponible, prix, deGarde } = req.body;
    const item = await prisma.pharmacieMedicament.update({
      where:{ id:req.params.itemId },
      data:{
        enStock:    enStock    !== undefined ? enStock    : undefined,
        disponible: disponible !== undefined ? disponible : undefined,
        prix:       prix       !== undefined ? prix       : undefined,
        deGarde:    deGarde    !== undefined ? deGarde    : undefined,
      },
      include:{ medicament:true },
    });
    res.json(item);
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// DELETE /api/pharmacies/:id/medicaments/:itemId
router.delete('/:id/medicaments/:itemId', protect, structureOnly, async (req, res) => {
  try {
    await prisma.pharmacieMedicament.delete({ where:{ id:req.params.itemId } });
    res.json({ message:'Médicament retiré.' });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// PUT /api/pharmacies/:id/garde
router.put('/:id/garde', protect, structureOnly, async (req, res) => {
  try {
    const s = await prisma.structure.update({ where:{ id:req.params.id }, data:{ estDeGarde:req.body.estDeGarde ?? false } });
    res.json(s);
  } catch(err) { res.status(500).json({ error:err.message }); }
});

module.exports = router;
