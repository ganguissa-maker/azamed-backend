// src/routes/users.js — Sans nodemailer (envoi email optionnel via fetch)
const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { protect } = require('../middleware/auth');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });

async function ensureResetTable() {
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
}

async function ensureProfilTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "profils_utilisateurs" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL UNIQUE, "prenom" TEXT, "nom" TEXT,
      "ville" TEXT, "telephone" TEXT, "specialite" TEXT,
      "numeroOrdre" TEXT, "lieuExercice" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "profils_utilisateurs_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});
}

// Envoi email sans nodemailer — via Gmail API ou simple log
async function sendResetEmail(email, code) {
  // Si pas de config SMTP, log le code (visible dans Railway logs)
  console.log(`\n🔐 CODE RESET pour ${email}: ${code}\n`);

  // Tentative d'envoi avec nodemailer si disponible
  try {
    const nodemailer = require('nodemailer');
    const smtpUser   = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass   = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    if (!smtpUser || !smtpPass) return;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({
      from:    `"AZAMED" <${smtpUser}>`,
      to:      email,
      subject: '🔐 Code de réinitialisation AZAMED',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#0284c7">AZAMED 🇨🇲</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <div style="background:#f0f9ff;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
            <p style="margin:0;font-size:14px;color:#64748b">Votre code de réinitialisation</p>
            <p style="font-size:36px;font-weight:900;color:#0284c7;letter-spacing:8px;margin:8px 0">${code}</p>
            <p style="margin:0;font-size:12px;color:#94a3b8">Valide pendant 15 minutes</p>
          </div>
          <p style="color:#64748b;font-size:13px">Si vous n'avez pas demandé ceci, ignorez cet email.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
          <p style="color:#94a3b8;font-size:12px">AZAMED — Annuaire Santé Cameroun</p>
        </div>
      `,
    });
    console.log(`✅ Email envoyé à ${email}`);
  } catch (e) {
    // nodemailer non installé ou config manquante — le code est dans les logs
    console.log(`📋 Code reset (pas d'email): ${code}`);
  }
}

// ── POST /api/users/register ──────────────────────────────────
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe : min. 8 caractères'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, password, typeCompte, prenom, nom, ville, telephone, specialite, numeroOrdre, lieuExercice } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const role = typeCompte === 'MEDECIN' ? 'MEDECIN' : 'PATIENT';

    const user = await prisma.user.create({
      data: { email, passwordHash, role, isVerified: role === 'PATIENT', isActive: true },
    });

    await ensureProfilTable();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "profils_utilisateurs" ("userId","prenom","nom","ville","telephone","specialite","numeroOrdre","lieuExercice")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT ("userId") DO UPDATE SET "prenom"=$2,"nom"=$3,"ville"=$4,"telephone"=$5,"specialite"=$6,"numeroOrdre"=$7,"lieuExercice"=$8`,
      user.id, prenom||null, nom||null, ville||null, telephone||null,
      specialite||null, numeroOrdre||null, lieuExercice||null
    ).catch(() => {});

    const token = generateToken(user.id);
    res.status(201).json({
      message: 'Compte créé avec succès !',
      token,
      user: {
        id:user.id, email:user.email, role:user.role, isVerified:user.isVerified,
        profil:{ prenom, nom, ville, telephone, specialite, numeroOrdre, lieuExercice },
      },
    });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email déjà utilisé.' });
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/users/login ─────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !['PATIENT','MEDECIN'].includes(user.role)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }
    if (!user.isActive) return res.status(401).json({ error: 'Compte désactivé.' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

    let profil = {};
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "profils_utilisateurs" WHERE "userId"=$1`, user.id);
      if (rows?.[0]) profil = rows[0];
    } catch {}

    const token = generateToken(user.id);
    res.json({ token, user:{ id:user.id, email:user.email, role:user.role, isVerified:user.isVerified, profil } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/users/forgot-password ──────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  try {
    await ensureResetTable();
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.json({ message: 'Si cet email existe, un code vous a été envoyé.' });

    const code      = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.$executeRawUnsafe(
      `UPDATE "password_resets" SET "used"=true WHERE "email"=$1`, email
    ).catch(() => {});

    await prisma.$executeRawUnsafe(
      `INSERT INTO "password_resets" ("email","code","expiresAt") VALUES ($1,$2,$3)`,
      email.toLowerCase(), code, expiresAt
    );

    await sendResetEmail(email, code);
    res.json({ message: 'Si cet email existe, un code vous a été envoyé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/users/reset-password ───────────────────────────
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code et nouveau mot de passe requis.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }

  try {
    await ensureResetTable();
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
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data:  { passwordHash },
    });

    await prisma.$executeRawUnsafe(
      `UPDATE "password_resets" SET "used"=true WHERE "id"=$1`, rows[0].id
    );

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/medecins ───────────────────────────────────
router.get('/medecins', async (req, res) => {
  try {
    const { specialite, ville, page=1, limit=20 } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const where = { role:'MEDECIN', isActive:true };
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take:parseInt(limit), orderBy:{ createdAt:'desc' },
        select:{ id:true, email:true, role:true, isVerified:true, createdAt:true } }),
      prisma.user.count({ where }),
    ]);
    let profils = [];
    try {
      profils = await prisma.$queryRawUnsafe(
        `SELECT * FROM "profils_utilisateurs" WHERE "userId" = ANY($1::text[])`,
        users.map((u) => u.id)
      );
    } catch {}
    let data = users.map((u) => ({ ...u, profil: profils.find((p) => p.userId===u.id)||{} }));
    if (specialite) data = data.filter((u) => u.profil?.specialite?.toLowerCase().includes(specialite.toLowerCase()));
    if (ville)      data = data.filter((u) => u.profil?.ville?.toLowerCase().includes(ville.toLowerCase()));
    res.json({ data, pagination:{ total, page:parseInt(page), pages:Math.ceil(total/parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id:true, email:true, role:true, isVerified:true, isActive:true },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    let profil = {};
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "profils_utilisateurs" WHERE "userId"=$1`, user.id);
      if (rows?.[0]) profil = rows[0];
    } catch {}

    res.json({ user: { ...user, profil } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
