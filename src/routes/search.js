// src/routes/search.js — Retourne médicaments/examens/services AVEC PRIX (pas juste la structure)
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { q, ville, limit = 30 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ items: [], structures: [], total: 0 });
    }

    const search = q.trim();
    const lim    = parseInt(limit);

    // ── 1. Médicaments avec prix ──────────────────────────────
    const viaMeds = await prisma.pharmacieMedicament.findMany({
      where: {
        disponible: true,
        pharmacie: {
          isVerified: true, isActive: true,
          ...(ville ? { ville: { contains: ville, mode: 'insensitive' } } : {}),
        },
        medicament: {
          isActive: true,
          OR: [
            { nomCommercial:       { contains: search, mode: 'insensitive' } },
            { dci:                 { contains: search, mode: 'insensitive' } },
            { classeTherapeutique: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        pharmacie:  { select: { id:true, nomCommercial:true, ville:true, quartier:true, telephone:true } },
        medicament: { select: { id:true, nomCommercial:true, dci:true, forme:true, dosage:true, classeTherapeutique:true } },
      },
      take: 100,
    });

    // ── 2. Examens avec prix ──────────────────────────────────
    const viaExamens = await prisma.laboExamen.findMany({
      where: {
        disponible: true,
        labo: {
          isVerified: true, isActive: true,
          ...(ville ? { ville: { contains: ville, mode: 'insensitive' } } : {}),
        },
        examen: {
          isActive: true,
          OR: [
            { nom:        { contains: search, mode: 'insensitive' } },
            { categorie:  { contains: search, mode: 'insensitive' } },
            { codeAzamed: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        labo:   { select: { id:true, nomCommercial:true, ville:true, quartier:true, telephone:true } },
        examen: { select: { id:true, nom:true, categorie:true, codeAzamed:true } },
      },
      take: 100,
    });

    // ── 3. Services avec prix ─────────────────────────────────
    const viaServices = await prisma.hopitalService.findMany({
      where: {
        disponible: true,
        hopital: {
          isVerified: true, isActive: true,
          ...(ville ? { ville: { contains: ville, mode: 'insensitive' } } : {}),
        },
        service: {
          isActive: true,
          OR: [
            { nom:       { contains: search, mode: 'insensitive' } },
            { categorie: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        hopital: { select: { id:true, nomCommercial:true, ville:true, quartier:true, telephone:true } },
        service: { select: { id:true, nom:true, categorie:true } },
      },
      take: 100,
    });

    // ── 4. Regrouper par item (médicament/examen/service) ─────
    // Chaque item regroupe toutes les structures qui le proposent, avec leur prix.
    const medsMap = new Map();
    for (const pm of viaMeds) {
      const key = pm.medicament.id;
      if (!medsMap.has(key)) {
        medsMap.set(key, {
          id: pm.medicament.id,
          type: 'medicament',
          nom: pm.medicament.nomCommercial,
          dci: pm.medicament.dci,
          sousTitre: [pm.medicament.forme, pm.medicament.dosage].filter(Boolean).join(' · '),
          categorie: pm.medicament.classeTherapeutique,
          prix: [],
        });
      }
      medsMap.get(key).prix.push({
        structureId: pm.pharmacie.id,
        structureNom: pm.pharmacie.nomCommercial,
        ville: pm.pharmacie.ville,
        quartier: pm.pharmacie.quartier,
        telephone: pm.pharmacie.telephone,
        prix: pm.prix ? Number(pm.prix) : 0,
        enStock: pm.enStock,
      });
    }

    const examensMap = new Map();
    for (const le of viaExamens) {
      const key = le.examen.id;
      if (!examensMap.has(key)) {
        examensMap.set(key, {
          id: le.examen.id,
          type: 'examen',
          nom: le.examen.nom,
          sousTitre: le.examen.codeAzamed,
          categorie: le.examen.categorie,
          prix: [],
        });
      }
      examensMap.get(key).prix.push({
        structureId: le.labo.id,
        structureNom: le.labo.nomCommercial,
        ville: le.labo.ville,
        quartier: le.labo.quartier,
        telephone: le.labo.telephone,
        prix: le.prix ? Number(le.prix) : 0,
        delaiMax: le.delaiMax,
      });
    }

    const servicesMap = new Map();
    for (const hs of viaServices) {
      const key = hs.service.id;
      if (!servicesMap.has(key)) {
        servicesMap.set(key, {
          id: hs.service.id,
          type: 'service',
          nom: hs.service.nom,
          categorie: hs.service.categorie,
          prix: [],
        });
      }
      servicesMap.get(key).prix.push({
        structureId: hs.hopital.id,
        structureNom: hs.hopital.nomCommercial,
        ville: hs.hopital.ville,
        quartier: hs.hopital.quartier,
        telephone: hs.hopital.telephone,
        prix: hs.prixConsultation ? Number(hs.prixConsultation) : 0,
        modeConsultation: hs.modeConsultation,
      });
    }

    // ── 5. Recherche directe structures (nom, ville, etc.) ────
    const byNom = await prisma.structure.findMany({
      where: {
        isVerified: true, isActive: true,
        OR: [
          { nomCommercial: { contains: search, mode: 'insensitive' } },
          { ville:         { contains: search, mode: 'insensitive' } },
          { quartier:      { contains: search, mode: 'insensitive' } },
          { adresse:       { contains: search, mode: 'insensitive' } },
        ],
        ...(ville ? { ville: { contains: ville, mode: 'insensitive' } } : {}),
      },
      take: lim,
      orderBy: { nomCommercial: 'asc' },
      include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    // ── Fusion items (triés par nombre d'établissements desc) ─
    const items = [
      ...Array.from(medsMap.values()),
      ...Array.from(examensMap.values()),
      ...Array.from(servicesMap.values()),
    ]
      .map((it) => ({ ...it, prix: it.prix.sort((a,b) => (a.prix||999999) - (b.prix||999999)) }))
      .sort((a,b) => b.prix.length - a.prix.length)
      .slice(0, lim);

    res.json({
      items,
      structures: byNom,
      total: items.length + byNom.length,
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
