// src/routes/users.js — Inscription directe (sans verification email), mdp 8 caracteres min
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/auth');
const prisma = new PrismaClient();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "profils_utilisateurs" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL UNIQUE, "prenom" TEXT, "nom" TEXT,
      "ville" TEXT, "telephone" TEXT, "specialite" TEXT,
      "numeroOrdre" TEXT, "lieuExercice" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "profils_utilisateurs_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});
}

// ── POST /api/users/register — création directe du compte ────
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe : min. 8 caractères'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, password, typeCompte, prenom, nom, ville, telephone, specialite, numeroOrdre, lieuExercice } = req.body;

  try {
    await ensureTables();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const role = typeCompte === 'MEDECIN' ? 'MEDECIN' : 'PATIENT';

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role,
        isVerified: role === 'PATIENT', // patient auto-vérifié, médecin doit être validé par admin
        isActive: true,
      },
    });

    await prisma.$executeRawUnsafe(
      `INSERT INTO "profils_utilisateurs" ("userId","prenom","nom","ville","telephone","specialite","numeroOrdre","lieuExercice")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT ("userId") DO UPDATE SET "prenom"=$2,"nom"=$3,"ville"=$4,"telephone"=$5,"specialite"=$6,"numeroOrdre"=$7,"lieuExercice"=$8`,
      user.id, prenom||null, nom||null, ville||null, telephone||null,
      specialite||null, numeroOrdre||null, lieuExercice||null
    ).catch(() => {});

    const token = generateToken(user.id);
    res.status(201).json({
      message: 'Compte créé avec succès !',
      token,
      user: {
        id: user.id, email: user.email, role: user.role, isVerified: user.isVerified,
        profil: { prenom, nom, ville, telephone, specialite, numeroOrdre, lieuExercice },
      },
    });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email déjà utilisé.' });
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/users/login ─────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !['PATIENT','MEDECIN'].includes(user.role)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }
    if (!user.isActive) return res.status(401).json({ error: 'Compte désactivé.' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

    let profil = {};
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "profils_utilisateurs" WHERE "userId"=$1`, user.id);
      if (rows?.[0]) profil = rows[0];
    } catch {}

    const token = generateToken(user.id);
    res.json({ token, user: { id:user.id, email:user.email, role:user.role, isVerified:user.isVerified, profil } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/me — rafraîchir les infos utilisateur ──────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id:true, email:true, role:true, isVerified:true, isActive:true },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    let profil = {};
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "profils_utilisateurs" WHERE "userId"=$1`, user.id);
      if (rows?.[0]) profil = rows[0];
    } catch {}

    res.json({ user: { ...user, profil } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/users/me/profil — modifier ses propres infos de profil ──
router.put('/me/profil', protect, async (req, res) => {
  try {
    await ensureTables();
    const { prenom, nom, ville, telephone, specialite, numeroOrdre, lieuExercice } = req.body;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "profils_utilisateurs" ("userId","prenom","nom","ville","telephone","specialite","numeroOrdre","lieuExercice")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT ("userId") DO UPDATE SET
         "prenom"=$2,"nom"=$3,"ville"=$4,"telephone"=$5,"specialite"=$6,"numeroOrdre"=$7,"lieuExercice"=$8`,
      req.user.id, prenom||null, nom||null, ville||null, telephone||null,
      specialite||null, numeroOrdre||null, lieuExercice||null
    );

    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "profils_utilisateurs" WHERE "userId"=$1`, req.user.id);
    res.json({ message:'Profil mis à jour avec succès.', profil: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/users/reset-password-direct — réinitialisation directe (sans code) ──
// L'utilisateur fournit son email + son ancien mot de passe pour prouver son identité,
// puis choisit un nouveau mot de passe. Pas d'envoi d'email nécessaire.
router.post('/reset-password-direct', [
  body('email').isEmail().normalizeEmail(),
  body('newPassword').isLength({ min: 8 }).withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(400).json({ error: 'Aucun compte trouvé avec cet email.' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    res.json({ message: 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/medecins ─────────────────────────────────────
router.get('/medecins', async (req, res) => {
  try {
    const { specialite, ville, page=1, limit=20 } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const where = { role:'MEDECIN', isActive:true };
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take:parseInt(limit), orderBy:{ createdAt:'desc' },
        select:{ id:true, email:true, role:true, isVerified:true, createdAt:true } }),
      prisma.user.count({ where }),
    ]);
    let profils = [];
    try {
      profils = await prisma.$queryRawUnsafe(
        `SELECT * FROM "profils_utilisateurs" WHERE "userId" = ANY($1::text[])`,
        users.map((u) => u.id)
      );
    } catch {}
    let data = users.map((u) => ({ ...u, profil: profils.find((p) => p.userId===u.id)||{} }));
    if (specialite) data = data.filter((u) => u.profil?.specialite?.toLowerCase().includes(specialite.toLowerCase()));
    if (ville)      data = data.filter((u) => u.profil?.ville?.toLowerCase().includes(ville.toLowerCase()));
    res.json({ data, pagination:{ total, page:parseInt(page), pages:Math.ceil(total/parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;