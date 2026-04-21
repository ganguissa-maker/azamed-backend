// src/routes/auth.js
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// Types valides (HOPITAL_PRIVE remplacé par POLYCLINIQUE, ajout CENTRE_IMAGERIE, LABO_IMAGERIE)
const TYPES_VALIDES = [
  'PHARMACIE', 'LABORATOIRE', 'HOPITAL_PUBLIC', 'POLYCLINIQUE',
  'CLINIQUE', 'CABINET_MEDICAL', 'CABINET_SPECIALISE', 'CENTRE_SANTE',
  'CENTRE_IMAGERIE', 'LABO_ET_IMAGERIE',
];

// ─── POST /api/auth/register ──────────────────────────────────
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe : min. 6 caractères'),
  body('typeStructure').isIn(TYPES_VALIDES).withMessage('Type d\'établissement invalide'),
  body('telephone').notEmpty().withMessage('Téléphone requis'),
  body('ville').notEmpty().withMessage('Ville requise'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array(), error: errors.array()[0].msg });

  const {
    email, password, typeStructure,
    nomLegal, telephone, whatsapp,
    adresse, pays, ville, quartier, description,
    heureOuverture, heureFermeture,
  } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé.' });

    const passwordHash = await bcrypt.hash(password, 12);

    // Nom commercial = nom légal (simplifié)
    const nomCommercial = nomLegal || `${typeStructure} ${ville}`;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role:       'STRUCTURE',
        isVerified: false,
        isActive:   true,
        structure: {
          create: {
            nomCommercial,
            nomLegal:       nomLegal || null,
            typeStructure,
            telephone,
            whatsapp:       whatsapp       || null,
            adresse:        adresse        || null,
            pays:           pays           || 'Cameroun',
            ville,
            quartier:       quartier       || null,
            description:    description    || null,
            heureOuverture: heureOuverture || null,
            heureFermeture: heureFermeture || null,
            isVerified:     false,
            isActive:       true,
            abonnements: {
              create: {
                niveau:        'BASIC',
                dateDebut:     new Date(),
                montant:       0,
                devise:        'XOF',
                statutPaiement:'CONFIRME',
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
      message: 'Compte créé avec succès !',
      token,
      user: {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        isVerified: user.isVerified,
        structure:  user.structure,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email déjà utilisé.' });
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        structure: {
          include: { abonnements: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
      },
    });

    if (!user || !['STRUCTURE', 'ADMIN'].includes(user.role)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }
    if (!user.isActive) return res.status(401).json({ error: 'Compte désactivé. Contactez contactazamed@gmail.com' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

    const token = generateToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified, structure: user.structure } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
