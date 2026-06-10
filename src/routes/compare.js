// src/routes/compare.js
const express = require('express');
const router  = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/medicaments', async (req, res) => {
  try {
    const items = await prisma.pharmacieMedicament.findMany({
      where: { prix:{ not:null }, enStock:true, pharmacie:{ isVerified:true, isActive:true } },
      include: {
        medicament: { select:{ id:true, nomCommercial:true, dci:true, classeTherapeutique:true } },
        pharmacie:  { select:{ id:true, nomCommercial:true, ville:true } },
      },
      orderBy: { prix:'asc' },
    });
    const grouped = {};
    items.forEach((item) => {
      const key = item.medicament?.nomCommercial;
      if (!key) return;
      if (!grouped[key]) grouped[key] = { id:item.medicament.id, nom:key, dci:item.medicament.dci, classe:item.medicament.classeTherapeutique, prix:[] };
      grouped[key].prix.push({ prix:item.prix, structureId:item.pharmacie.id, structureNom:item.pharmacie.nomCommercial, ville:item.pharmacie.ville });
    });
    res.json({ data: Object.values(grouped).filter((g) => g.prix.length > 0) });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.get('/examens', async (req, res) => {
  try {
    const items = await prisma.laboExamen.findMany({
      where: { prix:{ not:null }, disponible:true, labo:{ isVerified:true, isActive:true } },
      include: {
        examen: { select:{ id:true, nom:true, categorie:true, codeAzamed:true } },
        labo:   { select:{ id:true, nomCommercial:true, ville:true } },
      },
      orderBy: { prix:'asc' },
    });
    const grouped = {};
    items.forEach((item) => {
      const key = item.examen?.nom;
      if (!key) return;
      if (!grouped[key]) grouped[key] = { id:item.examen.id, nom:key, categorie:item.examen.categorie, prix:[] };
      grouped[key].prix.push({ prix:item.prix, delaiMax:item.delaiMax, structureId:item.labo.id, structureNom:item.labo.nomCommercial, ville:item.labo.ville });
    });
    res.json({ data: Object.values(grouped).filter((g) => g.prix.length > 0) });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

router.get('/services', async (req, res) => {
  try {
    const items = await prisma.hopitalService.findMany({
      where: { prixConsultation:{ not:null }, disponible:true, hopital:{ isVerified:true, isActive:true } },
      include: {
        service: { select:{ id:true, nom:true, categorie:true } },
        hopital: { select:{ id:true, nomCommercial:true, ville:true, typeStructure:true } },
      },
      orderBy: { prixConsultation:'asc' },
    });
    const grouped = {};
    items.forEach((item) => {
      const key = item.service?.nom;
      if (!key) return;
      if (!grouped[key]) grouped[key] = { id:item.service.id, nom:key, categorie:item.service.categorie, prix:[] };
      grouped[key].prix.push({ prix:item.prixConsultation, mode:item.modeConsultation, structureId:item.hopital.id, structureNom:item.hopital.nomCommercial, ville:item.hopital.ville });
    });
    res.json({ data: Object.values(grouped).filter((g) => g.prix.length > 0) });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

module.exports = router;
