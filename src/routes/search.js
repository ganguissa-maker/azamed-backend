// src/routes/search.js — Recherche corrigée : trouve médicaments, examens, services, établissements
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/search?q=...
router.get('/', async (req, res) => {
  try {
    const { q, ville, limit = 30 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ structures: [], total: 0 });
    }

    const search = q.trim();
    const lim    = parseInt(limit);

    // ── 1. Recherche directe dans les structures ─────────────
    const byNom = await prisma.structure.findMany({
      where: {
        isVerified: true,
        isActive:   true,
        OR: [
          { nomCommercial:  { contains: search, mode: 'insensitive' } },
          { ville:          { contains: search, mode: 'insensitive' } },
          { quartier:       { contains: search, mode: 'insensitive' } },
          { adresse:        { contains: search, mode: 'insensitive' } },
          { description:    { contains: search, mode: 'insensitive' } },
        ],
        ...(ville ? { ville: { contains: ville, mode: 'insensitive' } } : {}),
      },
      take: lim,
      orderBy: { nomCommercial: 'asc' },
      include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    // ── 2. Recherche via médicaments ─────────────────────────
    const viaMeds = await prisma.pharmacieMedicament.findMany({
      where: {
        disponible: true,
        pharmacie:  { isVerified: true, isActive: true },
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
        pharmacie:  { include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } } },
        medicament: { select: { nomCommercial: true, dci: true } },
      },
      take: 20,
    });

    // ── 3. Recherche via examens ─────────────────────────────
    const viaExamens = await prisma.laboExamen.findMany({
      where: {
        disponible: true,
        labo:   { isVerified: true, isActive: true },
        examen: {
          isActive: true,
          OR: [
            { nom:       { contains: search, mode: 'insensitive' } },
            { categorie: { contains: search, mode: 'insensitive' } },
            { codeAzamed:{ contains: search, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        labo:  { include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } } },
        examen:{ select: { nom: true, categorie: true } },
      },
      take: 20,
    });

    // ── 4. Recherche via services ────────────────────────────
    const viaServices = await prisma.hopitalService.findMany({
      where: {
        disponible: true,
        hopital:  { isVerified: true, isActive: true },
        service:  {
          isActive: true,
          OR: [
            { nom:       { contains: search, mode: 'insensitive' } },
            { categorie: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        hopital:{ include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } } },
        service:{ select: { nom: true, categorie: true } },
      },
      take: 20,
    });

    // ── Fusion et déduplication ──────────────────────────────
    const seen = new Set(byNom.map((s) => s.id));
    const all  = [...byNom];

    for (const pm of viaMeds) {
      if (!seen.has(pm.pharmacie.id)) {
        seen.add(pm.pharmacie.id);
        all.push({
          ...pm.pharmacie,
          _matchType:  'medicament',
          _matchLabel: pm.medicament.nomCommercial,
        });
      }
    }

    for (const le of viaExamens) {
      if (!seen.has(le.labo.id)) {
        seen.add(le.labo.id);
        all.push({
          ...le.labo,
          _matchType:  'examen',
          _matchLabel: le.examen.nom,
        });
      }
    }

    for (const hs of viaServices) {
      if (!seen.has(hs.hopital.id)) {
        seen.add(hs.hopital.id);
        all.push({
          ...hs.hopital,
          _matchType:  'service',
          _matchLabel: hs.service.nom,
        });
      }
    }

    res.json({ structures: all.slice(0, lim), total: all.length });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
