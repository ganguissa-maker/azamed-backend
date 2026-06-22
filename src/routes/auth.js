// src/routes/auth.js — aligné sur le schema.prisma exact + vérification email
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

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "email_verifications" (
      "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "email"     TEXT NOT NULL,
      "code"      TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "used"      BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "password_resets" (
      "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "email"     TEXT NOT NULL,
      "code"      TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "used"      BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});

  // ✅ Inscriptions structures en attente de vérification email
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "inscriptions_structures_attente" (
      "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "email"        TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "donnees"      TEXT NOT NULL,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "inscriptions_structures_attente_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});
}

// ✅ Envoi NON BLOQUANT — ne fait jamais attendre la requête HTTP.
// Le code est toujours sauvegardé en base avant l'appel ; si l'email
// échoue ou met du temps, la requête répond quand même immédiatement.
function sendEmail(to, subject, html, fallbackLogLabel) {
  (async () => {
    try {
      const nodemailer = require('nodemailer');
      const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
      const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
      if (!smtpUser || !smtpPass) {
        console.log(`[${fallbackLogLabel}] (pas de SMTP configure) -> ${to}`);
        return;
      }
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
      });
      await transporter.sendMail({ from:`"AZAMED" <${smtpUser}>`, to, subject, html });
      console.log(`Email envoye a ${to} - ${subject}`);
    } catch (e) {
      console.log(`[${fallbackLogLabel}] Erreur envoi email (ignoree, requete deja repondue): ${e.message}`);
    }
  })();
}

