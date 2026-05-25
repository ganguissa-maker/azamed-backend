// src/routes/laboratoires.js
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/laboratoires — liste publique
router.get('/', async (req, res) => {
  try {
    const TYPES = ['LABORATOIRE','CENTRE_IMAGERIE','LABO_ET_IMAGERIE'];
    const { search, type, ville, page=1, limit=15 } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const where = { isVerified:true, isActive:true, typeStructure:{ in: type ? [type] : TYPES } };
    if (ville)  where.ville = { contains:ville, mode:'insensitive' };
    if (search) where.OR = [
      { nomCommercial:{ contains:search, mode:'insensitive' } },
      { ville:        { contains:search, mode:'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      prisma.structure.findMany({ where, skip, take:parseInt(limit), orderBy:{ nomCommercial:'asc' },
        include:{ abonnements:{ orderBy:{ createdAt:'desc' }, take:1 } } }),
      prisma.structure.count({ where }),
    ]);
    res.json({ data, pagination:{ total, page:parseInt(page), pages:Math.ceil(total/parseInt(limit)) } });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// GET /api/laboratoires/:id/examens
router.get('/:id/examens', async (req, res) => {
  try {
    const data = await prisma.laboExamen.findMany({
      where:{ laboId:req.params.id },
      include:{ examen:true },
      orderBy:{ examen:{ nom:'asc' } },
    });
    res.json({ data });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// POST /api/laboratoires/:id/examens
router.post('/:id/examens', protect, structureOnly, async (req, res) => {
  try {
    const { examenId, disponible=true, prix, delaiMin, delaiMax } = req.body;
    if (!examenId) return res.status(400).json({ error:'examenId requis.' });
    const item = await prisma.laboExamen.upsert({
      where:{ laboId_examenId:{ laboId:req.params.id, examenId } },
      update:{ disponible, prix:prix||null, delaiMin:delaiMin||null, delaiMax:delaiMax||null },
      create:{ laboId:req.params.id, examenId, disponible, prix:prix||null, delaiMin:delaiMin||null, delaiMax:delaiMax||null },
      include:{ examen:true },
    });
    res.status(201).json(item);
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// PUT /api/laboratoires/:id/examens/:itemId
router.put('/:id/examens/:itemId', protect, structureOnly, async (req, res) => {
  try {
    const { disponible, prix, delaiMin, delaiMax } = req.body;
    const item = await prisma.laboExamen.update({
      where:{ id:req.params.itemId },
      data:{
        disponible: disponible !== undefined ? disponible : undefined,
        prix:       prix       !== undefined ? prix       : undefined,
        delaiMin:   delaiMin   !== undefined ? delaiMin   : undefined,
        delaiMax:   delaiMax   !== undefined ? delaiMax   : undefined,
      },
      include:{ examen:true },
    });
    res.json(item);
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// DELETE /api/laboratoires/:id/examens/:itemId
router.delete('/:id/examens/:itemId', protect, structureOnly, async (req, res) => {
  try {
    await prisma.laboExamen.delete({ where:{ id:req.params.itemId } });
    res.json({ message:'Examen retiré.' });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

module.exports = router;
