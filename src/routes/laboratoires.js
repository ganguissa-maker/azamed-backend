// src/routes/laboratoires.js — Quote-part visible uniquement par les médecins
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

// ✅ Authentification optionnelle : ne bloque jamais la requête, mais si un
// token valide de médecin est présent, req.isMedecin est mis à true.
// Permet de garder la route /laboratoires publique tout en personnalisant
// la réponse pour les médecins connectés (affichage de la quote-part).
async function optionalMedecinAuth(req, res, next) {
  req.isMedecin = false;
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token   = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (user && user.role === 'MEDECIN' && user.isActive) {
        req.isMedecin = true;
      }
    }
  } catch {
    // Token absent/invalide/expiré : on continue simplement sans privilège médecin
  }
  next();
}

// ✅ Retire les champs quote-part d'une structure si le visiteur n'est pas médecin
function filtrerQuotePart(structure, isMedecin) {
  if (isMedecin) return structure;
  const { offresQuotePart, quotePartPourcentage, ...rest } = structure;
  return rest;
}

// GET /api/laboratoires — liste publique (quote-part visible UNIQUEMENT pour les médecins)
router.get('/', optionalMedecinAuth, async (req, res) => {
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
    const [rawData, total] = await Promise.all([
      prisma.structure.findMany({ where, skip, take:parseInt(limit), orderBy:{ nomCommercial:'asc' },
        include:{ abonnements:{ orderBy:{ createdAt:'desc' }, take:1 } } }),
      prisma.structure.count({ where }),
    ]);

    // ✅ Récupère offresQuotePart/quotePartPourcentage (colonnes hors schema Prisma standard)
    let quotePartMap = {};
    if (req.isMedecin && rawData.length > 0) {
      try {
        const ids = rawData.map((s) => s.id);
        const rows = await prisma.$queryRawUnsafe(
          `SELECT id, "offresQuotePart", "quotePartPourcentage" FROM "structures" WHERE id = ANY($1::text[])`,
          ids
        );
        rows.forEach((r) => { quotePartMap[r.id] = r; });
      } catch {}
    }

    const data = rawData.map((s) => {
      const enrichie = req.isMedecin
        ? { ...s, offresQuotePart: quotePartMap[s.id]?.offresQuotePart || false,
            quotePartPourcentage: quotePartMap[s.id]?.quotePartPourcentage ?? null }
        : s;
      return filtrerQuotePart(enrichie, req.isMedecin);
    });

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
