// src/routes/notifications.js
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/auth');
const prisma = new PrismaClient();

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL, "type" TEXT NOT NULL,
      "titre" TEXT NOT NULL, "message" TEXT NOT NULL,
      "isRead" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});
}

router.get('/', protect, async (req, res) => {
  try {
    await ensureTable();
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "notifications" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 20`,
      req.user.id
    );
    const nonLues = rows.filter((n) => !n.isRead).length;
    res.json({ data: rows, nonLues });
  } catch { res.json({ data: [], nonLues: 0 }); }
});

router.put('/:id/lire', protect, async (req, res) => {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "notifications" SET "isRead" = true WHERE "id" = $1 AND "userId" = $2`,
      req.params.id, req.user.id
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/tout-lire', protect, async (req, res) => {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "notifications" SET "isRead" = true WHERE "userId" = $1`,
      req.user.id
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
