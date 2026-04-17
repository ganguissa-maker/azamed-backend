// src/routes/search.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── GET /api/search?q=paracetamol&ville=Abidjan ──────────────
// Recherche globale unifiée (médicaments + examens + services + structures)
router.get('/', async (req, res) => {
  try {
    const { q, ville, pays, page = 1, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Requête trop courte (min. 2 caractères).' });
    }

    const query = q.trim();
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const locFilter = {};
    if (ville) locFilter.ville = { contains: ville, mode: 'insensitive' };
    if (pays) locFilter.pays = { contains: pays, mode: 'insensitive' };

    // Recherches parallèles pour performance
    const [medicaments, examens, services, structures] = await Promise.all([
      // Médicaments dispo en pharmacie
      prisma.pharmacieMedicament.findMany({
        where: {
          disponible: true,
          enStock: true,
          medicament: {
            OR: [
              { nomCommercial: { contains: query, mode: 'insensitive' } },
              { dci: { contains: query, mode: 'insensitive' } },
              { classeTherapeutique: { contains: query, mode: 'insensitive' } },
            ],
          },
          pharmacie: { isActive: true, typeStructure: 'PHARMACIE', ...locFilter },
        },
        include: {
          medicament: true,
          pharmacie: {
            select: { id: true, nomCommercial: true, ville: true, telephone: true, logoUrl: true },
          },
        },
        take: parseInt(limit),
        orderBy: { prix: 'asc' },
      }),

      // Examens disponibles en labo
      prisma.laboExamen.findMany({
        where: {
          disponible: true,
          examen: {
            OR: [
              { nom: { contains: query, mode: 'insensitive' } },
              { categorie: { contains: query, mode: 'insensitive' } },
              { codeAzamed: { contains: query, mode: 'insensitive' } },
            ],
          },
          labo: { isActive: true, typeStructure: 'LABORATOIRE', ...locFilter },
        },
        include: {
          examen: true,
          labo: {
            select: { id: true, nomCommercial: true, ville: true, telephone: true, logoUrl: true },
          },
        },
        take: parseInt(limit),
        orderBy: { prix: 'asc' },
      }),

      // Services hospitaliers
      prisma.hopitalService.findMany({
        where: {
          disponible: true,
          service: {
            OR: [
              { nom: { contains: query, mode: 'insensitive' } },
              { categorie: { contains: query, mode: 'insensitive' } },
            ],
          },
          hopital: { isActive: true, ...locFilter },
        },
        include: {
          service: true,
          hopital: {
            select: {
              id: true, nomCommercial: true, typeStructure: true,
              ville: true, telephone: true, logoUrl: true,
              abonnements: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
          },
        },
        take: parseInt(limit),
      }),

      // Structures par nom
      prisma.structure.findMany({
        where: {
          isActive: true,
          ...locFilter,
          OR: [
            { nomCommercial: { contains: query, mode: 'insensitive' } },
            { nomLegal: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          abonnements: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        take: parseInt(limit),
      }),
    ]);

    // Enregistrer dans l'historique
    await prisma.historiqueRecherche.create({
      data: { query, type: 'global' },
    }).catch(() => {}); // silencieux si erreur

    const total =
      medicaments.length + examens.length + services.length + structures.length;

    res.json({
      query,
      total,
      resultats: {
        medicaments: medicaments.map((m) => ({
          type: 'medicament',
          id: m.medicament.id,
          titre: m.medicament.nomCommercial,
          sous_titre: m.medicament.dci,
          prix: m.prix,
          disponible: m.disponible,
          structure: m.pharmacie,
        })),
        examens: examens.map((e) => ({
          type: 'examen',
          id: e.examen.id,
          titre: e.examen.nom,
          sous_titre: e.examen.categorie,
          prix: e.prix,
          delaiMin: e.delaiMin,
          delaiMax: e.delaiMax,
          structure: e.labo,
        })),
        services: services.map((s) => ({
          type: 'service',
          id: s.service.id,
          titre: s.service.nom,
          sous_titre: s.service.categorie,
          prixConsultation: s.prixConsultation,
          surRdv: s.surRdv,
          structure: {
            ...s.hopital,
            niveauAbonnement: s.hopital.abonnements[0]?.niveau || 'BASIC',
          },
        })),
        structures: structures.map((s) => ({
          type: 'structure',
          id: s.id,
          titre: s.nomCommercial,
          sous_titre: s.typeStructure,
          ville: s.ville,
          telephone: s.telephone,
          logoUrl: s.logoUrl,
          niveauAbonnement: s.abonnements[0]?.niveau || 'BASIC',
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de recherche.' });
  }
});

// ─── GET /api/search/suggestions?q=par ───────────────────────
// Suggestions autocomplete
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const [medicaments, examens, services, structures] = await Promise.all([
      prisma.medicament.findMany({
        where: {
          OR: [
            { nomCommercial: { contains: q, mode: 'insensitive' } },
            { dci: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { nomCommercial: true, dci: true },
        take: 3,
      }),
      prisma.examen.findMany({
        where: { nom: { contains: q, mode: 'insensitive' } },
        select: { nom: true, categorie: true },
        take: 3,
      }),
      prisma.serviceMedical.findMany({
        where: { nom: { contains: q, mode: 'insensitive' } },
        select: { nom: true, categorie: true },
        take: 2,
      }),
      prisma.structure.findMany({
        where: {
          isActive: true,
          nomCommercial: { contains: q, mode: 'insensitive' },
        },
        select: { nomCommercial: true, typeStructure: true },
        take: 3,
      }),
    ]);

    const suggestions = [
      ...medicaments.map((m) => ({ label: m.nomCommercial, type: 'medicament', detail: m.dci })),
      ...examens.map((e) => ({ label: e.nom, type: 'examen', detail: e.categorie })),
      ...services.map((s) => ({ label: s.nom, type: 'service', detail: s.categorie })),
      ...structures.map((s) => ({ label: s.nomCommercial, type: 'structure', detail: s.typeStructure })),
    ];

    res.json(suggestions.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: 'Erreur suggestions.' });
  }
});

module.exports = router;
