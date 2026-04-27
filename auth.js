// src/routes/auth.js — corrigé : adresse null + modules sauvegardés
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const TYPES_VALIDES = [
  'PHARMACIE','LABORATOIRE','CENTRE_IMAGERIE','LABO_ET_IMAGERIE',
  'HOPITAL_PUBLIC','POLYCLINIQUE','CLINIQUE',
  'CABINET_MEDICAL','CABINET_SPECIALISE','CENTRE_SANTE',
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
    email, password, typeStructure, nomLegal,
    telephone, whatsapp, adresse, pays, ville, quartier, description,
    horaire24h7j, joursOuverture, heureOuverture, heureFermeture, horaires,
    modules, // objet { medicaments, examens, services, assurance }
    // Champs spécifiques
    numAutorisationPharm, nomPharmacien,
    numAgrement, nomBiologiste, nomMedecinRadiologue, nomPromoteur,
    numMinistere, categorieStruct, nomDirecteur,
    numAutorisationOuverture, nomMedecinChef, nomMedecin,
    numOrdre, nomResponsable,
  } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé.' });

    const passwordHash  = await bcrypt.hash(password, 12);
    const nomCommercial = nomLegal || `${typeStructure} ${ville}`;

    // Description enrichie avec champs spécifiques
    const specifiques = [
      numAutorisationPharm     && `N° Autorisation: ${numAutorisationPharm}`,
      nomPharmacien            && `Pharmacien: ${nomPharmacien}`,
      numAgrement              && `N° Agrément: ${numAgrement}`,
      nomBiologiste            && `Biologiste: ${nomBiologiste}`,
      nomMedecinRadiologue     && `Radiologue: ${nomMedecinRadiologue}`,
      nomPromoteur             && `Promoteur: ${nomPromoteur}`,
      numMinistere             && `N° Ministère: ${numMinistere}`,
      categorieStruct          && `Catégorie: ${categorieStruct}`,
      nomDirecteur             && `Directeur: ${nomDirecteur}`,
      numAutorisationOuverture && `N° Autorisation: ${numAutorisationOuverture}`,
      nomMedecinChef           && `Médecin chef: ${nomMedecinChef}`,
      nomMedecin               && `Médecin: ${nomMedecin}`,
      numOrdre                 && `N° Ordre: ${numOrdre}`,
      nomResponsable           && `Responsable: ${nomResponsable}`,
    ].filter(Boolean).join(' · ');

    const descriptionFull = [description, specifiques].filter(Boolean).join(' — ') || '';

    // Horaires
    let horairesFormatted = '';
    if (horaire24h7j) {
      horairesFormatted = '7j/7 24h/24';
    } else if (Array.isArray(joursOuverture) && joursOuverture.length) {
      horairesFormatted = `${joursOuverture.join(',')} ${heureOuverture || '08:00'}-${heureFermeture || '18:00'}`;
    } else {
      horairesFormatted = `${heureOuverture || '08:00'}-${heureFermeture || '18:00'}`;
    }

    // Modules → stocker en JSON dans le champ statutJuridique
    const modulesStr = modules ? JSON.stringify(modules) : JSON.stringify({});

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
            nomLegal:       nomLegal       || null,
            typeStructure,
            telephone,
            whatsapp:       whatsapp       || null,
            // ✅ adresse ne peut pas être null selon le schema — on met chaîne vide si absent
            adresse:        adresse        || '',
            pays:           pays           || 'Cameroun',
            ville,
            quartier:       quartier       || null,
            description:    descriptionFull,
            horaires:       horairesFormatted,
            heureOuverture: horaire24h7j ? '00:00' : (heureOuverture || '08:00'),
            heureFermeture: horaire24h7j ? '23:59' : (heureFermeture || '18:00'),
            // ✅ Modules stockés ici
            statutJuridique: modulesStr,
            isVerified: false,
            isActive:   true,
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

    // ✅ Parser les modules pour les retourner dans la réponse
    let parsedModules = {};
    try { parsedModules = JSON.parse(modulesStr); } catch {}

    const token = generateToken(user.id);
    res.status(201).json({
      message: 'Compte créé avec succès !',
      token,
      user: {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        isVerified: user.isVerified,
        structure:  { ...user.structure, modules: parsedModules },
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
    if (!user.isActive) {
      return res.status(401).json({ error: 'Compte désactivé. Contactez contactazamed@gmail.com' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

    // ✅ Parser les modules depuis statutJuridique
    let parsedModules = {};
    if (user.structure?.statutJuridique) {
      try { parsedModules = JSON.parse(user.structure.statutJuridique); } catch {}
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        isVerified: user.isVerified,
        // ✅ modules inclus directement dans structure
        structure:  { ...user.structure, modules: parsedModules },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
