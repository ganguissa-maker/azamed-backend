// src/routes/abonnements.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, structureOnly } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

const TARIFS = {
  PREMIUM1: { montant: 15000, devise: 'XOF', label: 'Premium 1 - 1 mois' },
  PREMIUM2: { montant: 35000, devise: 'XOF', label: 'Premium 2 - 1 mois' },
};

// ─── GET /api/abonnements/tarifs ─────────────────────────────
router.get('/tarifs', (req, res) => {
  res.json(TARIFS);
});

// ─── GET /api/abonnements/mon-abonnement ─────────────────────
router.get('/mon-abonnement', protect, structureOnly, async (req, res) => {
  try {
    const structure = await prisma.structure.findUnique({ where: { userId: req.user.id } });
    if (!structure) return res.status(404).json({ error: 'Structure non trouvée.' });

    const abonnement = await prisma.abonnement.findFirst({
      where: { structureId: structure.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(abonnement);
  } catch (err) {
    res.status(500).json({ error: 'Erreur.' });
  }
});

// ─── POST /api/abonnements/initier ───────────────────────────
// Démarre un paiement CinetPay (Mobile Money)
router.post('/initier', protect, structureOnly, async (req, res) => {
  try {
    const { niveau } = req.body; // 'PREMIUM1' | 'PREMIUM2'

    if (!TARIFS[niveau]) {
      return res.status(400).json({ error: 'Niveau invalide. Choisir PREMIUM1 ou PREMIUM2.' });
    }

    const structure = await prisma.structure.findUnique({ where: { userId: req.user.id } });
    if (!structure) return res.status(404).json({ error: 'Structure non trouvée.' });

    const transactionId = `AZA-${uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()}`;
    const tarif = TARIFS[niveau];

    // Créer l'abonnement en attente
    const abonnement = await prisma.abonnement.create({
      data: {
        structureId: structure.id,
        niveau,
        dateDebut: new Date(),
        dateFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
        montant: tarif.montant,
        devise: tarif.devise,
        statutPaiement: 'EN_ATTENTE',
        transactionId,
      },
    });

    // Payload CinetPay (intégration Mobile Money Afrique)
    const cinetpayPayload = {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: tarif.montant,
      currency: 'XOF',
      description: `AZAMED - ${tarif.label}`,
      customer_email: req.user.email,
      customer_name: structure.nomCommercial,
      notify_url: process.env.CINETPAY_NOTIFY_URL,
      return_url: `${process.env.FRONTEND_URL}/dashboard/abonnement?status=success`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/abonnement?status=cancel`,
    };

    // En production: appeler l'API CinetPay
    // const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', { ... })

    // Pour le développement, retourner les infos
    res.json({
      message: 'Paiement initié.',
      transactionId,
      abonnementId: abonnement.id,
      montant: tarif.montant,
      devise: tarif.devise,
      niveau,
      // En production: paymentUrl depuis CinetPay
      paymentUrl: `https://checkout.cinetpay.com/v1/?transaction_id=${transactionId}`,
      cinetpayPayload, // à retirer en production
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur initiation paiement.' });
  }
});

// ─── POST /api/abonnements/confirmer — Webhook CinetPay ──────
router.post('/confirmer', async (req, res) => {
  try {
    const { transaction_id, status, payment_method } = req.body;

    if (!transaction_id) return res.status(400).json({ error: 'transaction_id manquant.' });

    const abonnement = await prisma.abonnement.findFirst({
      where: { transactionId: transaction_id },
    });

    if (!abonnement) return res.status(404).json({ error: 'Abonnement non trouvé.' });

    if (status === 'ACCEPTED') {
      // Paiement confirmé — activer l'abonnement
      await prisma.abonnement.update({
        where: { id: abonnement.id },
        data: {
          statutPaiement: 'CONFIRME',
          methodePaiement: payment_method,
        },
      });

      // Désactiver les anciens abonnements
      await prisma.abonnement.updateMany({
        where: {
          structureId: abonnement.structureId,
          id: { not: abonnement.id },
          statutPaiement: 'CONFIRME',
        },
        data: { statutPaiement: 'REMBOURSE' },
      });
    } else {
      await prisma.abonnement.update({
        where: { id: abonnement.id },
        data: { statutPaiement: 'ECHOUE' },
      });
    }

    res.json({ message: 'Webhook traité.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur webhook.' });
  }
});

module.exports = router;
