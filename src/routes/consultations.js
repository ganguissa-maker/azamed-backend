// src/routes/consultations.js — Prix FIXES selon type+lieu (médecin ne fixe que date/heure)
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/auth');
const prisma = new PrismaClient();

// ✅ GRILLE TARIFAIRE FIXE — le médecin ne peut pas la modifier
const TARIFS = {
  GENERALISTE: { CABINET: 5000,  DOMICILE: 10000 },
  SPECIALISTE: { CABINET: 15000, DOMICILE: 20000 },
};

function calculerPrix(typeConsultation, lieu) {
  const grille = TARIFS[typeConsultation];
  if (!grille) return null;
  return grille[lieu] ?? null;
}

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
      "quartierPatient" TEXT,
      "adressePatient"  TEXT,
      "prix"            DECIMAL,
      "statut"          TEXT NOT NULL DEFAULT 'EN_ATTENTE',
      "dateProposee"    TEXT,
      "heureProposee"   TEXT,
      "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "quartierPatient" TEXT`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "prix" DECIMAL`).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "notifications_consult" (
      "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId"    TEXT NOT NULL,
      "type"      TEXT NOT NULL,
      "titre"     TEXT NOT NULL,
      "message"   TEXT NOT NULL,
      "data"      TEXT,
      "isRead"    BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "notifications_consult_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});
}

// ── GET /api/consultations/tarifs — grille publique ───────────
router.get('/tarifs', (req, res) => res.json({ tarifs: TARIFS }));

