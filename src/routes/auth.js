// src/routes/auth.js — aligné sur le schema.prisma exact
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ✅ Types valides — correspondent exactement à l'enum TypeStructure du schema
const TYPES_VALIDES = [
  'PHARMACIE', 'LABORATOIRE', 'HOPITAL_PUBLIC', 'HOPITAL_PRIVE',
  'CLINIQUE', 'CABINET_MEDICAL', 'CABINET_SPECIALISE', 'CENTRE_SANTE',
  'CENTRE_IMAGERIE', 'POLYCLINIQUE', 'LABO_ET_IMAGERIE', 'AUTRE',
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
    horaire24h7j, joursOuverture, heureOuverture, heureFermeture,
    modules,
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

    // ✅ Horaires → stocker en JSON (schema: horaires Json?)
    let horairesJson = null;
    if (horaire24h7j) {
      horairesJson = { mode: '24h/24 7j/7' };
    } else {
      const jours = Array.isArray(joursOuverture) ? joursOuverture : [];
      horairesJson = {
        jours,
        ouverture: heureOuverture || '08:00',
        fermeture: heureFermeture || '18:00',
      };
    }

    // ✅ Modules → stocker dans le champ description étendu OU via SQL brut
    // On va utiliser une colonne séparée ajoutée via SQL
    const modulesStr = JSON.stringify(modules || {});

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role:       'STRUCTURE',
        isVerified: false,
        isActive:   true,
        structure: {
          create: {
            // ✅ Champs du schema exact
            nomLegal:       nomLegal       || nomCommercial,
            nomCommercial,
            typeStructure,
            telephone,
            whatsapp:       whatsapp       || null,
            // ✅ adresse est String (non-nullable dans schema) → jamais null
            adresse:        adresse        || '',
            pays:           pays           || 'Cameroun',
            ville,
            quartier:       quartier       || null,
            description:    descriptionFull || null,
            // ✅ horaires est Json? dans le schema
            horaires:       horairesJson,
            // ✅ heureOuverture et heureFermeture sont String? dans schema
            heureOuverture: horaire24h7j ? '00:00' : (heureOuverture || '08:00'),
            heureFermeture: horaire24h7j ? '23:59' : (heureFermeture || '18:00'),
            // ✅ PAS de statutJuridique — c'est une enum, on ne l'utilise pas ici
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

    // ✅ Sauvegarder modules dans une colonne texte ajoutée via SQL brut
    // (colonne modulesJson TEXT ajoutée si elle n'existe pas)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "structures" ADD COLUMN IF NOT EXISTS "modules_json" TEXT DEFAULT '{}'
    `).catch(() => {});

    await prisma.$executeRawUnsafe(
      `UPDATE "structures" SET "modules_json" = $1 WHERE id = $2`,
      modulesStr, user.structure.id
    ).catch(() => {});

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

    // ✅ Lire modules depuis la colonne modules_json
    let parsedModules = {};
    if (user.structure?.id) {
      try {
        const rows = await prisma.$queryRawUnsafe(
          `SELECT "modules_json" FROM "structures" WHERE id = $1`,
          user.structure.id
        );
        if (rows?.[0]?.modules_json) {
          parsedModules = JSON.parse(rows[0].modules_json);
        }
      } catch {}
    }

    const token = generateToken(user.id);
    res.json({
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
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
