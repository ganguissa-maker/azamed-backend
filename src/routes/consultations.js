// src/routes/consultations.js — Propositions multiples + refus invisible côté patient
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/auth');
const prisma = new PrismaClient();

// ✅ GRILLE TARIFAIRE FIXE — le médecin ne peut pas la modifier
const TARIFS = {
  GENERALISTE: { CABINET: 10000, DOMICILE: 15000 },
  SPECIALISTE: { CABINET: 20000, DOMICILE: 25000 },
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
      "nomCabinet"      TEXT,
      "quartierCabinet" TEXT,
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
  await prisma.$executeRawUnsafe(`ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "nomCabinet" TEXT`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "quartierCabinet" TEXT`).catch(() => {});
  // ✅ Liste (JSON) des médecins ayant décliné une demande EN_ATTENTE, sans jamais proposer
  // — n'affecte que leur propre vue, jamais celle du patient ni des autres médecins.
  await prisma.$executeRawUnsafe(`ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "refusedBy" TEXT NOT NULL DEFAULT '[]'`).catch(() => {});

  // ✅ Une ligne par proposition de médecin — permet plusieurs propositions simultanées
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "consultation_propositions" (
      "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "consultationId"  TEXT NOT NULL,
      "medecinId"       TEXT NOT NULL,
      "lieu"            TEXT NOT NULL,
      "dateProposee"    TEXT,
      "heureProposee"   TEXT,
      "prix"            DECIMAL,
      "nomCabinet"       TEXT,
      "quartierCabinet"  TEXT,
      "statut"          TEXT NOT NULL DEFAULT 'EN_ATTENTE',
      "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "consultation_propositions_pkey" PRIMARY KEY ("id")
    )
  `).catch(() => {});

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

async function notifier(userId, type, titre, message, data) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "notifications_consult" ("userId","type","titre","message","data") VALUES ($1,$2,$3,$4,$5)`,
    userId, type, titre, message, data ? JSON.stringify(data) : null
  ).catch(() => {});
}

async function getProfil(userId) {
  try {
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "profils_utilisateurs" WHERE "userId"=$1`, userId);
    return rows[0] || {};
  } catch { return {}; }
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
    const profil  = await getProfil(req.user.id);

    const patientNom = profil.prenom ? `${profil.prenom} ${profil.nom || ''}`.trim() : patient.email;
    const typeLabel  = typeConsultation === 'GENERALISTE' ? 'Médecine générale' : `Spécialiste${specialite ? ` (${specialite})` : ''}`;

    const medecins = await prisma.user.findMany({ where:{ role:'MEDECIN', isActive:true }, select:{ id:true } });
    for (const med of medecins) {
      await notifier(med.id, 'DEMANDE_CONSULTATION', '🏥 Nouvelle demande de consultation',
        `${patientNom} demande une consultation en ${typeLabel}.${description ? ` "${description}"` : ''} Acceptez-vous ?`,
        { consultationId: consultation.id });
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

    if (req.user.role === 'MEDECIN') {
      const enAttente = await prisma.$queryRawUnsafe(
        `SELECT c.*,
           pu.prenom as "patientPrenom", pu.nom as "patientNom", pu.ville as "patientVille"
         FROM "consultations" c
         LEFT JOIN "profils_utilisateurs" pu ON pu."userId" = c."patientId"
         WHERE c."statut" = 'EN_ATTENTE'
           AND NOT (c."refusedBy"::jsonb ? $1)
           AND NOT EXISTS (
             SELECT 1 FROM "consultation_propositions" p
             WHERE p."consultationId" = c."id" AND p."medecinId" = $1 AND p."statut" = 'EN_ATTENTE'
           )
         ORDER BY c."createdAt" DESC LIMIT 50`,
        req.user.id
      );

      const mesPropositions = await prisma.$queryRawUnsafe(
        `SELECT p.*, c."typeConsultation", c."specialite", c."description", c."patientId", c."statut" as "consultationStatut",
           pu.prenom as "patientPrenom", pu.nom as "patientNom", pu.ville as "patientVille", pu.telephone as "patientTel",
           c."quartierPatient"
         FROM "consultation_propositions" p
         JOIN "consultations" c ON c."id" = p."consultationId"
         LEFT JOIN "profils_utilisateurs" pu ON pu."userId" = c."patientId"
         WHERE p."medecinId" = $1
         ORDER BY p."createdAt" DESC LIMIT 50`,
        req.user.id
      );
      const mesPropositionsSafe = mesPropositions.map((p) => {
        if (p.statut !== 'ACCEPTEE') { const { patientTel, ...rest } = p; return rest; }
        return p;
      });

      return res.json({ data: enAttente, propositions: mesPropositionsSafe });
    }

    const consultations = await prisma.$queryRawUnsafe(
      `SELECT * FROM "consultations" WHERE "patientId" = $1 ORDER BY "createdAt" DESC`,
      req.user.id
    );

    const consultationIds = consultations.map((c) => c.id);
    let propositions = [];
    if (consultationIds.length > 0) {
      propositions = await prisma.$queryRawUnsafe(
        `SELECT p.*, pm.prenom as "medecinPrenom", pm.nom as "medecinNom", pm.specialite as "medecinSpecialite"
         FROM "consultation_propositions" p
         LEFT JOIN "profils_utilisateurs" pm ON pm."userId" = p."medecinId"
         WHERE p."consultationId" = ANY($1) AND p."statut" = 'EN_ATTENTE'
         ORDER BY p."createdAt" ASC`,
        consultationIds
      );
    }

    const data = consultations.map((c) => ({
      ...c,
      propositions: propositions.filter((p) => p.consultationId === c.id),
    }));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/consultations/:id/accepter — Médecin propose ─────
router.put('/:id/accepter', protect, async (req, res) => {
  try {
    await ensureTables();
    if (req.user.role !== 'MEDECIN') return res.status(403).json({ error:'Réservé aux médecins.' });

    const { lieu, dateProposee, heureProposee, nomCabinet, quartierCabinet } = req.body;
    if (!['DOMICILE','CABINET'].includes(lieu)) {
      return res.status(400).json({ error:'Lieu invalide. Choisissez DOMICILE ou CABINET.' });
    }
    if (lieu === 'CABINET') {
      if (!nomCabinet || !nomCabinet.trim()) return res.status(400).json({ error:'Indiquez le nom de la structure sanitaire (cabinet).' });
      if (!quartierCabinet || !quartierCabinet.trim()) return res.status(400).json({ error:'Indiquez le quartier où se trouve le cabinet.' });
    }

    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM "consultations" WHERE "id"=$1`, req.params.id);
    if (!existing[0]) return res.status(404).json({ error:'Consultation introuvable.' });
    if (existing[0].statut !== 'EN_ATTENTE') {
      return res.status(400).json({ error:'Cette demande a déjà été prise en charge par un autre médecin.' });
    }

    const dejaPropose = await prisma.$queryRawUnsafe(
      `SELECT id FROM "consultation_propositions" WHERE "consultationId"=$1 AND "medecinId"=$2 AND "statut"='EN_ATTENTE'`,
      req.params.id, req.user.id
    );
    if (dejaPropose[0]) return res.status(400).json({ error:'Vous avez déjà une proposition en attente pour cette demande.' });

    const prix = calculerPrix(existing[0].typeConsultation, lieu);
    if (prix === null) return res.status(400).json({ error:'Impossible de calculer le tarif pour ce type de consultation.' });

    const propRows = await prisma.$queryRawUnsafe(
      `INSERT INTO "consultation_propositions"
        ("consultationId","medecinId","lieu","dateProposee","heureProposee","prix","nomCabinet","quartierCabinet","statut")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'EN_ATTENTE') RETURNING *`,
      req.params.id, req.user.id, lieu, dateProposee || null, heureProposee || null, prix,
      lieu === 'CABINET' ? nomCabinet.trim() : null,
      lieu === 'CABINET' ? quartierCabinet.trim() : null
    );

    const profilMed  = await getProfil(req.user.id);
    const medecinNom = profilMed.prenom ? `Dr. ${profilMed.prenom} ${profilMed.nom || ''}`.trim() : 'Un médecin';
    const lieuTxt     = lieu === 'DOMICILE' ? 'à votre domicile' : `dans son cabinet — ${nomCabinet.trim()} (${quartierCabinet.trim()})`;
    const dateTxt     = dateProposee ? ` le ${dateProposee}${heureProposee ? ` à ${heureProposee}` : ''}` : '';

    await notifier(existing[0].patientId, 'CONSULTATION_PROPOSEE', '⏳ Nouvelle proposition reçue',
      `${medecinNom} propose une consultation ${lieuTxt}${dateTxt} — Tarif : ${prix.toLocaleString()} FCFA.`,
      { consultationId: req.params.id, propositionId: propRows[0].id });

    res.json({ message:'Proposition envoyée. En attente de validation du patient.', prix, proposition: propRows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/consultations/propositions/:propId/valider — Patient choisit un médecin ─
router.put('/propositions/:propId/valider', protect, async (req, res) => {
  try {
    await ensureTables();
    if (req.user.role !== 'PATIENT') return res.status(403).json({ error:'Réservé aux patients.' });

    const propRows = await prisma.$queryRawUnsafe(`SELECT * FROM "consultation_propositions" WHERE "id"=$1`, req.params.propId);
    const proposition = propRows[0];
    if (!proposition) return res.status(404).json({ error:'Proposition introuvable.' });

    const consRows = await prisma.$queryRawUnsafe(`SELECT * FROM "consultations" WHERE "id"=$1`, proposition.consultationId);
    const consultation = consRows[0];
    if (!consultation || consultation.patientId !== req.user.id) return res.status(403).json({ error:'Non autorisé.' });
    if (consultation.statut !== 'EN_ATTENTE' || proposition.statut !== 'EN_ATTENTE') {
      return res.status(400).json({ error:'Cette proposition n\'est plus disponible.' });
    }

    await prisma.$executeRawUnsafe(`UPDATE "consultation_propositions" SET "statut"='ACCEPTEE', "updatedAt"=NOW() WHERE "id"=$1`, proposition.id);
    await prisma.$executeRawUnsafe(
      `UPDATE "consultations" SET "statut"='ACCEPTEE', "medecinId"=$1, "lieu"=$2, "dateProposee"=$3,
        "heureProposee"=$4, "prix"=$5, "nomCabinet"=$6, "quartierCabinet"=$7, "updatedAt"=NOW() WHERE "id"=$8`,
      proposition.medecinId, proposition.lieu, proposition.dateProposee, proposition.heureProposee,
      proposition.prix, proposition.nomCabinet, proposition.quartierCabinet, consultation.id
    );

    const autres = await prisma.$queryRawUnsafe(
      `SELECT * FROM "consultation_propositions" WHERE "consultationId"=$1 AND "id"!=$2 AND "statut"='EN_ATTENTE'`,
      consultation.id, proposition.id
    );
    for (const autre of autres) {
      await prisma.$executeRawUnsafe(`UPDATE "consultation_propositions" SET "statut"='ANNULEE', "updatedAt"=NOW() WHERE "id"=$1`, autre.id);
      await notifier(autre.medecinId, 'AUTRE_MEDECIN_CHOISI', 'ℹ️ Le patient a choisi un autre médecin',
        'Le patient a validé la proposition d\'un autre médecin pour cette demande de consultation. Merci pour votre disponibilité.',
        { consultationId: consultation.id });
    }

    const profilPat  = await getProfil(req.user.id);
    const patientNom = profilPat.prenom ? `${profilPat.prenom} ${profilPat.nom || ''}`.trim() : 'Le patient';
    const patientTel = profilPat.telephone || '';

    await notifier(proposition.medecinId, 'CONSULTATION_VALIDEE', '✅ Consultation confirmée !',
      `${patientNom} a confirmé votre proposition.${patientTel ? ` Contact patient : ${patientTel}` : ''}${profilPat.ville ? ` — ${profilPat.ville}` : ''}`,
      { consultationId: consultation.id, patientTel });

    res.json({ message:'Consultation validée ! Le médecin a été notifié et peut maintenant vous contacter.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/consultations/propositions/:propId/refuser — Patient refuse UNE proposition ─
router.put('/propositions/:propId/refuser', protect, async (req, res) => {
  try {
    await ensureTables();
    const propRows = await prisma.$queryRawUnsafe(`SELECT * FROM "consultation_propositions" WHERE "id"=$1`, req.params.propId);
    const proposition = propRows[0];
    if (!proposition) return res.status(404).json({ error:'Proposition introuvable.' });

    const consRows = await prisma.$queryRawUnsafe(`SELECT * FROM "consultations" WHERE "id"=$1`, proposition.consultationId);
    const consultation = consRows[0];
    if (!consultation || consultation.patientId !== req.user.id) return res.status(403).json({ error:'Non autorisé.' });
    if (proposition.statut !== 'EN_ATTENTE') return res.status(400).json({ error:'Cette proposition n\'est plus en attente.' });

    await prisma.$executeRawUnsafe(`UPDATE "consultation_propositions" SET "statut"='REFUSEE', "updatedAt"=NOW() WHERE "id"=$1`, proposition.id);

    await notifier(proposition.medecinId, 'PROPOSITION_REFUSEE', '❌ Proposition refusée',
      'Le patient a refusé votre proposition. La demande reste ouverte pour d\'autres médecins.',
      { consultationId: consultation.id });

    res.json({ message:'Proposition refusée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/consultations/:id/refuser — Médecin décline une demande EN_ATTENTE ─
router.put('/:id/refuser', protect, async (req, res) => {
  try {
    await ensureTables();
    if (req.user.role !== 'MEDECIN') return res.status(403).json({ error:'Réservé aux médecins.' });

    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM "consultations" WHERE "id"=$1`, req.params.id);
    if (!existing[0]) return res.status(404).json({ error:'Consultation introuvable.' });

    await prisma.$executeRawUnsafe(
      `UPDATE "consultations" SET "refusedBy" = (
         CASE WHEN "refusedBy"::jsonb ? $1 THEN "refusedBy"::jsonb
         ELSE "refusedBy"::jsonb || to_jsonb($1::text) END
       )::text, "updatedAt"=NOW() WHERE "id"=$2`,
      req.user.id, req.params.id
    );

    res.json({ message:'Demande masquée de votre liste. Elle reste ouverte pour les autres médecins.' });
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