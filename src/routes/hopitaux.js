// src/routes/hopitaux.js
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/hopitaux — liste publique
router.get('/', async (req, res) => {
  try {
    const TYPES = ['HOPITAL_PUBLIC','POLYCLINIQUE','CLINIQUE','CABINET_MEDICAL','CABINET_SPECIALISE','CENTRE_SANTE'];
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

// GET /api/hopitaux/:id/services
router.get('/:id/services', async (req, res) => {
  try {
    const data = await prisma.hopitalService.findMany({
      where:{ hopitalId:req.params.id },
      include:{ service:true },
      orderBy:{ service:{ nom:'asc' } },
    });
    res.json({ data });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// POST /api/hopitaux/:id/services
router.post('/:id/services', protect, structureOnly, async (req, res) => {
  try {
    const { serviceId, disponible=true, surRdv=false, prixConsultation, prixChambre, modeConsultation='JOURS_OUVRABLES', infoSupplementaire } = req.body;
    if (!serviceId) return res.status(400).json({ error:'serviceId requis.' });
    const item = await prisma.hopitalService.upsert({
      where:{ hopitalId_serviceId:{ hopitalId:req.params.id, serviceId } },
      update:{ disponible, surRdv, prixConsultation:prixConsultation||null, prixChambre:prixChambre||null, modeConsultation, infoSupplementaire:infoSupplementaire||null },
      create:{ hopitalId:req.params.id, serviceId, disponible, surRdv, prixConsultation:prixConsultation||null, prixChambre:prixChambre||null, modeConsultation, infoSupplementaire:infoSupplementaire||null },
      include:{ service:true },
    });
    res.status(201).json(item);
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// PUT /api/hopitaux/:id/services/:itemId
router.put('/:id/services/:itemId', protect, structureOnly, async (req, res) => {
  try {
    const { disponible, surRdv, prixConsultation, prixChambre, modeConsultation, infoSupplementaire } = req.body;
    const item = await prisma.hopitalService.update({
      where:{ id:req.params.itemId },
      data:{
        disponible:         disponible         !== undefined ? disponible         : undefined,
        surRdv:             surRdv             !== undefined ? surRdv             : undefined,
        prixConsultation:   prixConsultation   !== undefined ? prixConsultation   : undefined,
        prixChambre:        prixChambre        !== undefined ? prixChambre        : undefined,
        modeConsultation:   modeConsultation   !== undefined ? modeConsultation   : undefined,
        infoSupplementaire: infoSupplementaire !== undefined ? infoSupplementaire : undefined,
      },
      include:{ service:true },
    });
    res.json(item);
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// DELETE /api/hopitaux/:id/services/:itemId
router.delete('/:id/services/:itemId', protect, structureOnly, async (req, res) => {
  try {
    await prisma.hopitalService.delete({ where:{ id:req.params.itemId } });
    res.json({ message:'Service retiré.' });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

module.exports = router;
