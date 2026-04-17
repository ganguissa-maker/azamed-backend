// src/routes/analytics.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── POST /api/analytics/event — Enregistrer un événement ────
router.post('/event', async (req, res) => {
  try {
    const { structureId, eventType } = req.body;
    // eventTypes: vue_profil, clic_whatsapp, clic_appel, vue_carte

    if (!eventType) return res.status(400).json({ error: 'eventType requis.' });

    await prisma.analyticsEvent.create({
      data: {
        structureId,
        eventType,
        userIp: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur.' });
  }
});

module.exports = router;
