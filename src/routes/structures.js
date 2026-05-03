// src/routes/structures.js — Structures vérifiées visibles avec toutes leurs infos
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { type, ville, search, page = 1, limit = 15 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { isActive: true, isVerified: true };
    if (type)   where.typeStructure = type;
    if (ville)  where.ville = { contains: ville, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { nomCommercial: { contains: search, mode: 'insensitive' } },
        { nomLegal:      { contains: search, mode: 'insensitive' } },
        { ville:         { contains: search, mode: 'insensitive' } },
        { description:   { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.structure.findMany({
        where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' },
        include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
      prisma.structure.count({ where }),
    ]);
    res.json({ data, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me/profil', protect, structureOnly, async (req, res) => {
  try {
    const structure = await prisma.structure.findUnique({
      where: { userId: req.user.id },
      include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!structure) return res.status(404).json({ error: 'Structure introuvable.' });
    res.json(structure);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const structure = await prisma.structure.findFirst({
      where: { id: req.params.id, isActive: true, isVerified: true },
      include: {
        abonnements:          { orderBy: { createdAt: 'desc' }, take: 1 },
        pharmacieMedicaments: { where: { enStock: true }, include: { medicament: true }, orderBy: { medicament: { nomCommercial: 'asc' } } },
        laboExamens:          { where: { disponible: true }, include: { examen: true }, orderBy: { examen: { nom: 'asc' } } },
        hopitalServices:      { where: { disponible: true }, include: { service: true }, orderBy: { service: { nom: 'asc' } } },
      },
    });
    if (!structure) return res.status(404).json({ error: 'Structure introuvable ou non vérifiée.' });
    await prisma.analyticsEvent.create({ data: { eventType: 'vue_profil', structureId: structure.id } }).catch(() => {});
    res.json(structure);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', protect, structureOnly, async (req, res) => {
  try {
    if (req.user.structure?.id !== req.params.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès non autorisé.' });
    }
    const { nomLegal, telephone, whatsapp, adresse, pays, ville, quartier, description, horaires, heureOuverture, heureFermeture, latitude, longitude } = req.body;
    const structure = await prisma.structure.update({
      where: { id: req.params.id },
      data: {
        nomLegal: nomLegal || undefined, telephone: telephone || undefined,
        whatsapp: whatsapp !== undefined ? whatsapp : undefined,
        adresse: adresse !== undefined ? adresse : undefined,
        pays: pays || undefined, ville: ville || undefined,
        quartier: quartier !== undefined ? quartier : undefined,
        description: description !== undefined ? description : undefined,
        horaires: horaires !== undefined ? horaires : undefined,
        heureOuverture: heureOuverture || undefined,
        heureFermeture: heureFermeture || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      },
    });
    res.json(structure);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
