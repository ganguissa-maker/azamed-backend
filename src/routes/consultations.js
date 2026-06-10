// src/routes/consultations.js — Système de consultations médecin-patient
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/auth');
const prisma = new PrismaClient();

// Créer la table consultations si elle n'existe pas
async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "consultations" (
      "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "patientId"       TEXT NOT NULL,
      "medecinId"       TEXT,
      "typeConsultation" TEXT NOT NULL DEFAULT 'GENERALISTE',
      "specialite"      TEXT,
      "description"     TEXT,
      "lieu"            TEXT,
      "adressePatient"  TEXT,
      "statut"          TEXT NOT NULL DEFAULT 'EN_ATTENTE',
      "dateProposee"    TEXT,
      "heureProposee"   TEXT,
      "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "notifications_consult" (
      "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId"         TEXT NOT NULL,
      "type"           TEXT NOT NULL,
      "titre"          TEXT NOT NULL,
      "message"        TEXT NOT NULL,
      "data"           TEXT,
      "isRead"         BOOLEAN NOT NULL DEFAULT false,
      "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "notifications_consult_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});
}

// ── POST /api/consultations — Demander une consultation ────────
// Le patient envoie une demande → notifier tous les médecins
router.post('/', protect, async (req, res) => {
  try {
    await ensureTables();
    const { typeConsultation, specialite, description, adressePatient } = req.body;

    if (!['GENERALISTE','SPECIALISTE'].includes(typeConsultation)) {
      return res.status(400).json({ error: 'Type de consultation invalide.' });
    }

    // Créer la consultation
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO "consultations" ("patientId","typeConsultation","specialite","description","adressePatient","statut")
       VALUES ($1,$2,$3,$4,$5,'EN_ATTENTE') RETURNING *`,
      req.user.id,
      typeConsultation,
      specialite || null,
      description || null,
      adressePatient || null
    );
    const consultation = rows[0];

    // Récupérer les infos patient
    const patient = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true },
    });

    let profil = {};
    try {
      const pr = await prisma.$queryRawUnsafe(
        `SELECT * FROM "profils_utilisateurs" WHERE "userId" = $1`, req.user.id
      );
      profil = pr[0] || {};
    } catch {}

    const patientNom = profil.prenom
      ? `${profil.prenom} ${profil.nom || ''}`.trim()
      : patient.email;

    // Notifier TOUS les médecins actifs
    const medecins = await prisma.user.findMany({
      where: { role: 'MEDECIN', isActive: true },
      select: { id: true },
    });

    const typeLabel  = typeConsultation === 'GENERALISTE' ? 'Médecine générale' : `Spécialiste${specialite ? ` (${specialite})` : ''}`;
    const notifData  = JSON.stringify({ consultationId: consultation.id });

    for (const med of medecins) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "notifications_consult" ("userId","type","titre","message","data")
         VALUES ($1,$2,$3,$4,$5)`,
        med.id,
        'DEMANDE_CONSULTATION',
        `🏥 Nouvelle demande de consultation`,
        `${patientNom} demande une consultation en ${typeLabel}.${description ? ` "${description}"` : ''} Acceptez-vous ?`,
        notifData
      ).catch(() => {});
    }

    res.status(201).json({
      message: 'Demande de consultation envoyée. Les médecins ont été notifiés.',
      consultation,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/consultations/mes — Mes consultations (patient ou médecin) ──
router.get('/mes', protect, async (req, res) => {
  try {
    await ensureTables();
    let rows;
    if (req.user.role === 'MEDECIN') {
      // Médecin : ses consultations acceptées + toutes en attente
      rows = await prisma.$queryRawUnsafe(
        `SELECT c.*, 
           pu.prenom as "patientPrenom", pu.nom as "patientNom",
           pu.telephone as "patientTel", pu.ville as "patientVille"
         FROM "consultations" c
         LEFT JOIN "profils_utilisateurs" pu ON pu."userId" = c."patientId"
         WHERE c."medecinId" = $1 OR c."statut" = 'EN_ATTENTE'
         ORDER BY c."createdAt" DESC
         LIMIT 50`,
        req.user.id
      );
    } else {
      // Patient : ses propres consultations
      rows = await prisma.$queryRawUnsafe(
        `SELECT c.*,
           pm.prenom as "medecinPrenom", pm.nom as "medecinNom",
           pm.specialite as "medecinSpecialite", pm.telephone as "medecinTel"
         FROM "consultations" c
         LEFT JOIN "profils_utilisateurs" pm ON pm."userId" = c."medecinId"
         WHERE c."patientId" = $1
         ORDER BY c."createdAt" DESC`,
        req.user.id
      );
    }
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/consultations/:id/accepter — Médecin accepte ─────
router.put('/:id/accepter', protect, async (req, res) => {
  try {
    await ensureTables();
    if (req.user.role !== 'MEDECIN') {
      return res.status(403).json({ error: 'Réservé aux médecins.' });
    }
    const { lieu, dateProposee, heureProposee, adressePatient } = req.body;
    // lieu : 'DOMICILE' ou 'CABINET'

    if (!['DOMICILE','CABINET'].includes(lieu)) {
      return res.status(400).json({ error: 'Lieu invalide. Choisissez DOMICILE ou CABINET.' });
    }

    // Vérifier que la consultation est encore en attente
    const existing = await prisma.$queryRawUnsafe(
      `SELECT * FROM "consultations" WHERE "id" = $1`, req.params.id
    );
    if (!existing[0]) return res.status(404).json({ error: 'Consultation introuvable.' });
    if (existing[0].statut !== 'EN_ATTENTE') {
      return res.status(400).json({ error: 'Cette consultation a déjà été prise en charge.' });
    }

    // Mettre à jour
    await prisma.$executeRawUnsafe(
      `UPDATE "consultations" SET
        "medecinId" = $1, "statut" = 'ACCEPTEE', "lieu" = $2,
        "dateProposee" = $3, "heureProposee" = $4, "updatedAt" = NOW()
       WHERE "id" = $5`,
      req.user.id, lieu, dateProposee || null, heureProposee || null, req.params.id
    );

    // Récupérer infos médecin
    let profilMedecin = {};
    try {
      const pm = await prisma.$queryRawUnsafe(
        `SELECT * FROM "profils_utilisateurs" WHERE "userId" = $1`, req.user.id
      );
      profilMedecin = pm[0] || {};
    } catch {}

    const medecinNom = profilMedecin.prenom
      ? `Dr. ${profilMedecin.prenom} ${profilMedecin.nom || ''}`.trim()
      : 'Un médecin';

    const lieuTxt = lieu === 'DOMICILE'
      ? `à votre domicile${adressePatient ? ` (${adressePatient})` : ''}`
      : 'dans son cabinet';

    const dateTxt = dateProposee && heureProposee
      ? ` le ${dateProposee} à ${heureProposee}`
      : dateProposee ? ` le ${dateProposee}` : '';

    // Notifier le patient
    const consultation = existing[0];
    await prisma.$executeRawUnsafe(
      `INSERT INTO "notifications_consult" ("userId","type","titre","message","data")
       VALUES ($1,$2,$3,$4,$5)`,
      consultation.patientId,
      'CONSULTATION_ACCEPTEE',
      '✅ Consultation acceptée !',
      `${medecinNom} a accepté votre demande de consultation ${lieuTxt}${dateTxt}.${profilMedecin.specialite ? ` Spécialité : ${profilMedecin.specialite}.` : ''}`,
      JSON.stringify({ consultationId: req.params.id, medecinId: req.user.id, lieu, dateProposee, heureProposee })
    ).catch(() => {});

    res.json({ message: 'Consultation acceptée. Le patient a été notifié.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/consultations/:id/refuser — Médecin refuse ───────
router.put('/:id/refuser', protect, async (req, res) => {
  try {
    await ensureTables();
    if (req.user.role !== 'MEDECIN') {
      return res.status(403).json({ error: 'Réservé aux médecins.' });
    }
    await prisma.$executeRawUnsafe(
      `UPDATE "consultations" SET "statut" = 'REFUSEE', "updatedAt" = NOW() WHERE "id" = $1`,
      req.params.id
    );
    res.json({ message: 'Consultation refusée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/consultations/:id/terminer — Marquer terminée ───
router.put('/:id/terminer', protect, async (req, res) => {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "consultations" SET "statut" = 'TERMINEE', "updatedAt" = NOW() WHERE "id" = $1`,
      req.params.id
    );
    res.json({ message: 'Consultation marquée comme terminée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/consultations/notifications — Mes notifs consult ─
router.get('/notifications', protect, async (req, res) => {
  try {
    await ensureTables();
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "notifications_consult" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 30`,
      req.user.id
    );
    const nonLues = rows.filter((n) => !n.isRead).length;
    res.json({ data: rows, nonLues });
  } catch {
    res.json({ data: [], nonLues: 0 });
  }
});

// ── PUT /api/consultations/notifications/:id/lire ─────────────
router.put('/notifications/:id/lire', protect, async (req, res) => {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "notifications_consult" SET "isRead" = true WHERE "id" = $1 AND "userId" = $2`,
      req.params.id, req.user.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
