// src/routes/delegue.js — Délégués médicaux : inscription + propositions médicaments
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

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    CREATE TABLE IF NOT EXISTS "email_verifications" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "email" TEXT NOT NULL, "code" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL, "used" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "inscriptions_delegues_attente" (
      "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "email"        TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "donnees"      TEXT NOT NULL,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "inscriptions_delegues_attente_pkey" PRIMARY KEY ("id")
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

// Envoi NON BLOQUANT via Resend (API HTTPS, jamais bloque par les
// hebergeurs cloud, contrairement a SMTP qui pose probleme sur Railway).
function sendEmail(to, subject, html, fallbackLogLabel) {
  (async () => {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.log(`[${fallbackLogLabel}] (pas de RESEND_API_KEY configuree) -> ${to}`);
        return;
      }
      const fromAddress = process.env.RESEND_FROM || 'AZAMED <onboarding@resend.dev>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: fromAddress, to: [to], subject, html }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.log(`[${fallbackLogLabel}] Resend a refuse (${response.status}): ${errText}`);
        return;
      }
      console.log(`Email envoye a ${to} via Resend - ${subject}`);
    } catch (e) {
      console.log(`[${fallbackLogLabel}] Erreur envoi email (ignoree, requete deja repondue): ${e.message}`);
    }
  })();
}

function emailTemplateCode(titre, code, sousTexte) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#0284c7">AZAMED</h2>
      <p>${titre}</p>
      <div style="background:#f0f9ff;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
        <p style="margin:0;font-size:14px;color:#64748b">${sousTexte}</p>
        <p style="font-size:36px;font-weight:900;color:#0284c7;letter-spacing:8px;margin:8px 0">${code}</p>
        <p style="margin:0;font-size:12px;color:#94a3b8">Valide pendant 15 minutes</p>
      </div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
      <p style="color:#94a3b8;font-size:12px">AZAMED - Annuaire Sante Cameroun</p>
    </div>
  `;
}

// AUTHENTIFICATION DELEGUE

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
    const donnees = JSON.stringify({ prenom, nom, telephone, ville, nomLaboratoire });

    await prisma.$executeRawUnsafe(
      `INSERT INTO "inscriptions_delegues_attente" ("email","passwordHash","donnees")
       VALUES ($1,$2,$3)
       ON CONFLICT ("email") DO UPDATE SET "passwordHash"=$2,"donnees"=$3,"createdAt"=NOW()`,
      email, passwordHash, donnees
    );

    const code      = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.$executeRawUnsafe(`UPDATE "email_verifications" SET "used"=true WHERE "email"=$1`, email).catch(() => {});
    await prisma.$executeRawUnsafe(
      `INSERT INTO "email_verifications" ("email","code","expiresAt") VALUES ($1,$2,$3)`,
      email, code, expiresAt
    );

    sendEmail(
      email, 'Verifiez votre email - AZAMED Delegue',
      emailTemplateCode('Confirmez votre adresse email pour activer votre compte delegue medical AZAMED.', code, 'Votre code de verification'),
      'CODE DELEGUE'
    );

    res.status(200).json({ message: 'Un code de verification a ete envoye a votre email.', email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
      return res.status(400).json({ error: 'Code invalide ou expire. Demandez un nouveau code.' });
    }

    const pendingRows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "inscriptions_delegues_attente" WHERE "email"=$1`, email.toLowerCase()
    );
    if (!pendingRows || pendingRows.length === 0) {
      return res.status(400).json({ error: 'Inscription introuvable. Recommencez le processus.' });
    }
    const pending = pendingRows[0];
    const donnees = JSON.parse(pending.donnees);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: pending.passwordHash,
        role: 'DELEGUE',
        isVerified: false,
        isActive: true,
      },
    });

    await prisma.$executeRawUnsafe(
      `INSERT INTO "profils_delegues" ("userId","prenom","nom","telephone","ville","nomLaboratoire")
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT ("userId") DO UPDATE SET "prenom"=$2,"nom"=$3,"telephone"=$4,"ville"=$5,"nomLaboratoire"=$6`,
      user.id, donnees.prenom||null, donnees.nom||null, donnees.telephone||null, donnees.ville||null, donnees.nomLaboratoire
    );

    await prisma.$executeRawUnsafe(`UPDATE "email_verifications" SET "used"=true WHERE "id"=$1`, rows[0].id);
    await prisma.$executeRawUnsafe(`DELETE FROM "inscriptions_delegues_attente" WHERE "email"=$1`, email.toLowerCase());

    const token = generateToken(user.id);
    res.status(201).json({
      message: 'Compte cree et verifie avec succes !',
      token,
      user: {
        id: user.id, email: user.email, role: user.role, isVerified: user.isVerified,
        profil: { prenom: donnees.prenom, nom: donnees.nom, telephone: donnees.telephone, ville: donnees.ville, nomLaboratoire: donnees.nomLaboratoire },
      },
    });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email deja utilise.' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/resend-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis.' });
  try {
    await ensureTables();
    const pending = await prisma.$queryRawUnsafe(`SELECT * FROM "inscriptions_delegues_attente" WHERE "email"=$1`, email.toLowerCase());
    if (!pending || pending.length === 0) return res.status(400).json({ error: 'Aucune inscription en attente pour cet email.' });

    const code      = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.$executeRawUnsafe(`UPDATE "email_verifications" SET "used"=true WHERE "email"=$1`, email.toLowerCase()).catch(() => {});
    await prisma.$executeRawUnsafe(`INSERT INTO "email_verifications" ("email","code","expiresAt") VALUES ($1,$2,$3)`, email.toLowerCase(), code, expiresAt);

    sendEmail(email, 'Nouveau code - AZAMED Delegue',
      emailTemplateCode('Voici votre nouveau code de verification.', code, 'Votre code de verification'), 'CODE RENVOYE DELEGUE');

    res.json({ message: 'Nouveau code envoye.' });
  } catch (err) {
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
