// src/routes/auth.js — VERSION FINALE CORRIGÉE
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

// --- POST /api/auth/register ---
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
    modules, // objet { medicaments, examens, services, assurance }
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

    // On prépare les infos spécifiques
    const specifiques = [
      numAutorisationPharm && `N° Aut: ${numAutorisationPharm}`,
      nomPharmacien && `Pharma: ${nomPharmacien}`,
      numAgrement && `Agrément: ${numAgrement}`,
      numBiologiste && `Biologiste: ${nomBiologiste}`,
    ].filter(Boolean).join(' · ');

    // --- CORRECTION DES MODULES ---
    // On stocke les modules au début de la description pour pouvoir les extraire
    const modulesStr = modules ? JSON.stringify(modules) : JSON.stringify({});
    const descriptionFull = `MODULES_DATA:${modulesStr} | ${description || ''} ${specifiques}`.trim();

    // Horaires
    let horairesFormatted = horaire24h7j ? '7j/7 24h/24' : `${heureOuverture || '08:00'}-${heureFermeture || '18:00'}`;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'STRUCTURE',
        structure: {
          create: {
            nomCommercial,
            nomLegal: nomLegal || null,
            typeStructure,
            telephone,
            whatsapp: whatsapp || null,
            adresse: adresse || '', // Utilise chaîne vide si null
            pays: pays || 'Cameroun',
            ville,
            quartier: quartier || null,
            description: descriptionFull, // On met tout ici
            horaires: horairesFormatted,
            statutJuridique: 'PRIVE', // Valeur ENUM valide pour éviter l'erreur
            isVerified: false,
            isActive: true,
            abonnements: {
              create: {
                niveau: 'BASIC',
                dateDebut: new Date(),
                montant: 0,
                devise: 'XOF',
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
      message: 'Compte créé avec succès !',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        structure: { ...user.structure, modules: modules || {} },
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: "Erreur lors de l'inscription." });
  }
});

// --- POST /api/auth/login ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { structure: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // Extraction des modules depuis la description
    let parsedModules = {};
    if (user.structure?.description?.startsWith('MODULES_DATA:')) {
      try {
        const parts = user.structure.description.split('|');
        const jsonPart = parts[0].replace('MODULES_DATA:', '').trim();
        parsedModules = JSON.parse(jsonPart);
      } catch (e) {
        console.error("Erreur parsing modules au login");
      }
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        structure: { ...user.structure, modules: parsedModules },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;