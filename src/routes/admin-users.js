// src/routes/admin-users.js — Patients + Médecins + Délégués (web et mobile = même table users)
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, adminOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

router.use(protect, adminOnly);

async function ensureProfilTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "profils_utilisateurs" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL UNIQUE,
      "prenom" TEXT, "nom" TEXT, "ville" TEXT, "telephone" TEXT,
      "specialite" TEXT, "numeroOrdre" TEXT, "lieuExercice" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "profils_utilisateurs_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "profils_delegues" (
      "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId"         TEXT NOT NULL UNIQUE,
      "prenom"         TEXT,
      "nom"            TEXT,
      "telephone"      TEXT,
      "ville"          TEXT,
      "nomLaboratoire" TEXT,
      "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "profils_delegues_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});
}

// ── GET /api/admin/users — liste paginée (PATIENT + MEDECIN + DELEGUE) ──
router.get('/', async (req, res) => {
  try {
    await ensureProfilTable();
    const { search, role, isVerified, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ✅ Note : la table "users" est UNIQUE et partagée entre le site public,
    // le site structures, l'application mobile et l'espace délégué.
    // DELEGUE est maintenant inclus dans la liste par défaut.
    const where = {
      role: role ? role : { in: ['PATIENT', 'MEDECIN', 'DELEGUE'] },
    };
    if (isVerified === 'true')  where.isVerified = true;
    if (isVerified === 'false') where.isVerified = false;

    const users = await prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: { id:true, email:true, role:true, isVerified:true, isActive:true, createdAt:true },
    });

    const total = await prisma.user.count({ where });

    let profilsUtilisateurs = [];
    let profilsDelegues     = [];
    try {
      profilsUtilisateurs = await prisma.$queryRawUnsafe(
        `SELECT * FROM "profils_utilisateurs" WHERE "userId" = ANY($1::text[])`,
        users.map((u) => u.id)
      );
    } catch {}
    try {
      profilsDelegues = await prisma.$queryRawUnsafe(
        `SELECT * FROM "profils_delegues" WHERE "userId" = ANY($1::text[])`,
        users.map((u) => u.id)
      );
    } catch {}

    let data = users.map((u) => {
      if (u.role === 'DELEGUE') {
        const p = profilsDelegues.find((p) => p.userId === u.id) || {};
        return { ...u, profil: { ...p, specialite: p.nomLaboratoire } }; // pour affichage générique
      }
      return { ...u, profil: profilsUtilisateurs.find((p) => p.userId === u.id) || {} };
    });

    if (search) {
      const s = search.toLowerCase();
      data = data.filter((u) =>
        u.email.toLowerCase().includes(s) ||
        u.profil?.prenom?.toLowerCase().includes(s) ||
        u.profil?.nom?.toLowerCase().includes(s) ||
        u.profil?.ville?.toLowerCase().includes(s) ||
        u.profil?.specialite?.toLowerCase().includes(s) ||
        u.profil?.nomLaboratoire?.toLowerCase().includes(s)
      );
    }

    res.json({ data, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    console.error('admin-users GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/users/stats ─────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [total, patients, medecins, delegues, nonVerifies] = await Promise.all([
      prisma.user.count({ where: { role: { in: ['PATIENT','MEDECIN','DELEGUE'] } } }),
      prisma.user.count({ where: { role: 'PATIENT' } }),
      prisma.user.count({ where: { role: 'MEDECIN' } }),
      prisma.user.count({ where: { role: 'DELEGUE' } }),
      prisma.user.count({ where: { role: 'MEDECIN', isVerified: false } }),
    ]);
    res.json({ total, patients, medecins, delegues, nonVerifies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/users/:id/verifier — vérifier un médecin ────
router.put('/:id/verifier', async (req, res) => {
  try {
    const { isVerified } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data:  { isVerified: !!isVerified },
      select: { id:true, email:true, role:true, isVerified:true },
    });

    if (isVerified && user.role === 'MEDECIN') {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "notifications_consult" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "userId" TEXT NOT NULL, "type" TEXT NOT NULL,
          "titre" TEXT NOT NULL, "message" TEXT NOT NULL,
          "data" TEXT, "isRead" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "notifications_consult_pkey" PRIMARY KEY ("id")
        )
      `).catch(() => {});

      await prisma.$executeRawUnsafe(
        `INSERT INTO "notifications_consult" ("userId","type","titre","message") VALUES ($1,$2,$3,$4)`,
        user.id, 'VERIFICATION_MEDECIN',
        '✅ Profil médecin vérifié !',
        'Félicitations ! Votre profil médecin a été vérifié par l\'équipe AZAMED. Vous êtes maintenant visible pour les patients (site public et application mobile).'
      ).catch(() => {});
    }

    res.json({ message: isVerified ? 'Médecin vérifié.' : 'Vérification retirée.', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/users/:id/activer ────────────────────────────
router.put('/:id/activer', async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data:  { isActive: !!isActive },
      select: { id:true, email:true, role:true, isActive:true },
    });
    res.json({ message: isActive ? 'Compte réactivé.' : 'Compte suspendu.', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/users/:id ─────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id:true, email:true, role:true },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    if (user.role === 'ADMIN') return res.status(403).json({ error: 'Impossible de supprimer un admin.' });

    await prisma.$executeRawUnsafe(`DELETE FROM "profils_utilisateurs" WHERE "userId" = $1`, user.id).catch(() => {});
    await prisma.$executeRawUnsafe(`DELETE FROM "consultations" WHERE "patientId" = $1 OR "medecinId" = $1`, user.id).catch(() => {});
    await prisma.$executeRawUnsafe(`DELETE FROM "notifications_consult" WHERE "userId" = $1`, user.id).catch(() => {});

    await prisma.user.delete({ where: { id: user.id } });
    res.json({ message: `Compte de ${user.email} supprimé.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
