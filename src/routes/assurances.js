// src/routes/assurances.js — Gestion des assurances par structure
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');

const prisma = new PrismaClient();

// ─── GET /api/structures/:id/assurances ──────────────────────
router.get('/structures/:id/assurances', async (req, res) => {
  try {
    // Stocker dans un champ JSON ou une table dédiée
    // Ici on lit depuis la table Assurance si elle existe
    const data = await prisma.$queryRaw`
      SELECT * FROM "Assurance" WHERE "structureId" = ${req.params.id} ORDER BY "nom" ASC
    `.catch(() => []);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/structures/:id/assurances ─────────────────────
router.post('/structures/:id/assurances', protect, structureOnly, async (req, res) => {
  try {
    const { nom } = req.body;
    if (!nom) return res.status(400).json({ error: 'Nom requis.' });

    // Créer la table si elle n'existe pas
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Assurance" (
        "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "structureId" TEXT NOT NULL,
        "nom"         TEXT NOT NULL,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Assurance_pkey" PRIMARY KEY ("id")
      );
    `).catch(() => {});

    await prisma.$executeRawUnsafe(
      `INSERT INTO "Assurance" ("structureId","nom") VALUES ($1,$2)`,
      req.params.id, nom
    );

    res.status(201).json({ message: 'Assurance ajoutée.', nom });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/structures/:id/assurances/:assId ────────────
router.delete('/structures/:id/assurances/:assId', protect, structureOnly, async (req, res) => {
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Assurance" WHERE "id" = $1 AND "structureId" = $2`,
      req.params.assId, req.params.id
    );
    res.json({ message: 'Assurance retirée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