function emailTemplateCode(titre, code, sousTexte) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#0284c7">AZAMED 🇨🇲</h2>
      <p>${titre}</p>
      <div style="background:#f0f9ff;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
        <p style="margin:0;font-size:14px;color:#64748b">${sousTexte}</p>
        <p style="font-size:36px;font-weight:900;color:#0284c7;letter-spacing:8px;margin:8px 0">${code}</p>
        <p style="margin:0;font-size:12px;color:#94a3b8">Valide pendant 15 minutes</p>
      </div>
      <p style="color:#64748b;font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
      <p style="color:#94a3b8;font-size:12px">AZAMED — Annuaire Santé Cameroun</p>
    </div>
  `;
}

// ─── POST /api/auth/register — Étape 1 : envoie le code, ne crée pas encore le compte ──
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe : min. 8 caractères'),
  body('typeStructure').isIn(TYPES_VALIDES).withMessage('Type d\'établissement invalide'),
  body('telephone').notEmpty().withMessage('Téléphone requis'),
  body('ville').notEmpty().withMessage('Ville requise'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array(), error: errors.array()[0].msg });

  const { email, password } = req.body;

  try {
    await ensureTables();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé.' });

    const passwordHash = await bcrypt.hash(password, 12);

    // ✅ On stocke TOUT le body (moins password) tel quel, réutilisé intégralement
    // à l'étape verify-email pour créer la structure exactement comme avant.
    const { password: _omit, ...donneesFormulaire } = req.body;
    const donneesStr = JSON.stringify(donneesFormulaire);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "inscriptions_structures_attente" ("email","passwordHash","donnees")
       VALUES ($1,$2,$3)
       ON CONFLICT ("email") DO UPDATE SET "passwordHash"=$2,"donnees"=$3,"createdAt"=NOW()`,
      email, passwordHash, donneesStr
    );

    const code      = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.$executeRawUnsafe(`UPDATE "email_verifications" SET "used"=true WHERE "email"=$1`, email).catch(() => {});
    await prisma.$executeRawUnsafe(
      `INSERT INTO "email_verifications" ("email","code","expiresAt") VALUES ($1,$2,$3)`,
      email, code, expiresAt
    );

    sendEmail(
      email,
      '📧 Vérifiez votre email — AZAMED',
      emailTemplateCode('Confirmez votre adresse email pour activer votre compte établissement AZAMED.', code, 'Votre code de vérification'),
      'CODE INSCRIPTION STRUCTURE'
    );

    res.status(200).json({ message: 'Un code de vérification a été envoyé à votre email.', email });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/verify-email — Étape 2 : valide le code et crée la structure ──
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email et code requis.' });

  try {
    await ensureTables();

    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "email_verifications"
       WHERE "email"=$1 AND "code"=$2 AND "used"=false AND "expiresAt" > NOW()
       ORDER BY "createdAt" DESC LIMIT 1`,
      email.toLowerCase(), code.trim()
    );
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'Code invalide ou expiré. Demandez un nouveau code.' });
    }

    const pendingRows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "inscriptions_structures_attente" WHERE "email"=$1`, email.toLowerCase()
    );
    if (!pendingRows || pendingRows.length === 0) {
      return res.status(400).json({ error: 'Inscription introuvable. Recommencez le processus.' });
    }
    const pending = pendingRows[0];
    const passwordHash = pending.passwordHash;
    const body = JSON.parse(pending.donnees);

    const {
      typeStructure, nomLegal,
      telephone, whatsapp, adresse, pays, ville, quartier, description,
      horaire24h7j, joursOuverture, heureOuverture, heureFermeture,
      modules,
      numAutorisationPharm, nomPharmacien,
      numAgrement, nomBiologiste, nomMedecinRadiologue, nomPromoteur,
      numMinistere, categorieStruct, nomDirecteur,
      numAutorisationOuverture, nomMedecinChef, nomMedecin,
      numOrdre, nomResponsable,
    } = body;

    const nomCommercial = nomLegal || `${typeStructure} ${ville}`;

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

    const modulesStr = JSON.stringify(modules || {});

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role:       'STRUCTURE',
        isVerified: false,
        isActive:   true,
        structure: {
          create: {
            nomLegal:       nomLegal       || nomCommercial,
            nomCommercial,
            typeStructure,
            telephone,
            whatsapp:       whatsapp       || null,
            adresse:        adresse        || '',
            pays:           pays           || 'Cameroun',
            ville,
            quartier:       quartier       || null,
            description:    descriptionFull || null,
            horaires:       horairesJson,
            heureOuverture: horaire24h7j ? '00:00' : (heureOuverture || '08:00'),
            heureFermeture: horaire24h7j ? '23:59' : (heureFermeture || '18:00'),
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

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "structures" ADD COLUMN IF NOT EXISTS "modules_json" TEXT DEFAULT '{}'
    `).catch(() => {});

    await prisma.$executeRawUnsafe(
      `UPDATE "structures" SET "modules_json" = $1 WHERE id = $2`,
      modulesStr, user.structure.id
    ).catch(() => {});

    let parsedModules = {};
    try { parsedModules = JSON.parse(modulesStr); } catch {}

    await prisma.$executeRawUnsafe(`UPDATE "email_verifications" SET "used"=true WHERE "id"=$1`, rows[0].id);
    await prisma.$executeRawUnsafe(`DELETE FROM "inscriptions_structures_attente" WHERE "email"=$1`, email.toLowerCase());

    const token = generateToken(user.id);
    res.status(201).json({
      message: 'Compte créé et vérifié avec succès !',
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
    console.error('Verify-email structure error:', err);
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email déjà utilisé.' });
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/resend-code ────────────────────────────────
router.post('/resend-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  try {
    await ensureTables();
    const pending = await prisma.$queryRawUnsafe(
      `SELECT * FROM "inscriptions_structures_attente" WHERE "email"=$1`, email.toLowerCase()
    );
    if (!pending || pending.length === 0) {
      return res.status(400).json({ error: 'Aucune inscription en attente pour cet email.' });
    }

    const code      = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.$executeRawUnsafe(`UPDATE "email_verifications" SET "used"=true WHERE "email"=$1`, email.toLowerCase()).catch(() => {});
    await prisma.$executeRawUnsafe(
      `INSERT INTO "email_verifications" ("email","code","expiresAt") VALUES ($1,$2,$3)`,
      email.toLowerCase(), code, expiresAt
    );

    sendEmail(
      email,
      '📧 Nouveau code de vérification — AZAMED',
      emailTemplateCode('Voici votre nouveau code de vérification.', code, 'Votre code de vérification'),
      'CODE RENVOYÉ STRUCTURE'
    );

    res.json({ message: 'Nouveau code envoyé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────
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
      return res.status(401).json({ error: 'Compte désactivé. Contactez contactazamed98@gmail.com' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

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

// ─── POST /api/auth/forgot-password ────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  try {
    await ensureTables();
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.json({ message: 'Si cet email existe, un code vous a été envoyé.' });

    const code      = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.$executeRawUnsafe(`UPDATE "password_resets" SET "used"=true WHERE "email"=$1`, email.toLowerCase()).catch(() => {});
    await prisma.$executeRawUnsafe(
      `INSERT INTO "password_resets" ("email","code","expiresAt") VALUES ($1,$2,$3)`,
      email.toLowerCase(), code, expiresAt
    );

    sendEmail(
      email,
      '🔐 Code de réinitialisation — AZAMED',
      emailTemplateCode('Vous avez demandé la réinitialisation de votre mot de passe établissement.', code, 'Votre code de réinitialisation'),
      'CODE RESET STRUCTURE'
    );

    res.json({ message: 'Si cet email existe, un code vous a été envoyé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/reset-password ──────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code et nouveau mot de passe requis.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }

  try {
    await ensureTables();
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "password_resets"
       WHERE "email"=$1 AND "code"=$2 AND "used"=false AND "expiresAt" > NOW()
       ORDER BY "createdAt" DESC LIMIT 1`,
      email.toLowerCase(), code.trim()
    );
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'Code invalide ou expiré. Demandez un nouveau code.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { email: email.toLowerCase() }, data: { passwordHash } });
    await prisma.$executeRawUnsafe(`UPDATE "password_resets" SET "used"=true WHERE "id"=$1`, rows[0].id);

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
