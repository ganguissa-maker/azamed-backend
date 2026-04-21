// src/routes/users.js — Complet avec route médecins publics
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/auth');

const prisma = new PrismaClient();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ─── POST /api/users/register ────────────────────────────────
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe : minimum 6 caractères'),
  body('prenom').notEmpty().withMessage('Prénom requis'),
  body('nom').notEmpty().withMessage('Nom requis'),
  body('typeCompte').isIn(['UTILISATEUR', 'MEDECIN']).withMessage('Type de compte invalide'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const {
    email, password, prenom, nom, typeCompte,
    telephone, whatsapp, ville, pays,
    specialite, numeroOrdre, lieuExercice,
  } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé.' });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role:       typeCompte === 'MEDECIN' ? 'MEDECIN' : 'UTILISATEUR',
        isVerified: false,
        isActive:   true,
      },
    });

    // Créer le profil
    await prisma.$executeRawUnsafe(`
      INSERT INTO "ProfilUtilisateur"
        ("id","userId","prenom","nom","telephone","whatsapp","ville","pays","typeCompte","specialite","numeroOrdre","lieuExercice","createdAt","updatedAt")
      VALUES
        (gen_random_uuid()::text,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
      ON CONFLICT ("userId") DO NOTHING
    `,
      user.id, prenom, nom,
      telephone || null, whatsapp || null,
      ville || null, pays || 'Cameroun',
      typeCompte,
      typeCompte === 'MEDECIN' ? (specialite || null) : null,
      typeCompte === 'MEDECIN' ? (numeroOrdre || null) : null,
      typeCompte === 'MEDECIN' ? (lieuExercice || null) : null,
    ).catch(async () => {
      // Fallback si table n'existe pas encore
      await setupTable();
    });

    let profil = null;
    try {
      const rows = await prisma.$queryRaw`SELECT * FROM "ProfilUtilisateur" WHERE "userId"=${user.id}`;
      profil = rows[0] || null;
    } catch {}

    const token = generateToken(user.id);
    res.status(201).json({
      message: 'Compte créé avec succès !',
      token,
      user: { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified, profil },
    });
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email déjà utilisé.' });
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/users/login ───────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !['UTILISATEUR', 'MEDECIN'].includes(user.role)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }
    if (!user.isActive) return res.status(401).json({ error: 'Compte désactivé. Contactez contactazamed@gmail.com' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

    let profil = null;
    try {
      const rows = await prisma.$queryRaw`SELECT * FROM "ProfilUtilisateur" WHERE "userId"=${user.id}`;
      profil = rows[0] || null;
    } catch {}

    const token = generateToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified, profil } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/users/me ───────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    let profil = null;
    try {
      const rows = await prisma.$queryRaw`SELECT * FROM "ProfilUtilisateur" WHERE "userId"=${user.id}`;
      profil = rows[0] || null;
    } catch {}
    res.json({ id: user.id, email: user.email, role: user.role, isVerified: user.isVerified, profil });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/users/medecins — LISTE PUBLIQUE médecins vérifiés ──
router.get('/medecins', async (req, res) => {
  try {
    const { search, specialite, ville, page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer tous les médecins vérifiés
    const whereUser = { role: 'MEDECIN', isVerified: true, isActive: true };

    const users = await prisma.user.findMany({
      where: whereUser,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, isVerified: true },
    });

    const total = await prisma.user.count({ where: whereUser });

    // Enrichir avec profils
    const enriched = await Promise.all(users.map(async (u) => {
      let profil = null;
      try {
        const rows = await prisma.$queryRaw`SELECT * FROM "ProfilUtilisateur" WHERE "userId"=${u.id}`;
        profil = rows[0] || null;
      } catch {}
      return { ...u, profil };
    }));

    // Filtrer par spécialité et ville
    let filtered = enriched;
    if (specialite) {
      filtered = filtered.filter((m) =>
        m.profil?.specialite?.toLowerCase().includes(specialite.toLowerCase())
      );
    }
    if (ville) {
      filtered = filtered.filter((m) =>
        m.profil?.ville?.toLowerCase().includes(ville.toLowerCase())
      );
    }
    if (search) {
      filtered = filtered.filter((m) =>
        `${m.profil?.prenom} ${m.profil?.nom}`.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({
      data: filtered,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    console.error('Medecins error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/users/stats ────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [total, medecins, utilisateurs] = await Promise.all([
      prisma.user.count({ where: { role: { in: ['UTILISATEUR','MEDECIN'] }, isActive: true } }),
      prisma.user.count({ where: { role: 'MEDECIN', isActive: true } }),
      prisma.user.count({ where: { role: 'UTILISATEUR', isActive: true } }),
    ]);
    res.json({ total, medecins, utilisateurs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/users/setup ────────────────────────────────────
// Créer la table ProfilUtilisateur si elle n'existe pas
async function setupTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProfilUtilisateur" (
      "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId"       TEXT NOT NULL UNIQUE,
      "prenom"       TEXT NOT NULL DEFAULT '',
      "nom"          TEXT NOT NULL DEFAULT '',
      "telephone"    TEXT,
      "whatsapp"     TEXT,
      "ville"        TEXT,
      "pays"         TEXT DEFAULT 'Cameroun',
      "typeCompte"   TEXT NOT NULL DEFAULT 'UTILISATEUR',
      "specialite"   TEXT,
      "numeroOrdre"  TEXT,
      "lieuExercice" TEXT,
      "avatarUrl"    TEXT,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProfilUtilisateur_pkey" PRIMARY KEY ("id")
    );
  `);
}

router.get('/setup', async (req, res) => {
  try {
    await setupTable();
    // Ajouter colonnes imageUrl et videoUrl aux posts si manquantes
    await prisma.$executeRawUnsafe(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT`).catch(() => {});
    // Ajouter roles si manquants dans l'enum
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MEDECIN'`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'UTILISATEUR'`).catch(() => {});
    res.json({ ok: true, message: 'Setup effectué avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
