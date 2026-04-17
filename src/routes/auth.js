// src/routes/auth.js — AZAMED
// Route d'authentification corrigée

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/auth');

const prisma = new PrismaClient();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─── POST /api/auth/register ─────────────────────────────────
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe : minimum 8 caractères'),
  body('nomCommercial').notEmpty().withMessage('Nom commercial requis'),
  body('typeStructure').notEmpty().withMessage('Type de structure requis'),
  body('telephone').notEmpty().withMessage('Téléphone requis'),
  body('ville').notEmpty().withMessage('Ville requise'),
  body('pays').notEmpty().withMessage('Pays requis'),
], async (req, res) => {
  // Validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0].msg,
      errors: errors.array(),
    });
  }

  const {
    email, password, nomLegal, nomCommercial, typeStructure,
    telephone, whatsapp, adresse, pays, ville, quartier,
    description, statutJuridique,
  } = req.body;

  try {
    // Vérifier si email déjà utilisé
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé. Veuillez en choisir un autre.' });
    }

    // Valider typeStructure
    const typesValides = [
      'PHARMACIE', 'LABORATOIRE', 'HOPITAL_PUBLIC', 'HOPITAL_PRIVE',
      'CLINIQUE', 'CABINET_MEDICAL', 'CABINET_SPECIALISE', 'CENTRE_SANTE', 'AUTRE',
    ];
    if (!typesValides.includes(typeStructure)) {
      return res.status(400).json({
        error: `Type de structure invalide : "${typeStructure}". Valeurs acceptées : ${typesValides.join(', ')}`,
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'STRUCTURE',
        isVerified: false,
        structure: {
          create: {
            nomLegal:       nomLegal || nomCommercial,
            nomCommercial,
            typeStructure,
            telephone,
            whatsapp:       whatsapp || null,
            email,
            adresse:        adresse  || '',
            pays,
            ville,
            quartier:       quartier || null,
            description:    description || null,
            statutJuridique: statutJuridique || null,
            // Abonnement BASIC gratuit automatique
            abonnements: {
              create: {
                niveau:         'BASIC',
                dateDebut:      new Date(),
                montant:        0,
                statutPaiement: 'CONFIRME',
              },
            },
          },
        },
      },
      include: {
        structure: {
          include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Compte créé avec succès. Bienvenue sur AZAMED !',
      token,
      user: {
        id:        user.id,
        email:     user.email,
        role:      user.role,
        structure: user.structure,
      },
    });

  } catch (err) {
    console.error('ERREUR INSCRIPTION:', err);

    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Un compte avec cet email existe déjà.' });
    }
    if (err.code === 'P2006' || err.message?.includes('enum')) {
      return res.status(400).json({ error: `Type de structure invalide : "${typeStructure}"` });
    }
    if (err.code?.startsWith('P')) {
      return res.status(500).json({ error: `Erreur base de données : ${err.message}` });
    }

    res.status(500).json({ error: `Erreur serveur : ${err.message}` });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        structure: {
          include: {
            abonnements: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id:        user.id,
        email:     user.email,
        role:      user.role,
        structure: user.structure,
      },
    });

  } catch (err) {
    console.error('ERREUR LOGIN:', err);
    res.status(500).json({ error: `Erreur serveur : ${err.message}` });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        structure: {
          include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
      },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/change-password ──────────────────────────
router.post('/change-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const ok   = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Mot de passe actuel incorrect.' });
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: hash } });
    res.json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