// ── POST /api/consultations — Patient demande ─────────────────
router.post('/', protect, async (req, res) => {
  try {
    await ensureTables();
    const { typeConsultation, specialite, description, adressePatient, quartierPatient } = req.body;

    if (!['GENERALISTE','SPECIALISTE'].includes(typeConsultation)) {
      return res.status(400).json({ error: 'Type de consultation invalide.' });
    }

    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO "consultations"
        ("patientId","typeConsultation","specialite","description","adressePatient","quartierPatient","statut")
       VALUES ($1,$2,$3,$4,$5,$6,'EN_ATTENTE') RETURNING *`,
      req.user.id, typeConsultation, specialite || null,
      description || null, adressePatient || null, quartierPatient || null
    );
    const consultation = rows[0];

    const patient = await prisma.user.findUnique({ where:{ id:req.user.id }, select:{ email:true } });
    let profil = {};
    try {
      const pr = await prisma.$queryRawUnsafe(`SELECT * FROM "profils_utilisateurs" WHERE "userId"=$1`, req.user.id);
      profil = pr[0] || {};
    } catch {}

    const patientNom = profil.prenom ? `${profil.prenom} ${profil.nom || ''}`.trim() : patient.email;
    const typeLabel  = typeConsultation === 'GENERALISTE' ? 'Médecine générale' : `Spécialiste${specialite ? ` (${specialite})` : ''}`;

    const medecins = await prisma.user.findMany({ where:{ role:'MEDECIN', isActive:true }, select:{ id:true } });
    for (const med of medecins) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "notifications_consult" ("userId","type","titre","message","data") VALUES ($1,$2,$3,$4,$5)`,
        med.id, 'DEMANDE_CONSULTATION', '🏥 Nouvelle demande de consultation',
        `${patientNom} demande une consultation en ${typeLabel}.${description ? ` "${description}"` : ''} Acceptez-vous ?`,
        JSON.stringify({ consultationId: consultation.id })
      ).catch(() => {});
    }

    res.status(201).json({ message:'Demande envoyée. Les médecins ont été notifiés.', consultation, tarifs: TARIFS[typeConsultation] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/consultations/mes ────────────────────────────────
router.get('/mes', protect, async (req, res) => {
  try {
    await ensureTables();
    let rows;
    if (req.user.role === 'MEDECIN') {
      rows = await prisma.$queryRawUnsafe(
        `SELECT c.*,
           pu.prenom as "patientPrenom", pu.nom as "patientNom",
           pu.telephone as "patientTel", pu.ville as "patientVille"
         FROM "consultations" c
         LEFT JOIN "profils_utilisateurs" pu ON pu."userId" = c."patientId"
         WHERE c."statut" = 'EN_ATTENTE'
            OR (c."medecinId" = $1 AND c."statut" != 'EN_ATTENTE')
         ORDER BY c."createdAt" DESC LIMIT 50`,
        req.user.id
      );
      // ✅ Le téléphone patient n'est visible QUE si statut = ACCEPTEE (validé par le patient)
      rows = rows.map((r) => {
        if (r.statut !== 'ACCEPTEE') {
          const { patientTel, ...rest } = r;
          return rest;
        }
        return r;
      });
    } else {
      // Patient : jamais le téléphone du médecin
      rows = await prisma.$queryRawUnsafe(
        `SELECT c.*,
           pm.prenom as "medecinPrenom", pm.nom as "medecinNom",
           pm.specialite as "medecinSpecialite"
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

// ── PUT /api/consultations/:id/accepter — Médecin propose ─────
// ✅ Le médecin choisit UNIQUEMENT lieu + date + heure. Le prix est calculé automatiquement.
router.put('/:id/accepter', protect, async (req, res) => {
  try {
    await ensureTables();
    if (req.user.role !== 'MEDECIN') return res.status(403).json({ error:'Réservé aux médecins.' });

    const { lieu, dateProposee, heureProposee } = req.body;
    if (!['DOMICILE','CABINET'].includes(lieu)) {
      return res.status(400).json({ error:'Lieu invalide. Choisissez DOMICILE ou CABINET.' });
    }

    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM "consultations" WHERE "id"=$1`, req.params.id);
    if (!existing[0]) return res.status(404).json({ error:'Consultation introuvable.' });
    if (existing[0].statut !== 'EN_ATTENTE') {
      return res.status(400).json({ error:'Cette consultation a déjà été prise en charge.' });
    }

    // ✅ Calcul automatique du prix selon la grille fixe
    const prix = calculerPrix(existing[0].typeConsultation, lieu);
    if (prix === null) {
      return res.status(400).json({ error:'Impossible de calculer le tarif pour ce type de consultation.' });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "consultations" SET
        "medecinId"=$1, "statut"='PROPOSEE', "lieu"=$2,
        "dateProposee"=$3, "heureProposee"=$4, "prix"=$5, "updatedAt"=NOW()
       WHERE "id"=$6`,
      req.user.id, lieu, dateProposee || null, heureProposee || null, prix, req.params.id
    );

    let profilMed = {};
    try {
      const pm = await prisma.$queryRawUnsafe(`SELECT * FROM "profils_utilisateurs" WHERE "userId"=$1`, req.user.id);
      profilMed = pm[0] || {};
    } catch {}

    const medecinNom = profilMed.prenom ? `Dr. ${profilMed.prenom} ${profilMed.nom || ''}`.trim() : 'Un médecin';
    const lieuTxt    = lieu === 'DOMICILE' ? 'à votre domicile' : 'dans son cabinet';
    const dateTxt    = dateProposee ? ` le ${dateProposee}${heureProposee ? ` à ${heureProposee}` : ''}` : '';

    await prisma.$executeRawUnsafe(
      `INSERT INTO "notifications_consult" ("userId","type","titre","message","data") VALUES ($1,$2,$3,$4,$5)`,
      existing[0].patientId, 'CONSULTATION_PROPOSEE',
      '⏳ Consultation proposée — Votre validation requise',
      `${medecinNom} propose une consultation ${lieuTxt}${dateTxt} — Tarif : ${prix.toLocaleString()} FCFA. Veuillez valider ou refuser.`,
      JSON.stringify({ consultationId: req.params.id, medecinId: req.user.id, lieu, dateProposee, heureProposee, prix })
    ).catch(() => {});

    res.json({ message:'Proposition envoyée. En attente de validation du patient.', prix });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/consultations/:id/valider — Patient valide ───────
// ✅ Le téléphone du patient devient visible pour le médecin SEULEMENT après cette validation
router.put('/:id/valider', protect, async (req, res) => {
  try {
    await ensureTables();
    if (req.user.role !== 'PATIENT') return res.status(403).json({ error:'Réservé aux patients.' });

    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM "consultations" WHERE "id"=$1`, req.params.id);
    if (!existing[0]) return res.status(404).json({ error:'Consultation introuvable.' });
    if (existing[0].patientId !== req.user.id) return res.status(403).json({ error:'Non autorisé.' });
    if (existing[0].statut !== 'PROPOSEE') return res.status(400).json({ error:'Aucune proposition à valider.' });

    // ✅ Passage à ACCEPTEE = déclenche la visibilité du téléphone patient pour le médecin
    await prisma.$executeRawUnsafe(
      `UPDATE "consultations" SET "statut"='ACCEPTEE', "updatedAt"=NOW() WHERE "id"=$1`,
      req.params.id
    );

    let profilPat = {};
    try {
      const pp = await prisma.$queryRawUnsafe(`SELECT * FROM "profils_utilisateurs" WHERE "userId"=$1`, req.user.id);
      profilPat = pp[0] || {};
    } catch {}
    const patientNom = profilPat.prenom ? `${profilPat.prenom} ${profilPat.nom || ''}`.trim() : 'Le patient';
    const patientTel = profilPat.telephone || '';

    await prisma.$executeRawUnsafe(
      `INSERT INTO "notifications_consult" ("userId","type","titre","message","data") VALUES ($1,$2,$3,$4,$5)`,
      existing[0].medecinId, 'CONSULTATION_VALIDEE',
      '✅ Consultation confirmée !',
      `${patientNom} a confirmé la consultation.${patientTel ? ` Contact patient : ${patientTel}` : ''}${profilPat.ville ? ` — ${profilPat.ville}` : ''}`,
      JSON.stringify({ consultationId: req.params.id, patientTel, quartierPatient: existing[0].quartierPatient })
    ).catch(() => {});

    res.json({ message:'Consultation validée ! Le médecin a été notifié et peut maintenant vous contacter.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/consultations/:id/refuser-patient — Patient refuse ─
router.put('/:id/refuser-patient', protect, async (req, res) => {
  try {
    await ensureTables();
    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM "consultations" WHERE "id"=$1`, req.params.id);
    if (!existing[0]) return res.status(404).json({ error:'Consultation introuvable.' });
    if (existing[0].patientId !== req.user.id) return res.status(403).json({ error:'Non autorisé.' });

    await prisma.$executeRawUnsafe(
      `UPDATE "consultations" SET "statut"='EN_ATTENTE', "medecinId"=NULL, "lieu"=NULL,
        "dateProposee"=NULL, "heureProposee"=NULL, "prix"=NULL, "updatedAt"=NOW()
       WHERE "id"=$1`,
      req.params.id
    );

    if (existing[0].medecinId) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "notifications_consult" ("userId","type","titre","message","data") VALUES ($1,$2,$3,$4,$5)`,
        existing[0].medecinId, 'PROPOSITION_REFUSEE',
        '❌ Proposition refusée',
        'Le patient a refusé votre proposition. La demande reste ouverte pour d\'autres médecins.',
        JSON.stringify({ consultationId: req.params.id })
      ).catch(() => {});
    }

    res.json({ message:'Proposition refusée. La demande est à nouveau ouverte.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/consultations/:id/refuser — Médecin refuse ───────
router.put('/:id/refuser', protect, async (req, res) => {
  try {
    if (req.user.role !== 'MEDECIN') return res.status(403).json({ error:'Réservé aux médecins.' });
    await prisma.$executeRawUnsafe(
      `UPDATE "consultations" SET "statut"='REFUSEE', "updatedAt"=NOW() WHERE "id"=$1`,
      req.params.id
    );
    res.json({ message:'Consultation refusée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/consultations/:id/terminer ───────────────────────
router.put('/:id/terminer', protect, async (req, res) => {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "consultations" SET "statut"='TERMINEE', "updatedAt"=NOW() WHERE "id"=$1`,
      req.params.id
    );
    res.json({ message:'Consultation terminée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/consultations/notifications ──────────────────────
router.get('/notifications', protect, async (req, res) => {
  try {
    await ensureTables();
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "notifications_consult" WHERE "userId"=$1 ORDER BY "createdAt" DESC LIMIT 30`,
      req.user.id
    );
    const nonLues = rows.filter((n) => !n.isRead).length;
    res.json({ data: rows, nonLues });
  } catch {
    res.json({ data:[], nonLues:0 });
  }
});

router.put('/notifications/:id/lire', protect, async (req, res) => {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "notifications_consult" SET "isRead"=true WHERE "id"=$1 AND "userId"=$2`,
      req.params.id, req.user.id
    );
    res.json({ ok:true });
  } catch (err) {
    res.status(500).json({ error:err.message });
  }
});

module.exports = router;
