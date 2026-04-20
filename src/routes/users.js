// src/routes/users.js — Inscription/Connexion utilisateurs publics
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
    telephone, ville, pays,
    specialite, numeroOrdre, lieuExercice,
  } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé.' });

    const passwordHash = await bcrypt.hash(password, 12);

    // Créer l'utilisateur avec son profil
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: typeCompte === 'MEDECIN' ? 'MEDECIN' : 'UTILISATEUR',
        isVerified: false,
        isActive: true,
      },
    });

    // Créer le profil séparément
    await prisma.profilUtilisateur.create({
      data: {
        userId:       user.id,
        prenom,
        nom,
        telephone:    telephone    || null,
        ville:        ville        || null,
        pays:         pays         || 'Cameroun',
        typeCompte,
        specialite:   typeCompte === 'MEDECIN' ? (specialite || null) : null,
        numeroOrdre:  typeCompte === 'MEDECIN' ? (numeroOrdre || null) : null,
        lieuExercice: typeCompte === 'MEDECIN' ? (lieuExercice || null) : null,
      },
    }).catch(() => null); // Si la table n'existe pas encore, ignorer

    const profil = await prisma.profilUtilisateur.findUnique({ where: { userId: user.id } }).catch(() => null);

    const token = generateToken(user.id);
    res.status(201).json({
      message: 'Compte créé avec succès !',
      token,
      user: {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        isVerified: user.isVerified,
        profil,
      },
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
    if (!user.isActive) {
      return res.status(401).json({ error: 'Compte désactivé. Contactez contactazamed@gmail.com' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

    const profil = await prisma.profilUtilisateur.findUnique({ where: { userId: user.id } }).catch(() => null);

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        isVerified: user.isVerified,
        profil,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/users/me ───────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user   = await prisma.user.findUnique({ where: { id: req.user.id } });
    const profil = await prisma.profilUtilisateur.findUnique({ where: { userId: user.id } }).catch(() => null);
    res.json({
      id: user.id, email: user.email, role: user.role,
      isVerified: user.isVerified, profil,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/users/stats ────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [total, medecins, utilisateurs] = await Promise.all([
      prisma.user.count({ where: { role: { in: ['UTILISATEUR', 'MEDECIN'] }, isActive: true } }),
      prisma.user.count({ where: { role: 'MEDECIN', isActive: true } }),
      prisma.user.count({ where: { role: 'UTILISATEUR', isActive: true } }),
    ]);
    res.json({ total, medecins, utilisateurs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Route setup base (créer table ProfilUtilisateur si manquante) ──
router.get('/setup', async (req, res) => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProfilUtilisateur" (
        "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "userId"       TEXT NOT NULL UNIQUE,
        "prenom"       TEXT NOT NULL DEFAULT '',
        "nom"          TEXT NOT NULL DEFAULT '',
        "telephone"    TEXT,
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
    res.json({ ok: true, message: 'Table ProfilUtilisateur créée ou déjà existante.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
