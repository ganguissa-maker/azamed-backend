// src/routes/admin.js — Catalogue complet médicaments/examens/services
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, adminOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

router.use(protect, adminOnly);

// ════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [
      totalStructures, nonVerifies, totalMedicaments, totalExamens,
      totalServices, inscriptionsAujourdhui, inscriptionsRecentes,
      totalUtilisateurs, totalMedecins,
    ] = await Promise.all([
      prisma.structure.count({ where: { isActive:true } }),
      prisma.structure.count({ where: { isVerified:false, isActive:true } }),
      prisma.medicament.count({ where: { isActive:true } }),
      prisma.examen.count({ where: { isActive:true } }),
      prisma.serviceMedical.count({ where: { isActive:true } }),
      prisma.structure.count({ where: { createdAt:{ gte:today } } }),
      prisma.structure.findMany({
        where: { isActive:true }, orderBy: { createdAt:'desc' }, take:10,
        include: { user: { select: { email:true } } },
      }),
      prisma.user.count({ where: { role:'PATIENT', isActive:true } }).catch(()=>0),
      prisma.user.count({ where: { role:'MEDECIN', isActive:true } }).catch(()=>0),
    ]);
    res.json({ totalStructures, nonVerifies, totalMedicaments, totalExamens, totalServices, inscriptionsAujourdhui, inscriptionsRecentes, totalUtilisateurs, totalMedecins });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
// MÉDICAMENTS — CRUD complet
// ════════════════════════════════════════════════════════════

