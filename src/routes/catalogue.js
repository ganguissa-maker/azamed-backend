// src/routes/catalogue.js — Routes PUBLIQUES catalogue (sans auth admin)
// Accessible par les structures authentifiées pour voir les médicaments/examens/services
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/catalogue/medicaments
router.get('/medicaments', async (req, res) => {
  try {
    const { search, classe, limit = 300, page = 1 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = { isActive: true };
    if (classe)  where.classeTherapeutique = { contains: classe,  mode: 'insensitive' };
    if (search)  where.OR = [
      { nomCommercial:       { contains: search, mode: 'insensitive' } },
      { dci:                 { contains: search, mode: 'insensitive' } },
      { classeTherapeutique: { contains: search, mode: 'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      prisma.medicament.findMany({ where, skip, take: parseInt(limit), orderBy: [{ classeTherapeutique:'asc' }, { nomCommercial:'asc' }] }),
      prisma.medicament.count({ where }),
    ]);
    res.json({ data, total, pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/catalogue/examens
router.get('/examens', async (req, res) => {
  try {
    const { search, categorie, limit = 300, page = 1 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = { isActive: true };
    if (categorie) where.categorie = { contains: categorie, mode: 'insensitive' };
    if (search)    where.OR = [
      { nom:       { contains: search, mode: 'insensitive' } },
      { categorie: { contains: search, mode: 'insensitive' } },
      { codeAzamed:{ contains: search, mode: 'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      prisma.examen.findMany({ where, skip, take: parseInt(limit), orderBy: [{ categorie:'asc' }, { nom:'asc' }] }),
      prisma.examen.count({ where }),
    ]);
    res.json({ data, total, pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/catalogue/services
router.get('/services', async (req, res) => {
  try {
    const { search, categorie, limit = 300, page = 1 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = { isActive: true };
    if (categorie) where.categorie = { contains: categorie, mode: 'insensitive' };
    if (search)    where.OR = [
      { nom:       { contains: search, mode: 'insensitive' } },
      { categorie: { contains: search, mode: 'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      prisma.serviceMedical.findMany({ where, skip, take: parseInt(limit), orderBy: [{ categorie:'asc' }, { nom:'asc' }] }),
      prisma.serviceMedical.count({ where }),
    ]);
    res.json({ data, total, pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
