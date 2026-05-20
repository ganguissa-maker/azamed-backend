// src/routes/admin.js — Gestion catalogue médicaments/examens/services
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, adminOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

router.use(protect, adminOnly);

// ─── MÉDICAMENTS ─────────────────────────────────────────────
router.get('/medicaments', async (req, res) => {
  try {
    const { search, classe, limit = 100, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { isActive: true };
    if (classe)  where.classeTherapeutique = { contains: classe, mode:'insensitive' };
    if (search)  where.OR = [
      { nomCommercial:       { contains: search, mode:'insensitive' } },
      { dci:                 { contains: search, mode:'insensitive' } },
      { classeTherapeutique: { contains: search, mode:'insensitive' } },
      { forme:               { contains: search, mode:'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      prisma.medicament.findMany({ where, skip, take: parseInt(limit), orderBy: { nomCommercial:'asc' } }),
      prisma.medicament.count({ where }),
    ]);
    res.json({ data, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/medicaments', async (req, res) => {
  try {
    const { nomCommercial, dci, classeTherapeutique, forme, dosage, laboratoireFabricant } = req.body;
    if (!nomCommercial || !dci) return res.status(400).json({ error: 'Nom commercial et DCI requis.' });
    const med = await prisma.medicament.create({ data: { nomCommercial, dci, classeTherapeutique: classeTherapeutique||'Autre', forme: forme||'Comprimé', dosage: dosage||'', laboratoireFabricant: laboratoireFabricant||'' } });
    res.status(201).json(med);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Ce médicament existe déjà.' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/medicaments/:id', async (req, res) => {
  try {
    const { nomCommercial, dci, classeTherapeutique, forme, dosage, laboratoireFabricant } = req.body;
    const med = await prisma.medicament.update({ where: { id: req.params.id }, data: { nomCommercial, dci, classeTherapeutique, forme, dosage, laboratoireFabricant } });
    res.json(med);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/medicaments/:id', async (req, res) => {
  try {
    await prisma.medicament.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Médicament désactivé.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── EXAMENS ─────────────────────────────────────────────────
router.get('/examens', async (req, res) => {
  try {
    const { search, categorie, limit = 150, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { isActive: true };
    if (categorie) where.categorie = { contains: categorie, mode:'insensitive' };
    if (search)    where.OR = [
      { nom:        { contains: search, mode:'insensitive' } },
      { categorie:  { contains: search, mode:'insensitive' } },
      { codeAzamed: { contains: search, mode:'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      prisma.examen.findMany({ where, skip, take: parseInt(limit), orderBy: [{ categorie:'asc' }, { nom:'asc' }] }),
      prisma.examen.count({ where }),
    ]);
    res.json({ data, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/examens', async (req, res) => {
  try {
    const { nom, codeAzamed, categorie, description } = req.body;
    if (!nom || !codeAzamed || !categorie) return res.status(400).json({ error: 'Nom, code et catégorie requis.' });
    const ex = await prisma.examen.create({ data: { nom, codeAzamed, categorie, description: description||null } });
    res.status(201).json(ex);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Code déjà utilisé.' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/examens/:id', async (req, res) => {
  try {
    const { nom, codeAzamed, categorie, description } = req.body;
    const ex = await prisma.examen.update({ where: { id: req.params.id }, data: { nom, codeAzamed, categorie, description: description||null } });
    res.json(ex);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/examens/:id', async (req, res) => {
  try {
    await prisma.examen.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Examen désactivé.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SERVICES ────────────────────────────────────────────────
router.get('/services', async (req, res) => {
  try {
    const { search, categorie, limit = 150, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { isActive: true };
    if (categorie) where.categorie = { contains: categorie, mode:'insensitive' };
    if (search)    where.OR = [
      { nom:       { contains: search, mode:'insensitive' } },
      { categorie: { contains: search, mode:'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      prisma.serviceMedical.findMany({ where, skip, take: parseInt(limit), orderBy: [{ categorie:'asc' }, { nom:'asc' }] }),
      prisma.serviceMedical.count({ where }),
    ]);
    res.json({ data, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/services', async (req, res) => {
  try {
    const { nom, categorie, description } = req.body;
    if (!nom || !categorie) return res.status(400).json({ error: 'Nom et catégorie requis.' });
    const sv = await prisma.serviceMedical.create({ data: { nom, categorie, description: description||null } });
    res.status(201).json(sv);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Ce service existe déjà.' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/services/:id', async (req, res) => {
  try {
    const { nom, categorie, description } = req.body;
    const sv = await prisma.serviceMedical.update({ where: { id: req.params.id }, data: { nom, categorie, description: description||null } });
    res.json(sv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/services/:id', async (req, res) => {
  try {
    await prisma.serviceMedical.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Service désactivé.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DASHBOARD ADMIN ─────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [totalStructures, nonVerifies, totalMedicaments, totalExamens, totalServices, inscriptionsAujourdhui, inscriptionsRecentes] = await Promise.all([
      prisma.structure.count({ where:{ isActive:true } }),
      prisma.structure.count({ where:{ isVerified:false, isActive:true } }),
      prisma.medicament.count({ where:{ isActive:true } }),
      prisma.examen.count({ where:{ isActive:true } }),
      prisma.serviceMedical.count({ where:{ isActive:true } }),
      prisma.structure.count({ where:{ createdAt:{ gte:today } } }),
      prisma.structure.findMany({ where:{ isActive:true }, orderBy:{ createdAt:'desc' }, take:8, include:{ user:{ select:{ email:true } } } }),
    ]);
    res.json({ totalStructures, nonVerifies, totalMedicaments, totalExamens, totalServices, inscriptionsAujourdhui, inscriptionsRecentes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── STRUCTURES ───────────────────────────────────────────────
router.get('/structures', async (req, res) => {
  try {
    const { search, type, status, page=1, limit=15 } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const where = {};
    if (type)   where.typeStructure = type;
    if (status === 'non_verifie') { where.isVerified=false; where.isActive=true; }
    if (status === 'actif')    where.isActive=true;
    if (status === 'suspendu') where.isActive=false;
    if (search) where.OR = [
      { nomCommercial: { contains:search, mode:'insensitive' } },
      { ville:         { contains:search, mode:'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      prisma.structure.findMany({ where, skip, take:parseInt(limit), orderBy:{ createdAt:'desc' }, include:{ user:{ select:{ email:true } } } }),
      prisma.structure.count({ where }),
    ]);
    res.json({ data, pagination:{ total, page:parseInt(page), pages:Math.ceil(total/parseInt(limit)) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/structures/:id/verifier', async (req, res) => {
  try {
    const structure = await prisma.structure.update({ where:{ id:req.params.id }, data:{ isVerified:true }, include:{ user:true } });
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "notifications" ("id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,"userId" TEXT NOT NULL,"type" TEXT NOT NULL,"titre" TEXT NOT NULL,"message" TEXT NOT NULL,"isRead" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"))`).catch(()=>{});
    await prisma.$executeRawUnsafe(`INSERT INTO "notifications" ("userId","type","titre","message") VALUES ($1,$2,$3,$4)`, structure.userId, 'VERIFICATION', '✅ Compte vérifié !', `Félicitations ! Votre établissement "${structure.nomCommercial}" a été vérifié par l'équipe AZAMED. Il est maintenant visible par tous les patients.`).catch(()=>{});
    res.json({ message:`${structure.nomCommercial} vérifiée et visible.`, structure });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/structures/:id/suspendre', async (req, res) => {
  try {
    const cur = await prisma.structure.findUnique({ where:{ id:req.params.id } });
    const structure = await prisma.structure.update({ where:{ id:req.params.id }, data:{ isActive:!cur.isActive } });
    res.json({ message:`${structure.nomCommercial} ${structure.isActive?'réactivée':'suspendue'}.`, structure });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