// GET /api/admin/medicaments — liste paginée + recherche
router.get('/medicaments', async (req, res) => {
  try {
    const { search, classe, page=1, limit=50 } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const where = { isActive:true };
    if (classe)  where.classeTherapeutique = { contains:classe, mode:'insensitive' };
    if (search)  where.OR = [
      { nomCommercial:       { contains:search, mode:'insensitive' } },
      { dci:                 { contains:search, mode:'insensitive' } },
      { classeTherapeutique: { contains:search, mode:'insensitive' } },
      { forme:               { contains:search, mode:'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      prisma.medicament.findMany({ where, skip, take:parseInt(limit), orderBy:{ nomCommercial:'asc' } }),
      prisma.medicament.count({ where }),
    ]);
    res.json({ data, total, pages:Math.ceil(total/parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/medicaments
router.post('/medicaments', async (req, res) => {
  try {
    const { nomCommercial, dci, classeTherapeutique, forme, dosage, laboratoireFabricant } = req.body;
    if (!nomCommercial || !dci) return res.status(400).json({ error:'Nom commercial et DCI requis.' });
    // Vérifier doublon
    const exists = await prisma.medicament.findFirst({ where:{ nomCommercial:{ equals:nomCommercial, mode:'insensitive' } } });
    if (exists) return res.status(400).json({ error:'Ce médicament existe déjà.' });
    const med = await prisma.medicament.create({ data:{
      nomCommercial, dci,
      classeTherapeutique: classeTherapeutique||'Autre',
      forme:               forme||'Comprimé',
      dosage:              dosage||'',
      laboratoireFabricant:laboratoireFabricant||'',
      isActive:true,
    }});
    res.status(201).json(med);
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// PUT /api/admin/medicaments/:id
router.put('/medicaments/:id', async (req, res) => {
  try {
    const { nomCommercial, dci, classeTherapeutique, forme, dosage, laboratoireFabricant } = req.body;
    const med = await prisma.medicament.update({
      where:{ id:req.params.id },
      data:{ nomCommercial, dci, classeTherapeutique, forme, dosage, laboratoireFabricant },
    });
    res.json(med);
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// DELETE /api/admin/medicaments/:id
router.delete('/medicaments/:id', async (req, res) => {
  try {
    await prisma.medicament.update({ where:{ id:req.params.id }, data:{ isActive:false } });
    res.json({ message:'Médicament désactivé.' });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// ════════════════════════════════════════════════════════════
// EXAMENS — CRUD complet
// ════════════════════════════════════════════════════════════

router.get('/examens', async (req, res) => {
  try {
    const { search, categorie, page=1, limit=100 } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const where = { isActive:true };
    if (categorie) where.categorie = { contains:categorie, mode:'insensitive' };
    if (search)    where.OR = [
      { nom:        { contains:search, mode:'insensitive' } },
      { categorie:  { contains:search, mode:'insensitive' } },
      { codeAzamed: { contains:search, mode:'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      prisma.examen.findMany({ where, skip, take:parseInt(limit), orderBy:[{ categorie:'asc' },{ nom:'asc' }] }),
      prisma.examen.count({ where }),
    ]);
    res.json({ data, total, pages:Math.ceil(total/parseInt(limit)) });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.post('/examens', async (req, res) => {
  try {
    const { nom, codeAzamed, categorie, description } = req.body;
    if (!nom || !categorie) return res.status(400).json({ error:'Nom et catégorie requis.' });
    // Auto-générer le code si absent
    let code = codeAzamed;
    if (!code) {
      const prefix = categorie.substring(0,4).toUpperCase().replace(/[^A-Z]/g,'');
      const count  = await prisma.examen.count({ where:{ categorie } });
      code = `${prefix}-${String(count+1).padStart(3,'0')}`;
    }
    // Vérifier doublon code
    const exists = await prisma.examen.findFirst({ where:{ codeAzamed:code } });
    if (exists) code = `${code}-${Date.now().toString().slice(-4)}`;
    const ex = await prisma.examen.create({ data:{ nom, codeAzamed:code, categorie, description:description||null, isActive:true } });
    res.status(201).json(ex);
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.put('/examens/:id', async (req, res) => {
  try {
    const { nom, categorie, description } = req.body;
    const ex = await prisma.examen.update({ where:{ id:req.params.id }, data:{ nom, categorie, description:description||null } });
    res.json(ex);
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.delete('/examens/:id', async (req, res) => {
  try {
    await prisma.examen.update({ where:{ id:req.params.id }, data:{ isActive:false } });
    res.json({ message:'Examen désactivé.' });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// ════════════════════════════════════════════════════════════
// SERVICES MÉDICAUX — CRUD complet
// ════════════════════════════════════════════════════════════

router.get('/services', async (req, res) => {
  try {
    const { search, categorie, page=1, limit=100 } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const where = { isActive:true };
    if (categorie) where.categorie = { contains:categorie, mode:'insensitive' };
    if (search)    where.OR = [
      { nom:       { contains:search, mode:'insensitive' } },
      { categorie: { contains:search, mode:'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      prisma.serviceMedical.findMany({ where, skip, take:parseInt(limit), orderBy:[{ categorie:'asc' },{ nom:'asc' }] }),
      prisma.serviceMedical.count({ where }),
    ]);
    res.json({ data, total, pages:Math.ceil(total/parseInt(limit)) });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.post('/services', async (req, res) => {
  try {
    const { nom, categorie, description } = req.body;
    if (!nom || !categorie) return res.status(400).json({ error:'Nom et catégorie requis.' });
    const exists = await prisma.serviceMedical.findFirst({ where:{ nom:{ equals:nom, mode:'insensitive' } } });
    if (exists) return res.status(400).json({ error:'Ce service existe déjà.' });
    const sv = await prisma.serviceMedical.create({ data:{ nom, categorie, description:description||null, isActive:true } });
    res.status(201).json(sv);
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.put('/services/:id', async (req, res) => {
  try {
    const { nom, categorie, description } = req.body;
    const sv = await prisma.serviceMedical.update({ where:{ id:req.params.id }, data:{ nom, categorie, description:description||null } });
    res.json(sv);
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.delete('/services/:id', async (req, res) => {
  try {
    await prisma.serviceMedical.update({ where:{ id:req.params.id }, data:{ isActive:false } });
    res.json({ message:'Service désactivé.' });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// ════════════════════════════════════════════════════════════
// STRUCTURES
// ════════════════════════════════════════════════════════════

router.get('/structures', async (req, res) => {
  try {
    const { search, type, status, page=1, limit=15 } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const where = {};
    if (type)   where.typeStructure = type;
    if (status === 'non_verifie') { where.isVerified=false; where.isActive=true; }
    if (status === 'actif')       where.isActive=true;
    if (status === 'suspendu')    where.isActive=false;
    if (search) where.OR = [
      { nomCommercial: { contains:search, mode:'insensitive' } },
      { ville:         { contains:search, mode:'insensitive' } },
      { user: { email: { contains:search, mode:'insensitive' } } },
    ];
    const [data, total] = await Promise.all([
      prisma.structure.findMany({ where, skip, take:parseInt(limit), orderBy:{ createdAt:'desc' },
        include:{ user:{ select:{ email:true } }, abonnements:{ orderBy:{ createdAt:'desc' }, take:1 } },
      }),
      prisma.structure.count({ where }),
    ]);
    res.json({ data, pagination:{ total, page:parseInt(page), pages:Math.ceil(total/parseInt(limit)) } });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.put('/structures/:id/verifier', async (req, res) => {
  try {
    const structure = await prisma.structure.update({
      where:{ id:req.params.id }, data:{ isVerified:true }, include:{ user:true },
    });
    // Notification
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL, "titre" TEXT NOT NULL, "message" TEXT NOT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
      )
    `).catch(()=>{});
    await prisma.$executeRawUnsafe(
      `INSERT INTO "notifications" ("userId","type","titre","message") VALUES ($1,$2,$3,$4)`,
      structure.userId, 'VERIFICATION', '✅ Compte vérifié !',
      `Félicitations ! Votre établissement "${structure.nomCommercial}" est maintenant visible par tous les patients sur AZAMED.`
    ).catch(()=>{});
    res.json({ message:`${structure.nomCommercial} vérifiée et visible.`, structure });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.put('/structures/:id/suspendre', async (req, res) => {
  try {
    const cur = await prisma.structure.findUnique({ where:{ id:req.params.id } });
    const s   = await prisma.structure.update({ where:{ id:req.params.id }, data:{ isActive:!cur.isActive } });
    res.json({ message:`${s.nomCommercial} ${s.isActive?'réactivée':'suspendue'}.`, structure:s });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.delete('/structures/:id', async (req, res) => {
  try {
    const s = await prisma.structure.findUnique({ where:{ id:req.params.id }, include:{ user:true } });
    if (!s) return res.status(404).json({ error:'Structure introuvable.' });
    await prisma.$transaction([
      prisma.pharmacieMedicament.deleteMany({ where:{ pharmacieId:req.params.id } }),
      prisma.laboExamen.deleteMany({ where:{ laboId:req.params.id } }),
      prisma.hopitalService.deleteMany({ where:{ hopitalId:req.params.id } }),
      prisma.post.deleteMany({ where:{ structureId:req.params.id } }),
      prisma.abonnement.deleteMany({ where:{ structureId:req.params.id } }),
      prisma.structure.delete({ where:{ id:req.params.id } }),
      prisma.user.delete({ where:{ id:s.userId } }),
    ]);
    res.json({ message:`${s.nomCommercial} supprimée.` });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// ════════════════════════════════════════════════════════════
// POSTS
// ════════════════════════════════════════════════════════════
router.get('/posts', async (req, res) => {
  try {
    const { page=1, limit=20 } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.post.findMany({ where:{ isActive:true }, skip, take:parseInt(limit), orderBy:{ createdAt:'desc' },
        include:{ structure:{ select:{ nomCommercial:true, typeStructure:true, ville:true } } },
      }),
      prisma.post.count({ where:{ isActive:true } }),
    ]);
    res.json({ data, pagination:{ total, page:parseInt(page), pages:Math.ceil(total/parseInt(limit)) } });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    await prisma.post.update({ where:{ id:req.params.id }, data:{ isActive:false } });
    res.json({ message:'Publication supprimée.' });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// ════════════════════════════════════════════════════════════
// SEED CATALOGUE — route pour charger le catalogue depuis l'admin
// ════════════════════════════════════════════════════════════
router.post('/seed-catalogue', async (req, res) => {
  try {
    const { PrismaClient: PC } = require('@prisma/client');
    const p2 = new PC();

    // Charger le seed depuis le fichier
    const path = require('path');
    const seedPath = path.join(__dirname, '../prisma/seed-data.js');
    
    let result = { medicaments:0, examens:0, services:0 };
    
    if (require('fs').existsSync(seedPath)) {
      const { MEDICAMENTS, EXAMENS, SERVICES } = require(seedPath);
      
      for (const med of (MEDICAMENTS||[])) {
        const ex = await p2.medicament.findFirst({ where:{ nomCommercial:med.nomCommercial } });
        if (!ex) { await p2.medicament.create({ data:{ ...med, isActive:true } }); result.medicaments++; }
      }
      for (const ex of (EXAMENS||[])) {
        const found = await p2.examen.findFirst({ where:{ codeAzamed:ex.codeAzamed } });
        if (!found) { await p2.examen.create({ data:{ ...ex, isActive:true } }); result.examens++; }
      }
      for (const sv of (SERVICES||[])) {
        const found = await p2.serviceMedical.findFirst({ where:{ nom:sv.nom } });
        if (!found) { await p2.serviceMedical.create({ data:{ ...sv, isActive:true } }); result.services++; }
      }
    }
    
    await p2.$disconnect();
    res.json({ message:'Catalogue chargé avec succès.', result });
  } catch (err) {
    res.status(500).json({ error:err.message });
  }
});

module.exports = router;
