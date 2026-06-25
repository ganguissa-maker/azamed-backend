// src/routes/delegue.js — Delegues medicaux : inscription directe + propositions medicaments
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { protect, adminOnly } = require('../middleware/auth');
const prisma = new PrismaClient();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "profils_delegues" (
      "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId"         TEXT NOT NULL UNIQUE,
      "prenom"         TEXT,
      "nom"            TEXT,
      "telephone"      TEXT,
      "ville"          TEXT,
      "nomLaboratoire" TEXT NOT NULL,
      "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "profils_delegues_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "medicaments_proposes" (
      "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "delegueId"           TEXT NOT NULL,
      "nomLaboratoire"      TEXT NOT NULL,
      "nomCommercial"       TEXT NOT NULL,
      "dci"                 TEXT,
      "forme"               TEXT,
      "dosage"              TEXT,
      "classeTherapeutique" TEXT,
      "statut"              TEXT NOT NULL DEFAULT 'EN_ATTENTE',
      "motifRefus"          TEXT,
      "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "medicaments_proposes_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});

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
}

// AUTHENTIFICATION DELEGUE (inscription directe, sans verification email)

router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe : min. 8 caracteres'),
  body('nomLaboratoire').notEmpty().withMessage('Le nom du laboratoire est requis'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, password, prenom, nom, telephone, ville, nomLaboratoire } = req.body;

  try {
    await ensureTables();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Cet email est deja utilise.' });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role: 'DELEGUE',
        isVerified: false, // verifie par l'admin ensuite, comme les medecins
        isActive: true,
      },
    });

    await prisma.$executeRawUnsafe(
      `INSERT INTO "profils_delegues" ("userId","prenom","nom","telephone","ville","nomLaboratoire")
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT ("userId") DO UPDATE SET "prenom"=$2,"nom"=$3,"telephone"=$4,"ville"=$5,"nomLaboratoire"=$6`,
      user.id, prenom||null, nom||null, telephone||null, ville||null, nomLaboratoire
    );

    const token = generateToken(user.id);
    res.status(201).json({
      message: 'Compte cree avec succes !',
      token,
      user: {
        id: user.id, email: user.email, role: user.role, isVerified: user.isVerified,
        profil: { prenom, nom, telephone, ville, nomLaboratoire },
      },
    });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email deja utilise.' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== 'DELEGUE') return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    if (!user.isActive) return res.status(401).json({ error: 'Compte desactive.' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

    let profil = {};
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "profils_delegues" WHERE "userId"=$1`, user.id);
      if (rows?.[0]) profil = rows[0];
    } catch {}

    const token = generateToken(user.id);
    res.json({ token, user: { id:user.id, email:user.email, role:user.role, isVerified:user.isVerified, profil } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    if (req.user.role !== 'DELEGUE') return res.status(403).json({ error: 'Reserve aux delegues medicaux.' });
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id:true, email:true, role:true, isVerified:true, isActive:true },
    });
    let profil = {};
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "profils_delegues" WHERE "userId"=$1`, user.id);
      if (rows?.[0]) profil = rows[0];
    } catch {}
    res.json({ user: { ...user, profil } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/delegue/reset-password-direct — réinitialisation directe ──
router.post('/reset-password-direct', [
  body('email').isEmail().normalizeEmail(),
  body('newPassword').isLength({ min: 8 }).withMessage('Le nouveau mot de passe doit contenir au moins 8 caracteres.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.role !== 'DELEGUE') return res.status(400).json({ error: 'Aucun compte délégué trouvé avec cet email.' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PROPOSITIONS DE MEDICAMENTS (delegue)

router.post('/medicaments', protect, async (req, res) => {
  try {
    if (req.user.role !== 'DELEGUE') return res.status(403).json({ error: 'Reserve aux delegues medicaux.' });
    await ensureTables();

    const { nomCommercial, dci, forme, dosage, classeTherapeutique } = req.body;
    if (!nomCommercial || !nomCommercial.trim()) {
      return res.status(400).json({ error: 'Le nom commercial du medicament est requis.' });
    }

    const profilRows = await prisma.$queryRawUnsafe(`SELECT * FROM "profils_delegues" WHERE "userId"=$1`, req.user.id);
    const nomLaboratoire = profilRows?.[0]?.nomLaboratoire || 'Laboratoire non renseigne';

    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO "medicaments_proposes"
        ("delegueId","nomLaboratoire","nomCommercial","dci","forme","dosage","classeTherapeutique")
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      req.user.id, nomLaboratoire, nomCommercial.trim(), dci||null, forme||null, dosage||null, classeTherapeutique||null
    );

    res.status(201).json({ message: 'Medicament propose ! En attente de validation par AZAMED.', medicament: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/medicaments/mes', protect, async (req, res) => {
  try {
    if (req.user.role !== 'DELEGUE') return res.status(403).json({ error: 'Reserve aux delegues medicaux.' });
    await ensureTables();
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "medicaments_proposes" WHERE "delegueId"=$1 ORDER BY "createdAt" DESC`,
      req.user.id
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VALIDATION ADMIN

router.get('/admin/medicaments', protect, adminOnly, async (req, res) => {
  try {
    await ensureTables();
    const { statut } = req.query;
    let rows;
    if (statut) {
      rows = await prisma.$queryRawUnsafe(`
        SELECT mp.*, pd."prenom" as "delPrenom", pd."nom" as "delNom", u."email" as "delEmail"
        FROM "medicaments_proposes" mp
        LEFT JOIN "profils_delegues" pd ON pd."userId" = mp."delegueId"
        LEFT JOIN "users" u ON u."id" = mp."delegueId"
        WHERE mp."statut" = $1
        ORDER BY mp."createdAt" DESC
      `, statut);
    } else {
      rows = await prisma.$queryRawUnsafe(`
        SELECT mp.*, pd."prenom" as "delPrenom", pd."nom" as "delNom", u."email" as "delEmail"
        FROM "medicaments_proposes" mp
        LEFT JOIN "profils_delegues" pd ON pd."userId" = mp."delegueId"
        LEFT JOIN "users" u ON u."id" = mp."delegueId"
        ORDER BY mp."createdAt" DESC
      `);
    }
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/medicaments/:id/valider', protect, adminOnly, async (req, res) => {
  try {
    await ensureTables();
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "medicaments_proposes" WHERE "id"=$1`, req.params.id);
    if (!rows?.[0]) return res.status(404).json({ error: 'Proposition introuvable.' });
    const prop = rows[0];

    if (prop.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ error: 'Cette proposition a deja ete traitee.' });
    }

    const medicament = await prisma.medicament.create({
      data: {
        nomCommercial:       prop.nomCommercial,
        dci:                 prop.dci || null,
        forme:               prop.forme || null,
        dosage:              prop.dosage || null,
        classeTherapeutique: prop.classeTherapeutique || null,
        isActive:            true,
      },
    });

    await prisma.$executeRawUnsafe(
      `UPDATE "medicaments_proposes" SET "statut"='VALIDE', "updatedAt"=NOW() WHERE "id"=$1`,
      req.params.id
    );

    await prisma.$executeRawUnsafe(
      `INSERT INTO "notifications_consult" ("userId","type","titre","message") VALUES ($1,$2,$3,$4)`,
      prop.delegueId, 'MEDICAMENT_VALIDE',
      'Medicament valide !',
      `Votre proposition "${prop.nomCommercial}" a ete validee et ajoutee au catalogue AZAMED.`
    ).catch(() => {});

    res.json({ message: 'Medicament valide et ajoute au catalogue.', medicament });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/medicaments/:id/refuser', protect, adminOnly, async (req, res) => {
  try {
    await ensureTables();
    const { motif } = req.body;
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "medicaments_proposes" WHERE "id"=$1`, req.params.id);
    if (!rows?.[0]) return res.status(404).json({ error: 'Proposition introuvable.' });
    const prop = rows[0];

    await prisma.$executeRawUnsafe(
      `UPDATE "medicaments_proposes" SET "statut"='REFUSE', "motifRefus"=$1, "updatedAt"=NOW() WHERE "id"=$2`,
      motif || null, req.params.id
    );

    await prisma.$executeRawUnsafe(
      `INSERT INTO "notifications_consult" ("userId","type","titre","message") VALUES ($1,$2,$3,$4)`,
      prop.delegueId, 'MEDICAMENT_REFUSE',
      'Medicament refuse',
      `Votre proposition "${prop.nomCommercial}" a ete refusee.${motif ? ` Motif : ${motif}` : ''}`
    ).catch(() => {});

    res.json({ message: 'Proposition refusee.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/stats', protect, adminOnly, async (req, res) => {
  try {
    await ensureTables();
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) FILTER (WHERE "statut" = 'EN_ATTENTE') as "enAttente",
        COUNT(*) FILTER (WHERE "statut" = 'VALIDE')     as "valides",
        COUNT(*) FILTER (WHERE "statut" = 'REFUSE')     as "refuses"
      FROM "medicaments_proposes"
    `);
    const totalDelegues = await prisma.user.count({ where: { role: 'DELEGUE' } });
    res.json({ ...rows[0], totalDelegues });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
