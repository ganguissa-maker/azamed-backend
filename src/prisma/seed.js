// seed.js — Base médicale complète du Cameroun
// Médicaments autorisés (DPM/MINSANTE), Examens, Services médicaux

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed AZAMED Cameroun — démarrage...');

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('Admin@AZAMED2024', 10);
  await prisma.user.upsert({
    where: { email: 'admin@azamed.com' },
    update: {},
    create: { email: 'admin@azamed.com', passwordHash: hash, role: 'ADMIN', isVerified: true },
  });
  console.log('✅ Admin : admin@azamed.com / Admin@AZAMED2024');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. MÉDICAMENTS — Liste nationale Cameroun (DPM MINSANTE + marché local)
  // ══════════════════════════════════════════════════════════════════════════
  const medicaments = [
    // ── ANALGÉSIQUES / ANTIPYRÉTIQUES ──────────────────────────────────────
    { nomCommercial:'Paracétamol 500mg Comprimé', dci:'Paracétamol', classeTherapeutique:'Analgésique / Antipyrétique', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Paracétamol 1000mg Comprimé', dci:'Paracétamol', classeTherapeutique:'Analgésique / Antipyrétique', forme:'Comprimé effervescent', dosage:'1000mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Paracétamol Sirop 120mg/5ml', dci:'Paracétamol', classeTherapeutique:'Analgésique / Antipyrétique pédiatrique', forme:'Sirop', dosage:'120mg/5ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Paracétamol Suppositoire 150mg', dci:'Paracétamol', classeTherapeutique:'Analgésique / Antipyrétique pédiatrique', forme:'Suppositoire', dosage:'150mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Efferalgan 500mg', dci:'Paracétamol', classeTherapeutique:'Analgésique / Antipyrétique', forme:'Comprimé effervescent', dosage:'500mg', laboratoireFabricant:'UPSA' },
    { nomCommercial:'Doliprane 1000mg', dci:'Paracétamol', classeTherapeutique:'Analgésique / Antipyrétique', forme:'Comprimé', dosage:'1000mg', laboratoireFabricant:'Sanofi' },
    { nomCommercial:'Ibuprofène 200mg', dci:'Ibuprofène', classeTherapeutique:'AINS', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ibuprofène 400mg', dci:'Ibuprofène', classeTherapeutique:'AINS', forme:'Comprimé enrobé', dosage:'400mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ibuprofène Sirop 100mg/5ml', dci:'Ibuprofène', classeTherapeutique:'AINS pédiatrique', forme:'Sirop', dosage:'100mg/5ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Advil 400mg', dci:'Ibuprofène', classeTherapeutique:'AINS', forme:'Comprimé enrobé', dosage:'400mg', laboratoireFabricant:'Pfizer' },
    { nomCommercial:'Diclofénac 50mg Comprimé', dci:'Diclofénac sodique', classeTherapeutique:'AINS', forme:'Comprimé gastrorésistant', dosage:'50mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Diclofénac 75mg Injectable', dci:'Diclofénac sodique', classeTherapeutique:'AINS Injectable', forme:'Solution injectable IM', dosage:'75mg/3ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Voltarène 50mg', dci:'Diclofénac sodique', classeTherapeutique:'AINS', forme:'Comprimé', dosage:'50mg', laboratoireFabricant:'Novartis' },
    { nomCommercial:'Acide acétylsalicylique 500mg', dci:'Aspirine', classeTherapeutique:'Analgésique / Antiagrégant', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Aspirine 100mg Cardio', dci:'Aspirine', classeTherapeutique:'Antiagrégant plaquettaire', forme:'Comprimé gastrorésistant', dosage:'100mg', laboratoireFabricant:'Bayer' },
    { nomCommercial:'Tramadol 50mg', dci:'Tramadol', classeTherapeutique:'Analgésique opioïde faible', forme:'Gélule', dosage:'50mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Tramadol 100mg LP', dci:'Tramadol', classeTherapeutique:'Analgésique opioïde faible', forme:'Comprimé LP', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Morphine 10mg Injectable', dci:'Morphine', classeTherapeutique:'Analgésique opioïde fort', forme:'Solution injectable', dosage:'10mg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Néfopam 20mg Injectable', dci:'Néfopam', classeTherapeutique:'Analgésique central', forme:'Solution injectable', dosage:'20mg/2ml', laboratoireFabricant:'Biocodex' },
    { nomCommercial:'Kétoprofène 100mg Injectable', dci:'Kétoprofène', classeTherapeutique:'AINS injectable', forme:'Solution injectable IV/IM', dosage:'100mg/2ml', laboratoireFabricant:'Générique' },

    // ── ANTIPALUDÉENS ──────────────────────────────────────────────────────
    { nomCommercial:'Coartem 20/120mg Adulte', dci:'Artéméther + Luméfantrine', classeTherapeutique:'Antipaludéen - Combinaison', forme:'Comprimé', dosage:'20mg/120mg', laboratoireFabricant:'Novartis' },
    { nomCommercial:'Coartem 20/120mg Pédiatrique', dci:'Artéméther + Luméfantrine', classeTherapeutique:'Antipaludéen - Combinaison pédiatrique', forme:'Comprimé dispersible', dosage:'20mg/120mg', laboratoireFabricant:'Novartis' },
    { nomCommercial:'Artéméther-Luméfantrine Générique', dci:'Artéméther + Luméfantrine', classeTherapeutique:'Antipaludéen - Combinaison', forme:'Comprimé', dosage:'20mg/120mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Artésunate 50mg Comprimé', dci:'Artésunate', classeTherapeutique:'Antipaludéen - Artémisinine', forme:'Comprimé', dosage:'50mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Artésunate 60mg Injectable', dci:'Artésunate', classeTherapeutique:'Antipaludéen grave - Injectable', forme:'Poudre pour solution injectable', dosage:'60mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Artésunate 200mg Injectable', dci:'Artésunate', classeTherapeutique:'Antipaludéen grave - Injectable', forme:'Poudre pour solution injectable', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Quinine 300mg Comprimé', dci:'Quinine', classeTherapeutique:'Antipaludéen - Quinoléine', forme:'Comprimé', dosage:'300mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Quinine 500mg Injectable', dci:'Quinine dichlorhydrate', classeTherapeutique:'Antipaludéen grave - IV', forme:'Solution injectable IV', dosage:'500mg/2ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Chloroquine 100mg', dci:'Chloroquine', classeTherapeutique:'Antipaludéen / Anti-inflammatoire', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Chloroquine 250mg', dci:'Chloroquine', classeTherapeutique:'Antipaludéen / Anti-inflammatoire', forme:'Comprimé', dosage:'250mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Fansidar (Sulfadoxine-Pyriméthamine)', dci:'Sulfadoxine + Pyriméthamine', classeTherapeutique:'Antipaludéen préventif - TPI', forme:'Comprimé', dosage:'500mg/25mg', laboratoireFabricant:'Roche' },
    { nomCommercial:'Dihydroartémisinine-Pipéraquine', dci:'DHA + Pipéraquine', classeTherapeutique:'Antipaludéen - Combinaison', forme:'Comprimé', dosage:'40mg/320mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Méfloquine 250mg', dci:'Méfloquine', classeTherapeutique:'Antipaludéen - Quinoléine', forme:'Comprimé', dosage:'250mg', laboratoireFabricant:'Roche' },
    { nomCommercial:'Artéméther 80mg Injectable', dci:'Artéméther', classeTherapeutique:'Antipaludéen grave - IM', forme:'Solution injectable IM', dosage:'80mg/ml', laboratoireFabricant:'Générique' },

    // ── ANTIBIOTIQUES — PÉNICILLINES ───────────────────────────────────────
    { nomCommercial:'Amoxicilline 250mg Gélule', dci:'Amoxicilline', classeTherapeutique:'Antibiotique - Pénicilline', forme:'Gélule', dosage:'250mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Amoxicilline 500mg Gélule', dci:'Amoxicilline', classeTherapeutique:'Antibiotique - Pénicilline', forme:'Gélule', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Amoxicilline 1g Comprimé', dci:'Amoxicilline', classeTherapeutique:'Antibiotique - Pénicilline', forme:'Comprimé dispersible', dosage:'1g', laboratoireFabricant:'Générique' },
    { nomCommercial:'Amoxicilline Sirop 125mg/5ml', dci:'Amoxicilline', classeTherapeutique:'Antibiotique - Pénicilline pédiatrique', forme:'Poudre pour sirop', dosage:'125mg/5ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Amoxicilline Sirop 250mg/5ml', dci:'Amoxicilline', classeTherapeutique:'Antibiotique - Pénicilline pédiatrique', forme:'Poudre pour sirop', dosage:'250mg/5ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Augmentin 500mg/125mg', dci:'Amoxicilline + Acide clavulanique', classeTherapeutique:'Antibiotique - Pénicilline protégée', forme:'Comprimé', dosage:'500mg/125mg', laboratoireFabricant:'GSK' },
    { nomCommercial:'Augmentin 1g/125mg', dci:'Amoxicilline + Acide clavulanique', classeTherapeutique:'Antibiotique - Pénicilline protégée', forme:'Comprimé', dosage:'1g/125mg', laboratoireFabricant:'GSK' },
    { nomCommercial:'Augmentin Sirop 125mg/31,25mg', dci:'Amoxicilline + Acide clavulanique', classeTherapeutique:'Antibiotique - Pénicilline protégée pédiatrique', forme:'Sirop', dosage:'125mg/31,25mg/5ml', laboratoireFabricant:'GSK' },
    { nomCommercial:'Ampicilline 500mg Gélule', dci:'Ampicilline', classeTherapeutique:'Antibiotique - Pénicilline', forme:'Gélule', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ampicilline 1g Injectable', dci:'Ampicilline', classeTherapeutique:'Antibiotique - Pénicilline injectable', forme:'Poudre injectable IV/IM', dosage:'1g', laboratoireFabricant:'Générique' },
    { nomCommercial:'Benzathine Pénicilline 1,2MUI', dci:'Benzathine benzylpénicilline', classeTherapeutique:'Antibiotique - Pénicilline retard', forme:'Poudre injectable IM', dosage:'1 200 000 UI', laboratoireFabricant:'Générique' },
    { nomCommercial:'Benzathine Pénicilline 2,4MUI', dci:'Benzathine benzylpénicilline', classeTherapeutique:'Antibiotique - Pénicilline retard', forme:'Poudre injectable IM', dosage:'2 400 000 UI', laboratoireFabricant:'Générique' },
    { nomCommercial:'Pénicilline G 5MUI Injectable', dci:'Benzylpénicilline sodique', classeTherapeutique:'Antibiotique - Pénicilline IV', forme:'Poudre injectable IV', dosage:'5 000 000 UI', laboratoireFabricant:'Générique' },
    { nomCommercial:'Cloxacilline 500mg', dci:'Cloxacilline', classeTherapeutique:'Antibiotique - Pénicilline M (staphylocoques)', forme:'Gélule', dosage:'500mg', laboratoireFabricant:'Générique' },

    // ── ANTIBIOTIQUES — SULFONAMIDES ───────────────────────────────────────
    { nomCommercial:'Cotrimoxazole 480mg', dci:'Sulfaméthoxazole + Triméthoprime', classeTherapeutique:'Antibiotique - Sulfonamide', forme:'Comprimé', dosage:'400mg/80mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Cotrimoxazole Forte 960mg', dci:'Sulfaméthoxazole + Triméthoprime', classeTherapeutique:'Antibiotique - Sulfonamide', forme:'Comprimé', dosage:'800mg/160mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Cotrimoxazole Sirop Pédiatrique', dci:'Sulfaméthoxazole + Triméthoprime', classeTherapeutique:'Antibiotique - Sulfonamide pédiatrique', forme:'Sirop', dosage:'200mg/40mg/5ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Cotrimoxazole Injectable', dci:'Sulfaméthoxazole + Triméthoprime', classeTherapeutique:'Antibiotique - Sulfonamide injectable', forme:'Solution injectable IV', dosage:'400mg/80mg/5ml', laboratoireFabricant:'Générique' },

    // ── ANTIBIOTIQUES — IMIDAZOLÉS ─────────────────────────────────────────
    { nomCommercial:'Métronidazole 250mg Comprimé', dci:'Métronidazole', classeTherapeutique:'Antibiotique - Imidazolé', forme:'Comprimé', dosage:'250mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Métronidazole 500mg Comprimé', dci:'Métronidazole', classeTherapeutique:'Antibiotique - Imidazolé', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Flagyl 500mg', dci:'Métronidazole', classeTherapeutique:'Antibiotique - Imidazolé', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Sanofi' },
    { nomCommercial:'Métronidazole 500mg Injectable', dci:'Métronidazole', classeTherapeutique:'Antibiotique - Imidazolé injectable', forme:'Solution injectable IV', dosage:'500mg/100ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Métronidazole Sirop 125mg/5ml', dci:'Métronidazole', classeTherapeutique:'Antibiotique - Imidazolé pédiatrique', forme:'Sirop', dosage:'125mg/5ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Métronidazole Ovule 500mg', dci:'Métronidazole', classeTherapeutique:'Antibiotique - Imidazolé gynécologique', forme:'Ovule vaginal', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ornidazole 500mg', dci:'Ornidazole', classeTherapeutique:'Antibiotique - Imidazolé', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Secnidazole 500mg', dci:'Secnidazole', classeTherapeutique:'Antibiotique - Imidazolé (dose unique)', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },

    // ── ANTIBIOTIQUES — FLUOROQUINOLONES ──────────────────────────────────
    { nomCommercial:'Ciprofloxacine 250mg', dci:'Ciprofloxacine', classeTherapeutique:'Antibiotique - Fluoroquinolone', forme:'Comprimé', dosage:'250mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ciprofloxacine 500mg', dci:'Ciprofloxacine', classeTherapeutique:'Antibiotique - Fluoroquinolone', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ciprofloxacine 200mg Injectable', dci:'Ciprofloxacine', classeTherapeutique:'Antibiotique - Fluoroquinolone injectable', forme:'Solution injectable IV', dosage:'200mg/100ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ofloxacine 200mg', dci:'Ofloxacine', classeTherapeutique:'Antibiotique - Fluoroquinolone', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Lévofloxacine 500mg', dci:'Lévofloxacine', classeTherapeutique:'Antibiotique - Fluoroquinolone', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Norfloxacine 400mg', dci:'Norfloxacine', classeTherapeutique:'Antibiotique - Fluoroquinolone urinaire', forme:'Comprimé', dosage:'400mg', laboratoireFabricant:'Générique' },

    // ── ANTIBIOTIQUES — MACROLIDES ─────────────────────────────────────────
    { nomCommercial:'Azithromycine 250mg', dci:'Azithromycine', classeTherapeutique:'Antibiotique - Macrolide', forme:'Gélule', dosage:'250mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Azithromycine 500mg', dci:'Azithromycine', classeTherapeutique:'Antibiotique - Macrolide', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Zithromax 250mg', dci:'Azithromycine', classeTherapeutique:'Antibiotique - Macrolide', forme:'Gélule', dosage:'250mg', laboratoireFabricant:'Pfizer' },
    { nomCommercial:'Érythromycine 250mg', dci:'Érythromycine', classeTherapeutique:'Antibiotique - Macrolide', forme:'Comprimé gastrorésistant', dosage:'250mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Érythromycine 500mg', dci:'Érythromycine', classeTherapeutique:'Antibiotique - Macrolide', forme:'Comprimé gastrorésistant', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Clarithromycine 500mg', dci:'Clarithromycine', classeTherapeutique:'Antibiotique - Macrolide', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Spiramycine 1,5MUI', dci:'Spiramycine', classeTherapeutique:'Antibiotique - Macrolide', forme:'Comprimé', dosage:'1 500 000 UI', laboratoireFabricant:'Générique' },

    // ── ANTIBIOTIQUES — CÉPHALOSPORINES ───────────────────────────────────
    { nomCommercial:'Ceftriaxone 500mg Injectable', dci:'Ceftriaxone', classeTherapeutique:'Antibiotique - Céphalosporine 3G', forme:'Poudre injectable IV/IM', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ceftriaxone 1g Injectable', dci:'Ceftriaxone', classeTherapeutique:'Antibiotique - Céphalosporine 3G', forme:'Poudre injectable IV/IM', dosage:'1g', laboratoireFabricant:'Générique' },
    { nomCommercial:'Céfixime 200mg', dci:'Céfixime', classeTherapeutique:'Antibiotique - Céphalosporine 3G oral', forme:'Gélule', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Céfuroxime 500mg', dci:'Céfuroxime', classeTherapeutique:'Antibiotique - Céphalosporine 2G', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Céfalexine 500mg', dci:'Céfalexine', classeTherapeutique:'Antibiotique - Céphalosporine 1G', forme:'Gélule', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Céfotaxime 1g Injectable', dci:'Céfotaxime', classeTherapeutique:'Antibiotique - Céphalosporine 3G injectable', forme:'Poudre injectable IV/IM', dosage:'1g', laboratoireFabricant:'Générique' },

    // ── ANTIBIOTIQUES — AMINOSIDES ─────────────────────────────────────────
    { nomCommercial:'Gentamicine 40mg Injectable', dci:'Gentamicine', classeTherapeutique:'Antibiotique - Aminoside', forme:'Solution injectable IM/IV', dosage:'40mg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Gentamicine 80mg Injectable', dci:'Gentamicine', classeTherapeutique:'Antibiotique - Aminoside', forme:'Solution injectable IM/IV', dosage:'80mg/2ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Streptomycine 1g Injectable', dci:'Streptomycine', classeTherapeutique:'Antituberculeux / Aminoside', forme:'Poudre injectable IM', dosage:'1g', laboratoireFabricant:'Générique' },
    { nomCommercial:'Amikacine 500mg Injectable', dci:'Amikacine', classeTherapeutique:'Antibiotique - Aminoside', forme:'Solution injectable IV/IM', dosage:'500mg/2ml', laboratoireFabricant:'Générique' },

    // ── ANTIBIOTIQUES — TÉTRACYCLINES ──────────────────────────────────────
    { nomCommercial:'Doxycycline 100mg', dci:'Doxycycline', classeTherapeutique:'Antibiotique - Tétracycline', forme:'Gélule', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Tétracycline 250mg', dci:'Tétracycline', classeTherapeutique:'Antibiotique - Tétracycline', forme:'Gélule', dosage:'250mg', laboratoireFabricant:'Générique' },

    // ── ANTIBIOTIQUES — AUTRES ─────────────────────────────────────────────
    { nomCommercial:'Chloramphénicol 250mg', dci:'Chloramphénicol', classeTherapeutique:'Antibiotique - Phénicolé', forme:'Gélule', dosage:'250mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Chloramphénicol 1g Injectable', dci:'Chloramphénicol sodique succinate', classeTherapeutique:'Antibiotique - Phénicolé injectable', forme:'Poudre injectable IV', dosage:'1g', laboratoireFabricant:'Générique' },
    { nomCommercial:'Nitrofurantoïne 100mg', dci:'Nitrofurantoïne', classeTherapeutique:'Antibiotique - Nitrofurane urinaire', forme:'Gélule', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Fosfomycine 3g', dci:'Fosfomycine', classeTherapeutique:'Antibiotique urinaire (dose unique)', forme:'Granulés pour solution buvable', dosage:'3g', laboratoireFabricant:'Générique' },
    { nomCommercial:'Rifaxiline 200mg', dci:'Rifaximine', classeTherapeutique:'Antibiotique intestinal non absorbable', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Générique' },

    // ── ANTITUBERCULEUX ────────────────────────────────────────────────────
    { nomCommercial:'Isoniazide (INH) 100mg', dci:'Isoniazide', classeTherapeutique:'Antituberculeux', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Isoniazide (INH) 300mg', dci:'Isoniazide', classeTherapeutique:'Antituberculeux', forme:'Comprimé', dosage:'300mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Rifampicine 150mg', dci:'Rifampicine', classeTherapeutique:'Antituberculeux', forme:'Gélule', dosage:'150mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Rifampicine 300mg', dci:'Rifampicine', classeTherapeutique:'Antituberculeux', forme:'Gélule', dosage:'300mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Pyrazinamide 400mg', dci:'Pyrazinamide', classeTherapeutique:'Antituberculeux', forme:'Comprimé', dosage:'400mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Pyrazinamide 500mg', dci:'Pyrazinamide', classeTherapeutique:'Antituberculeux', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Éthambutol 400mg', dci:'Éthambutol', classeTherapeutique:'Antituberculeux', forme:'Comprimé', dosage:'400mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'RHZE Combinaison 4en1 (Phase initiale)', dci:'Rifampicine+Isoniazide+Pyrazinamide+Éthambutol', classeTherapeutique:'Antituberculeux - Combinaison phase initiale', forme:'Comprimé', dosage:'150/75/400/275mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'RH Combinaison 2en1 (Phase continuation)', dci:'Rifampicine + Isoniazide', classeTherapeutique:'Antituberculeux - Combinaison phase continuation', forme:'Comprimé', dosage:'150/75mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Éthionamide 250mg', dci:'Éthionamide', classeTherapeutique:'Antituberculeux 2ème ligne', forme:'Comprimé', dosage:'250mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Kanamycine 1g Injectable', dci:'Kanamycine', classeTherapeutique:'Antituberculeux 2ème ligne / Aminoside', forme:'Poudre injectable IM', dosage:'1g', laboratoireFabricant:'Générique' },

    // ── ANTIRÉTROVIRAUX (VIH) ──────────────────────────────────────────────
    { nomCommercial:'TDF+3TC+DTG (Recommandé OMS)', dci:'Ténofovir + Lamivudine + Dolutégravir', classeTherapeutique:'Antirétroviral - Combinaison 1ère ligne recommandée', forme:'Comprimé', dosage:'300mg/300mg/50mg', laboratoireFabricant:'ViiV Healthcare / Générique' },
    { nomCommercial:'TDF+3TC+EFV 600mg', dci:'Ténofovir + Lamivudine + Efavirenz', classeTherapeutique:'Antirétroviral - Combinaison 1ère ligne', forme:'Comprimé', dosage:'300mg/300mg/600mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'AZT+3TC (Zidovudine+Lamivudine)', dci:'Zidovudine + Lamivudine', classeTherapeutique:'Antirétroviral - INTI', forme:'Comprimé', dosage:'300mg/150mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Lopinavir+Ritonavir (Kaletra)', dci:'Lopinavir + Ritonavir', classeTherapeutique:'Antirétroviral - IP boosté', forme:'Comprimé', dosage:'200mg/50mg', laboratoireFabricant:'AbbVie' },
    { nomCommercial:'Névirapine 200mg', dci:'Névirapine', classeTherapeutique:'Antirétroviral - INNTI', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Efavirenz 600mg', dci:'Efavirenz', classeTherapeutique:'Antirétroviral - INNTI', forme:'Comprimé', dosage:'600mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Dolutégravir 50mg', dci:'Dolutégravir', classeTherapeutique:'Antirétroviral - Inhibiteur intégrase', forme:'Comprimé', dosage:'50mg', laboratoireFabricant:'ViiV Healthcare' },
    { nomCommercial:'Ténofovir 300mg', dci:'Ténofovir disoproxil fumarate', classeTherapeutique:'Antirétroviral - INTI / Hépatite B', forme:'Comprimé', dosage:'300mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Lamivudine 150mg', dci:'Lamivudine', classeTherapeutique:'Antirétroviral - INTI', forme:'Comprimé', dosage:'150mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'ARV Pédiatrique Sirop (AZT)', dci:'Zidovudine', classeTherapeutique:'Antirétroviral pédiatrique', forme:'Sirop', dosage:'10mg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Névirapine Sirop Pédiatrique', dci:'Névirapine', classeTherapeutique:'Antirétroviral pédiatrique', forme:'Sirop', dosage:'10mg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Aciclovir 200mg Comprimé', dci:'Aciclovir', classeTherapeutique:'Antiviral - Herpès simplex / Zona', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Aciclovir 400mg Comprimé', dci:'Aciclovir', classeTherapeutique:'Antiviral - Herpès simplex / Zona', forme:'Comprimé', dosage:'400mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Aciclovir Crème 5%', dci:'Aciclovir', classeTherapeutique:'Antiviral topique - Herpès labial', forme:'Crème', dosage:'5%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Valaciclovir 500mg', dci:'Valaciclovir', classeTherapeutique:'Antiviral - Herpès / Zona', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },

    // ── ANTIPARASITAIRES ───────────────────────────────────────────────────
    { nomCommercial:'Albendazole 400mg', dci:'Albendazole', classeTherapeutique:'Antiparasitaire - Anthelminthique', forme:'Comprimé', dosage:'400mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Albendazole 200mg Pédiatrique', dci:'Albendazole', classeTherapeutique:'Antiparasitaire - Anthelminthique pédiatrique', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Mébendazole 100mg', dci:'Mébendazole', classeTherapeutique:'Antiparasitaire - Anthelminthique', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Mébendazole 500mg (Dose unique)', dci:'Mébendazole', classeTherapeutique:'Antiparasitaire - Anthelminthique dose unique', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ivermectine 3mg (Mectizan)', dci:'Ivermectine', classeTherapeutique:'Antiparasitaire - Onchocercose / Gale / Filariose', forme:'Comprimé', dosage:'3mg', laboratoireFabricant:'MSD' },
    { nomCommercial:'Ivermectine 6mg', dci:'Ivermectine', classeTherapeutique:'Antiparasitaire - Onchocercose / Filariose', forme:'Comprimé', dosage:'6mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Praziquantel 600mg', dci:'Praziquantel', classeTherapeutique:'Antiparasitaire - Bilharziose / Téniase', forme:'Comprimé', dosage:'600mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Diéthylcarbamazine 100mg', dci:'Diéthylcarbamazine (DEC)', classeTherapeutique:'Antiparasitaire - Filariose lymphatique / Loase', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Niclosamide 500mg', dci:'Niclosamide', classeTherapeutique:'Antiparasitaire - Téniase', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Tinidazole 500mg', dci:'Tinidazole', classeTherapeutique:'Antiparasitaire - Amibiase / Giardiase', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },

    // ── ANTIFONGIQUES ──────────────────────────────────────────────────────
    { nomCommercial:'Fluconazole 50mg', dci:'Fluconazole', classeTherapeutique:'Antifongique - Azolé', forme:'Gélule', dosage:'50mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Fluconazole 150mg', dci:'Fluconazole', classeTherapeutique:'Antifongique - Azolé', forme:'Gélule', dosage:'150mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Fluconazole 200mg', dci:'Fluconazole', classeTherapeutique:'Antifongique - Azolé', forme:'Gélule', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Kétoconazole 200mg', dci:'Kétoconazole', classeTherapeutique:'Antifongique - Azolé', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Griséofulvine 125mg', dci:'Griséofulvine', classeTherapeutique:'Antifongique - Dermatophyties / Teigne', forme:'Comprimé', dosage:'125mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Nystatine 500 000UI Comprimé', dci:'Nystatine', classeTherapeutique:'Antifongique - Polyène oral', forme:'Comprimé', dosage:'500 000 UI', laboratoireFabricant:'Générique' },
    { nomCommercial:'Nystatine Suspension Buccale', dci:'Nystatine', classeTherapeutique:'Antifongique buccal - Candidose', forme:'Suspension buccale', dosage:'100 000 UI/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Clotrimazole Crème 1%', dci:'Clotrimazole', classeTherapeutique:'Antifongique topique cutané', forme:'Crème', dosage:'1%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Clotrimazole Ovule 100mg', dci:'Clotrimazole', classeTherapeutique:'Antifongique vaginal', forme:'Ovule vaginal', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Clotrimazole Ovule 500mg', dci:'Clotrimazole', classeTherapeutique:'Antifongique vaginal dose unique', forme:'Ovule vaginal', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Amphotéricine B Injectable', dci:'Amphotéricine B', classeTherapeutique:'Antifongique systémique - Infections graves', forme:'Poudre injectable IV', dosage:'50mg', laboratoireFabricant:'Générique' },

    // ── CARDIOVASCULAIRES ──────────────────────────────────────────────────
    { nomCommercial:'Amlodipine 5mg', dci:'Amlodipine', classeTherapeutique:'Antihypertenseur - Inhibiteur calcique', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Amlodipine 10mg', dci:'Amlodipine', classeTherapeutique:'Antihypertenseur - Inhibiteur calcique', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Nifédipine 20mg LP', dci:'Nifédipine', classeTherapeutique:'Antihypertenseur - Inhibiteur calcique', forme:'Comprimé LP', dosage:'20mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Nifédipine 10mg (Crise HTA)', dci:'Nifédipine', classeTherapeutique:'Antihypertenseur - Urgence', forme:'Gélule', dosage:'10mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Captopril 25mg', dci:'Captopril', classeTherapeutique:'Antihypertenseur - IEC', forme:'Comprimé', dosage:'25mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Captopril 50mg', dci:'Captopril', classeTherapeutique:'Antihypertenseur - IEC', forme:'Comprimé', dosage:'50mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Énalapril 5mg', dci:'Énalapril', classeTherapeutique:'Antihypertenseur - IEC', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Énalapril 10mg', dci:'Énalapril', classeTherapeutique:'Antihypertenseur - IEC', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Lisinopril 10mg', dci:'Lisinopril', classeTherapeutique:'Antihypertenseur - IEC', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Losartan 50mg', dci:'Losartan', classeTherapeutique:'Antihypertenseur - ARA II', forme:'Comprimé', dosage:'50mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Losartan 100mg', dci:'Losartan', classeTherapeutique:'Antihypertenseur - ARA II', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Valsartan 80mg', dci:'Valsartan', classeTherapeutique:'Antihypertenseur - ARA II', forme:'Comprimé', dosage:'80mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Hydrochlorothiazide 25mg', dci:'Hydrochlorothiazide', classeTherapeutique:'Diurétique thiazidique - Antihypertenseur', forme:'Comprimé', dosage:'25mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Furosémide 40mg Comprimé', dci:'Furosémide', classeTherapeutique:"Diurétique de l'anse", forme:'Comprimé', dosage:'40mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Furosémide 20mg Injectable', dci:'Furosémide', classeTherapeutique:"Diurétique de l'anse - Injectable", forme:'Solution injectable IV/IM', dosage:'20mg/2ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Spironolactone 25mg', dci:'Spironolactone', classeTherapeutique:'Diurétique antialdostérone - Insuffisance cardiaque', forme:'Comprimé', dosage:'25mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Spironolactone 100mg', dci:'Spironolactone', classeTherapeutique:'Diurétique antialdostérone', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Aténolol 50mg', dci:'Aténolol', classeTherapeutique:'Antihypertenseur - Bêtabloquant', forme:'Comprimé', dosage:'50mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Bisoprolol 5mg', dci:'Bisoprolol', classeTherapeutique:'Antihypertenseur - Bêtabloquant', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Bisoprolol 10mg', dci:'Bisoprolol', classeTherapeutique:'Antihypertenseur - Bêtabloquant', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Carvedilol 12,5mg', dci:'Carvedilol', classeTherapeutique:'Antihypertenseur - Alpha+Bêtabloquant', forme:'Comprimé', dosage:'12,5mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Méthyldopa 250mg', dci:'Méthyldopa', classeTherapeutique:'Antihypertenseur central - HTA grossesse', forme:'Comprimé', dosage:'250mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Méthyldopa 500mg', dci:'Méthyldopa', classeTherapeutique:'Antihypertenseur central - HTA grossesse', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Digoxine 0,25mg', dci:'Digoxine', classeTherapeutique:'Cardiotonique - Insuffisance cardiaque / FA', forme:'Comprimé', dosage:'0,25mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Isosorbide dinitrate 10mg', dci:'Isosorbide dinitrate', classeTherapeutique:'Antiangioreux - Dérivé nitré', forme:'Comprimé sublingual', dosage:'10mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Trinitrine Spray', dci:'Trinitrine (Nitroglycérine)', classeTherapeutique:'Antiangioreux - Dérivé nitré (urgence)', forme:'Spray sublingual', dosage:'0,3mg/dose', laboratoireFabricant:'Générique' },
    { nomCommercial:'Atorvastatine 10mg', dci:'Atorvastatine', classeTherapeutique:'Hypolipémiant - Statine', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Atorvastatine 20mg', dci:'Atorvastatine', classeTherapeutique:'Hypolipémiant - Statine', forme:'Comprimé', dosage:'20mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Simvastatine 20mg', dci:'Simvastatine', classeTherapeutique:'Hypolipémiant - Statine', forme:'Comprimé', dosage:'20mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Simvastatine 40mg', dci:'Simvastatine', classeTherapeutique:'Hypolipémiant - Statine', forme:'Comprimé', dosage:'40mg', laboratoireFabricant:'Générique' },

    // ── DIABÈTE ───────────────────────────────────────────────────────────
    { nomCommercial:'Metformine 500mg', dci:'Metformine', classeTherapeutique:'Antidiabétique oral - Biguanide', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Metformine 850mg', dci:'Metformine', classeTherapeutique:'Antidiabétique oral - Biguanide', forme:'Comprimé', dosage:'850mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Metformine 1000mg', dci:'Metformine', classeTherapeutique:'Antidiabétique oral - Biguanide', forme:'Comprimé', dosage:'1000mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Glibenclamide 5mg', dci:'Glibenclamide', classeTherapeutique:'Antidiabétique oral - Sulfonylurée', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Gliclazide 80mg', dci:'Gliclazide', classeTherapeutique:'Antidiabétique oral - Sulfonylurée', forme:'Comprimé', dosage:'80mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Gliclazide 30mg LP', dci:'Gliclazide', classeTherapeutique:'Antidiabétique oral - Sulfonylurée LP', forme:'Comprimé LP', dosage:'30mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Glipizide 5mg', dci:'Glipizide', classeTherapeutique:'Antidiabétique oral - Sulfonylurée', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Insuline Rapide 100UI/ml (Actrapid)', dci:'Insuline humaine régulière', classeTherapeutique:'Antidiabétique - Insuline rapide', forme:'Solution injectable SC/IV', dosage:'100 UI/ml', laboratoireFabricant:'Novo Nordisk' },
    { nomCommercial:'Insuline NPH 100UI/ml (Insulatard)', dci:'Insuline humaine isophane', classeTherapeutique:'Antidiabétique - Insuline intermédiaire', forme:'Solution injectable SC', dosage:'100 UI/ml', laboratoireFabricant:'Novo Nordisk' },
    { nomCommercial:'Insuline Glargine 100UI/ml (Lantus)', dci:'Insuline glargine', classeTherapeutique:'Antidiabétique - Insuline lente', forme:'Solution injectable SC', dosage:'100 UI/ml', laboratoireFabricant:'Sanofi' },
    { nomCommercial:'Insuline Mélange 30/70', dci:'Insuline biphasique', classeTherapeutique:'Antidiabétique - Insuline pré-mélangée', forme:'Solution injectable SC', dosage:'100 UI/ml', laboratoireFabricant:'Novo Nordisk' },

    // ── GASTRO-ENTÉROLOGIE ────────────────────────────────────────────────
    { nomCommercial:'Oméprazole 20mg', dci:'Oméprazole', classeTherapeutique:'IPP - Anti-ulcéreux', forme:'Gélule gastrorésistante', dosage:'20mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Oméprazole 40mg', dci:'Oméprazole', classeTherapeutique:'IPP - Anti-ulcéreux', forme:'Gélule gastrorésistante', dosage:'40mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Oméprazole 40mg Injectable', dci:'Oméprazole', classeTherapeutique:'IPP - Anti-ulcéreux injectable', forme:'Poudre injectable IV', dosage:'40mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Pantoprazole 20mg', dci:'Pantoprazole', classeTherapeutique:'IPP - Anti-ulcéreux', forme:'Comprimé gastrorésistant', dosage:'20mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Pantoprazole 40mg', dci:'Pantoprazole', classeTherapeutique:'IPP - Anti-ulcéreux', forme:'Comprimé gastrorésistant', dosage:'40mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ranitidine 150mg', dci:'Ranitidine', classeTherapeutique:'Anti-H2 - Anti-ulcéreux', forme:'Comprimé', dosage:'150mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Cimétidine 400mg', dci:'Cimétidine', classeTherapeutique:'Anti-H2 - Anti-ulcéreux', forme:'Comprimé', dosage:'400mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Sucralfate 1g', dci:'Sucralfate', classeTherapeutique:'Protecteur gastrique - Ulcère', forme:'Comprimé', dosage:'1g', laboratoireFabricant:'Générique' },
    { nomCommercial:'Métoclopramide 10mg Comprimé', dci:'Métoclopramide', classeTherapeutique:'Antiémétique - Prokinétique', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Métoclopramide 10mg Injectable', dci:'Métoclopramide', classeTherapeutique:'Antiémétique - Prokinétique injectable', forme:'Solution injectable IM/IV', dosage:'10mg/2ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Dompéridone 10mg', dci:'Dompéridone', classeTherapeutique:'Antiémétique - Prokinétique', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ondansétron 4mg', dci:'Ondansétron', classeTherapeutique:'Antiémétique - Sétron', forme:'Comprimé', dosage:'4mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ondansétron 8mg Injectable', dci:'Ondansétron', classeTherapeutique:'Antiémétique - Sétron injectable', forme:'Solution injectable IV', dosage:'8mg/4ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Lopéramide 2mg', dci:'Lopéramide', classeTherapeutique:'Antidiarrhéique', forme:'Gélule', dosage:'2mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'SRO Sachet Standard OMS', dci:'Sels de réhydratation orale', classeTherapeutique:'Réhydratation orale - Diarrhée', forme:'Poudre pour solution orale', dosage:'Sachet 1L', laboratoireFabricant:'Générique' },
    { nomCommercial:'Smecta 3g', dci:'Diosmectite', classeTherapeutique:'Antidiarrhéique - Adsorbant intestinal', forme:'Poudre pour suspension orale', dosage:'3g', laboratoireFabricant:'Ipsen' },
    { nomCommercial:'Lactulose 10g/15ml', dci:'Lactulose', classeTherapeutique:'Laxatif osmotique', forme:'Solution buvable', dosage:'10g/15ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Bisacodyl 5mg', dci:'Bisacodyl', classeTherapeutique:'Laxatif stimulant', forme:'Comprimé gastrorésistant', dosage:'5mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Hyoscine Butylbromide 10mg (Buscopan)', dci:'Hyoscine butylbromide', classeTherapeutique:'Antispasmodique', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Boehringer' },
    { nomCommercial:'Hyoscine Butylbromide 20mg Injectable', dci:'Hyoscine butylbromide', classeTherapeutique:'Antispasmodique injectable', forme:'Solution injectable IM/IV', dosage:'20mg/ml', laboratoireFabricant:'Boehringer' },
    { nomCommercial:'Phloroglucinol 80mg (Spasfon)', dci:'Phloroglucinol', classeTherapeutique:'Antispasmodique', forme:'Comprimé', dosage:'80mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Charbon activé 200mg', dci:'Charbon activé', classeTherapeutique:'Adsorbant intestinal - Intoxications', forme:'Gélule', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Antiacide (Aluminium + Magnésium)', dci:'Hydroxyde aluminium + hydroxyde magnésium', classeTherapeutique:'Antiacide - Brûlures gastriques', forme:'Suspension buvable', dosage:'200mg/200mg/5ml', laboratoireFabricant:'Générique' },

    // ── PNEUMOLOGIE / RESPIRATOIRE ────────────────────────────────────────
    { nomCommercial:'Salbutamol 100mcg Spray (Ventoline)', dci:'Salbutamol', classeTherapeutique:'Bronchodilatateur - Bêta2 inhalé', forme:'Aérosol doseur', dosage:'100mcg/bouffée', laboratoireFabricant:'GSK' },
    { nomCommercial:'Salbutamol 2mg Comprimé', dci:'Salbutamol', classeTherapeutique:'Bronchodilatateur - Bêta2 oral', forme:'Comprimé', dosage:'2mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Salbutamol 2,5mg Nébulisation', dci:'Salbutamol', classeTherapeutique:'Bronchodilatateur - Nébulisation', forme:'Solution pour nébulisation', dosage:'2,5mg/2,5ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Béclométasone 250mcg Spray', dci:'Béclométasone', classeTherapeutique:'Corticoïde inhalé - Asthme', forme:'Aérosol doseur', dosage:'250mcg/bouffée', laboratoireFabricant:'Générique' },
    { nomCommercial:'Aminophylline 100mg', dci:'Aminophylline', classeTherapeutique:'Bronchodilatateur - Xanthine', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Théophylline 200mg LP', dci:'Théophylline', classeTherapeutique:'Bronchodilatateur - Xanthine LP', forme:'Comprimé LP', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Prednisolone 5mg', dci:'Prednisolone', classeTherapeutique:'Corticoïde systémique', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Prednisolone 20mg', dci:'Prednisolone', classeTherapeutique:'Corticoïde systémique', forme:'Comprimé', dosage:'20mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Prednisolone Sirop 5mg/5ml', dci:'Prednisolone', classeTherapeutique:'Corticoïde systémique pédiatrique', forme:'Sirop', dosage:'5mg/5ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Dexaméthasone 4mg Injectable', dci:'Dexaméthasone', classeTherapeutique:'Corticoïde injectable - Anti-inflammatoire', forme:'Solution injectable IV/IM', dosage:'4mg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Hydrocortisone 100mg Injectable', dci:'Hydrocortisone', classeTherapeutique:'Corticoïde injectable - Urgences', forme:'Poudre injectable IV/IM', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Bromhexine 8mg Comprimé', dci:'Bromhexine', classeTherapeutique:'Mucolytique - Expectorant', forme:'Comprimé', dosage:'8mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Acétylcystéine 200mg Sachet', dci:'Acétylcystéine (NAC)', classeTherapeutique:'Mucolytique', forme:'Sachet effervescent', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Acétylcystéine 600mg Sachet', dci:'Acétylcystéine (NAC)', classeTherapeutique:'Mucolytique', forme:'Sachet effervescent', dosage:'600mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Codéine 30mg', dci:'Codéine', classeTherapeutique:'Antitussif opioïde', forme:'Comprimé', dosage:'30mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Oxymétazoline Spray Nasal 0,05%', dci:'Oxymétazoline', classeTherapeutique:'Décongestionnant nasal', forme:'Spray nasal', dosage:'0,05%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Loratadine 10mg', dci:'Loratadine', classeTherapeutique:'Antihistaminique - Anti-allergique', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Cétirizine 10mg', dci:'Cétirizine', classeTherapeutique:'Antihistaminique - Anti-allergique', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Chlorphénamine 4mg', dci:'Chlorphénamine', classeTherapeutique:'Antihistaminique 1G - Anti-allergique', forme:'Comprimé', dosage:'4mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Prométhazine 25mg', dci:'Prométhazine', classeTherapeutique:'Antihistaminique 1G / Antiémétique', forme:'Comprimé', dosage:'25mg', laboratoireFabricant:'Générique' },

    // ── NEUROLOGIE / PSYCHIATRIE ──────────────────────────────────────────
    { nomCommercial:'Diazépam 5mg Comprimé', dci:'Diazépam', classeTherapeutique:'Anxiolytique - Benzodiazépine', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Diazépam 10mg Injectable', dci:'Diazépam', classeTherapeutique:'Anticonvulsivant Injectable - État de mal', forme:'Solution injectable IV/IM', dosage:'10mg/2ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Phénobarbital 100mg', dci:'Phénobarbital', classeTherapeutique:'Antiépileptique - Barbiturique', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Phénobarbital 200mg Injectable', dci:'Phénobarbital', classeTherapeutique:'Antiépileptique - Barbiturique injectable', forme:'Solution injectable IV/IM', dosage:'200mg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Carbamazépine 200mg', dci:'Carbamazépine', classeTherapeutique:'Antiépileptique', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Carbamazépine 400mg', dci:'Carbamazépine', classeTherapeutique:'Antiépileptique', forme:'Comprimé', dosage:'400mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Valproate de sodium 200mg', dci:'Valproate de sodium', classeTherapeutique:'Antiépileptique', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Valproate de sodium 500mg', dci:'Valproate de sodium', classeTherapeutique:'Antiépileptique', forme:'Comprimé LP', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Halopéridol 5mg', dci:'Halopéridol', classeTherapeutique:'Antipsychotique', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Halopéridol 5mg Injectable', dci:'Halopéridol', classeTherapeutique:'Antipsychotique injectable', forme:'Solution injectable IM', dosage:'5mg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Chlorpromazine 100mg', dci:'Chlorpromazine', classeTherapeutique:'Antipsychotique', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Amitriptyline 25mg', dci:'Amitriptyline', classeTherapeutique:'Antidépresseur tricyclique', forme:'Comprimé', dosage:'25mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Fluoxétine 20mg', dci:'Fluoxétine', classeTherapeutique:'Antidépresseur - ISRS', forme:'Gélule', dosage:'20mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Sertraline 50mg', dci:'Sertraline', classeTherapeutique:'Antidépresseur - ISRS', forme:'Comprimé', dosage:'50mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Clonazépam 2mg', dci:'Clonazépam', classeTherapeutique:'Antiépileptique - Benzodiazépine', forme:'Comprimé', dosage:'2mg', laboratoireFabricant:'Générique' },

    // ── HÉMATOLOGIE / ANTIANÉMIQUES ───────────────────────────────────────
    { nomCommercial:'Sulfate ferreux 200mg', dci:'Sulfate ferreux', classeTherapeutique:'Antianémique - Fer oral', forme:'Comprimé', dosage:'200mg (65mg Fe)', laboratoireFabricant:'Générique' },
    { nomCommercial:'Fer + Acide folique (Grossesse)', dci:'Sulfate ferreux + Acide folique', classeTherapeutique:'Antianémique - Grossesse', forme:'Comprimé', dosage:'200mg/0,4mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Fer III Hydroxyde Polymaltose', dci:'Fer (III) hydroxyde polymaltose', classeTherapeutique:'Antianémique - Fer oral mieux toléré', forme:'Comprimé', dosage:'100mg Fe', laboratoireFabricant:'Générique' },
    { nomCommercial:'Acide folique 5mg', dci:'Acide folique', classeTherapeutique:'Vitamine B9 - Antianémique', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Acide folique 0,4mg (Prénatal)', dci:'Acide folique', classeTherapeutique:'Prévention spina bifida - Prénatal', forme:'Comprimé', dosage:'0,4mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Vitamine B12 1000mcg Injectable', dci:'Cyanocobalamine', classeTherapeutique:'Vitamine B12 - Antianémique', forme:'Solution injectable IM', dosage:'1000mcg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Hydroxyurée 500mg', dci:'Hydroxyurée', classeTherapeutique:'Antidrépanocytaire', forme:'Gélule', dosage:'500mg', laboratoireFabricant:'Générique' },

    // ── VITAMINES / MICRONUTRIMENTS ───────────────────────────────────────
    { nomCommercial:'Vitamine A 100 000UI (6-11 mois)', dci:'Rétinol', classeTherapeutique:'Vitamine A - Supplémentation enfant', forme:'Capsule molle', dosage:'100 000 UI', laboratoireFabricant:'Générique' },
    { nomCommercial:'Vitamine A 200 000UI (12 mois+)', dci:'Rétinol', classeTherapeutique:'Vitamine A - Supplémentation enfant', forme:'Capsule molle', dosage:'200 000 UI', laboratoireFabricant:'Générique' },
    { nomCommercial:'Vitamine C 250mg', dci:'Acide ascorbique', classeTherapeutique:'Vitamine C', forme:'Comprimé', dosage:'250mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Vitamine C 500mg Effervescent', dci:'Acide ascorbique', classeTherapeutique:'Vitamine C', forme:'Comprimé effervescent', dosage:'500mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Vitamine D3 100 000UI', dci:'Cholécalciférol', classeTherapeutique:'Vitamine D - Rachitisme / Ostéoporose', forme:'Solution buvable ampoule', dosage:'100 000 UI/2ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Zinc 10mg Pédiatrique', dci:'Sulfate de zinc', classeTherapeutique:'Oligoélément - Diarrhée enfant <5 ans', forme:'Comprimé dispersible', dosage:'10mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Zinc 20mg', dci:'Sulfate de zinc', classeTherapeutique:'Oligoélément - Diarrhée enfant', forme:'Comprimé dispersible', dosage:'20mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Calcium 500mg + Vitamine D3', dci:'Carbonate de calcium + Cholécalciférol', classeTherapeutique:'Calcium - Ostéoporose / Grossesse', forme:'Comprimé à croquer', dosage:'500mg/400UI', laboratoireFabricant:'Générique' },
    { nomCommercial:'Multivitamines Sirop Pédiatrique', dci:'Polyvitamines', classeTherapeutique:'Supplément vitaminique enfant', forme:'Sirop', dosage:'Composition standard', laboratoireFabricant:'Générique' },
    { nomCommercial:'Complexe B (B1+B6+B12)', dci:'Thiamine + Pyridoxine + Cyanocobalamine', classeTherapeutique:'Vitamines B - Neuropathies', forme:'Comprimé', dosage:'100mg/200mg/200mcg', laboratoireFabricant:'Générique' },

    // ── MATERNITÉ / OBSTÉTRIQUE ───────────────────────────────────────────
    { nomCommercial:'Ocytocine 10UI Injectable', dci:'Ocytocine', classeTherapeutique:'Utérotonique - Accouchement / HPP', forme:'Solution injectable IM/IV', dosage:'10 UI/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Misoprostol 200mcg', dci:'Misoprostol', classeTherapeutique:'Utérotonique - Prévention HPP / Déclenchement', forme:'Comprimé', dosage:'200mcg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Sulfate de magnésium 500mg/ml Injectable', dci:'Sulfate de magnésium', classeTherapeutique:'Anticonvulsivant - Pré-éclampsie / Éclampsie', forme:'Solution injectable IV/IM', dosage:'500mg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Méthylergométrine 0,2mg Injectable', dci:'Méthylergométrine', classeTherapeutique:'Utérotonique - Hémorragie du post-partum', forme:'Solution injectable IM', dosage:'0,2mg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Progestérone 200mg (Utrogestan)', dci:'Progestérone micronisée', classeTherapeutique:'Progestatif - Menace avortement / Prématurité', forme:'Capsule vaginale/orale', dosage:'200mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Nifédipine 10mg (Tocolyse)', dci:'Nifédipine', classeTherapeutique:'Tocolytique - Menace accouchement prématuré', forme:'Gélule', dosage:'10mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Contraceptif Oral COC (Éthinyl+Lévonorgestrel)', dci:'Éthinylestradiol + Lévonorgestrel', classeTherapeutique:'Contraceptif oral combiné', forme:'Comprimé', dosage:'30mcg/150mcg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Cérazette (Progestatif oral seul)', dci:'Désogestrel', classeTherapeutique:'Contraceptif progestatif oral', forme:'Comprimé', dosage:'75mcg', laboratoireFabricant:'Organon' },
    { nomCommercial:'Depo-Provera (Injectable 3 mois)', dci:'Médroxyprogestérone acétate', classeTherapeutique:'Contraceptif injectable 3 mois', forme:'Solution injectable IM', dosage:'150mg/ml', laboratoireFabricant:'Pfizer' },
    { nomCommercial:'Noristérat (Injectable 2 mois)', dci:'Noréthistérone énantate', classeTherapeutique:'Contraceptif injectable 2 mois', forme:'Solution injectable IM', dosage:'200mg/ml', laboratoireFabricant:'Bayer' },
    { nomCommercial:'Pilule du Lendemain (Norlevo)', dci:'Lévonorgestrel', classeTherapeutique:'Contraceptif urgence', forme:'Comprimé', dosage:'1,5mg', laboratoireFabricant:'Générique' },

    // ── SOLUTÉS DE PERFUSION ──────────────────────────────────────────────
    { nomCommercial:'Sérum Physiologique NaCl 0,9% - 250ml', dci:'Chlorure de sodium 0,9%', classeTherapeutique:'Soluté isotonique', forme:'Solution IV', dosage:'0,9%/250ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Sérum Physiologique NaCl 0,9% - 500ml', dci:'Chlorure de sodium 0,9%', classeTherapeutique:'Soluté isotonique', forme:'Solution IV', dosage:'0,9%/500ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ringer Lactate 500ml', dci:'Solution de Ringer Lactate', classeTherapeutique:'Soluté de remplissage vasculaire', forme:'Solution IV', dosage:'500ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Glucosé 5% - 500ml', dci:'Glucose 5%', classeTherapeutique:'Soluté glucosé isotonique', forme:'Solution IV', dosage:'5%/500ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Glucosé 10% - 500ml', dci:'Glucose 10%', classeTherapeutique:'Soluté glucosé hypertonique', forme:'Solution IV', dosage:'10%/500ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Glucosé 30% - 250ml', dci:'Glucose 30%', classeTherapeutique:'Soluté glucosé très hypertonique', forme:'Solution IV', dosage:'30%/250ml', laboratoireFabricant:'Générique' },

    // ── URGENCES / RÉANIMATION ────────────────────────────────────────────
    { nomCommercial:'Adrénaline 1mg Injectable', dci:'Épinéphrine (Adrénaline)', classeTherapeutique:'Sympathomimétique - Arrêt cardiaque / Choc anaphylactique', forme:'Solution injectable IV/IM', dosage:'1mg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Atropine 0,5mg Injectable', dci:'Atropine', classeTherapeutique:'Anticholinergique - Bradycardie / Intoxication', forme:'Solution injectable IV/IM', dosage:'0,5mg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Atropine 1mg Injectable', dci:'Atropine', classeTherapeutique:'Anticholinergique - Bradycardie', forme:'Solution injectable IV/IM', dosage:'1mg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Gluconate de calcium 10% Injectable', dci:'Gluconate de calcium', classeTherapeutique:'Calcium IV - Hypocalcémie / Hyperkaliémie', forme:'Solution injectable IV lente', dosage:'10%/10ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Bicarbonate de sodium 4,2%', dci:'Bicarbonate de sodium', classeTherapeutique:'Alcalinisant - Acidose métabolique', forme:'Solution IV', dosage:'4,2%/250ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Dopamine 200mg Injectable', dci:'Dopamine', classeTherapeutique:'Vasopresseur - État de choc', forme:'Solution injectable IV', dosage:'200mg/5ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Dobutamine 250mg Injectable', dci:'Dobutamine', classeTherapeutique:'Inotrope - Insuffisance cardiaque / Choc', forme:'Poudre injectable IV', dosage:'250mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Kétamine 500mg Injectable', dci:'Kétamine', classeTherapeutique:'Anesthésique général / Analgésie procédurale', forme:'Solution injectable IV/IM', dosage:'500mg/10ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Kétamine 200mg Injectable', dci:'Kétamine', classeTherapeutique:'Anesthésique général / Analgésie procédurale', forme:'Solution injectable IV/IM', dosage:'200mg/2ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Naloxone 0,4mg Injectable', dci:'Naloxone', classeTherapeutique:'Antagoniste opioïde - Surdosage morphinique', forme:'Solution injectable IV/IM/SC', dosage:'0,4mg/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Midazolam 5mg Injectable', dci:'Midazolam', classeTherapeutique:'Sédatif / Anticonvulsivant injectable', forme:'Solution injectable IV/IM', dosage:'5mg/5ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Phénytoïne 250mg Injectable', dci:'Phénytoïne', classeTherapeutique:'Antiépileptique injectable - État de mal', forme:'Solution injectable IV', dosage:'250mg/5ml', laboratoireFabricant:'Générique' },

    // ── OPHTALMOLOGIE ─────────────────────────────────────────────────────
    { nomCommercial:'Tétracycline Pommade Ophtalmique 1%', dci:'Tétracycline', classeTherapeutique:'Antibiotique ophtalmique - Trachome / Conjonctivite', forme:'Pommade ophtalmique', dosage:'1%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Chloramphénicol Collyre 0,5%', dci:'Chloramphénicol', classeTherapeutique:'Antibiotique ophtalmique - Conjonctivite', forme:'Collyre', dosage:'0,5%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Ciprofloxacine Collyre 0,3%', dci:'Ciprofloxacine', classeTherapeutique:'Antibiotique ophtalmique - Fluoroquinolone', forme:'Collyre', dosage:'0,3%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Pilocarpine Collyre 1%', dci:'Pilocarpine', classeTherapeutique:'Antiglaucomateux - Myotique', forme:'Collyre', dosage:'1%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Timolol Collyre 0,5%', dci:'Timolol', classeTherapeutique:'Antiglaucomateux - Bêtabloquant topique', forme:'Collyre', dosage:'0,5%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Larmes artificielles (Gel ophtalmique)', dci:'Hypromellose', classeTherapeutique:'Lubrifiant oculaire - Sécheresse oculaire', forme:'Collyre gel', dosage:'0,3%', laboratoireFabricant:'Générique' },

    // ── DERMATOLOGIE ─────────────────────────────────────────────────────
    { nomCommercial:'Perméthrine Crème 5%', dci:'Perméthrine', classeTherapeutique:'Antiparasitaire cutané - Gale', forme:'Crème', dosage:'5%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Benzoate de benzyle 25% (Ascabiol)', dci:'Benzoate de benzyle', classeTherapeutique:'Antiparasitaire cutané - Gale / Phtiriase', forme:'Émulsion cutanée', dosage:'25%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Bétadine 10% Solution Cutanée', dci:'Povidone iodée', classeTherapeutique:'Antiseptique large spectre', forme:'Solution cutanée', dosage:'10%', laboratoireFabricant:'MEDA Pharma' },
    { nomCommercial:'Alcool 70° Isopropylique', dci:'Alcool isopropylique', classeTherapeutique:'Antiseptique cutané', forme:'Solution', dosage:'70°', laboratoireFabricant:'Générique' },
    { nomCommercial:'Eau oxygénée 10 volumes (3%)', dci:'Peroxyde hydrogène', classeTherapeutique:'Antiseptique cutané', forme:'Solution', dosage:'3%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Bétaméthasone Crème 0,05%', dci:'Bétaméthasone valérate', classeTherapeutique:'Corticoïde topique fort', forme:'Crème', dosage:'0,05%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Hydrocortisone Crème 1%', dci:'Hydrocortisone', classeTherapeutique:'Corticoïde topique faible', forme:'Crème', dosage:'1%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Acide salicylique + Soufre Pommade', dci:'Acide salicylique + Soufre', classeTherapeutique:'Kératolytique - Teigne / Psoriasis', forme:'Pommade', dosage:'2%/4%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Violet de gentiane 1%', dci:'Cristal violet', classeTherapeutique:'Antiseptique colorant - Plaies / Candidose buccale', forme:'Solution cutanée', dosage:'1%', laboratoireFabricant:'Générique' },
    { nomCommercial:'Oxyde de zinc Pommade', dci:'Oxyde de zinc', classeTherapeutique:'Protecteur cutané - Érythème fessier', forme:'Pommade', dosage:'15%', laboratoireFabricant:'Générique' },

    // ── ANESTHÉSIQUES LOCAUX ──────────────────────────────────────────────
    { nomCommercial:'Lidocaïne 1% Injectable', dci:'Lidocaïne', classeTherapeutique:'Anesthésique local', forme:'Solution injectable', dosage:'1%/20ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Lidocaïne 2% Injectable', dci:'Lidocaïne', classeTherapeutique:'Anesthésique local', forme:'Solution injectable', dosage:'2%/20ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Bupivacaïne 0,5% Injectable', dci:'Bupivacaïne', classeTherapeutique:'Anesthésique local longue durée - Rachianesthésie', forme:'Solution injectable', dosage:'0,5%/4ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Kétamine Crème (Douleur neuropathique)', dci:'Kétamine', classeTherapeutique:'Anesthésique topique - Douleur neuropathique', forme:'Crème', dosage:'10%', laboratoireFabricant:'Préparation magistrale' },

    // ── DIVERS ────────────────────────────────────────────────────────────
    { nomCommercial:'Héparine Sodique 5000UI Injectable', dci:'Héparine sodique', classeTherapeutique:'Anticoagulant - Prévention thrombose', forme:'Solution injectable SC/IV', dosage:'5000 UI/ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Énoxaparine 40mg Injectable (Lovenox)', dci:'Énoxaparine sodique', classeTherapeutique:'Anticoagulant HBPM - Prévention thrombose', forme:'Solution injectable SC', dosage:'40mg/0,4ml', laboratoireFabricant:'Sanofi' },
    { nomCommercial:'Warfarine 5mg', dci:'Warfarine', classeTherapeutique:'Anticoagulant oral - AVK', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Générique' },
    { nomCommercial:'Chlorure de potassium Injectable', dci:'Chlorure de potassium', classeTherapeutique:'Supplément potassique - Hypokaliémie', forme:'Solution pour perfusion IV (dilué)', dosage:'10%/10ml', laboratoireFabricant:'Générique' },
    { nomCommercial:'Albumine humaine 20%', dci:'Albumine humaine', classeTherapeutique:'Expanseur plasmatique - Hypoalbuminémie', forme:'Solution injectable IV', dosage:'20%/50ml', laboratoireFabricant:'LFB' },
  ];

  let countMed = 0;
  for (const med of medicaments) {
    const exists = await prisma.medicament.findFirst({ where: { nomCommercial: med.nomCommercial } });
    if (!exists) { await prisma.medicament.create({ data: med }); countMed++; }
  }
  console.log(`✅ Médicaments : ${countMed} ajoutés (${medicaments.length} dans la liste)`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. EXAMENS MÉDICAUX — Référentiel complet Cameroun
  // ══════════════════════════════════════════════════════════════════════════
  const examens = [
    // Hématologie
    { codeAzamed:'HEM001', nom:'Numération Formule Sanguine (NFS)', categorie:'Hématologie', description:'Analyse complète : globules rouges, blancs, plaquettes, hémoglobine, hématocrite' },
    { codeAzamed:'HEM002', nom:'Groupe Sanguin ABO + Rhésus', categorie:'Hématologie', description:'Détermination du groupe sanguin et facteur Rhésus' },
    { codeAzamed:'HEM003', nom:'Vitesse de Sédimentation (VS)', categorie:'Hématologie', description:'Marqueur inflammatoire non spécifique' },
    { codeAzamed:'HEM004', nom:'Taux de Prothrombine (TP) / INR', categorie:'Hématologie', description:'Coagulation - suivi traitement AVK (warfarine)' },
    { codeAzamed:'HEM005', nom:'Temps de Céphaline Activée (TCA)', categorie:'Hématologie', description:'Exploration voie intrinsèque de la coagulation' },
    { codeAzamed:'HEM006', nom:'Fibrinogène', categorie:'Hématologie', description:'Facteur de coagulation - CIVD, inflammation' },
    { codeAzamed:'HEM007', nom:'Électrophorèse de l\'hémoglobine', categorie:'Hématologie', description:'Dépistage drépanocytose, thalassémie et hémoglobinopathies' },
    { codeAzamed:'HEM008', nom:'Test de Falciformation (Emmel)', categorie:'Hématologie', description:'Dépistage drépanocytose - test de terrain' },
    { codeAzamed:'HEM009', nom:'Frottis sanguin', categorie:'Hématologie', description:'Examen morphologique des cellules sanguines' },
    { codeAzamed:'HEM010', nom:'Réticulocytes', categorie:'Hématologie', description:'Évaluation régénération médullaire - anémie' },
    { codeAzamed:'HEM011', nom:'D-dimères', categorie:'Hématologie', description:'Dépistage thrombose veineuse profonde, embolie pulmonaire' },

    // Biochimie
    { codeAzamed:'BIO001', nom:'Glycémie à jeun', categorie:'Biochimie', description:'Dépistage et suivi diabète - dosage glucose à jeun' },
    { codeAzamed:'BIO002', nom:'Glycémie postprandiale (2 heures)', categorie:'Biochimie', description:'Glycémie 2h après repas - diabète type 2' },
    { codeAzamed:'BIO003', nom:'HbA1c (Hémoglobine glyquée)', categorie:'Biochimie', description:'Contrôle glycémique moyen sur 3 mois - suivi diabète' },
    { codeAzamed:'BIO004', nom:'Créatininémie', categorie:'Biochimie', description:'Évaluation fonction rénale' },
    { codeAzamed:'BIO005', nom:'Urée sanguine', categorie:'Biochimie', description:'Évaluation fonction rénale - catabolisme protéique' },
    { codeAzamed:'BIO006', nom:'Acide urique sérique', categorie:'Biochimie', description:'Dépistage et suivi goutte - hyperuricémie' },
    { codeAzamed:'BIO007', nom:'Transaminases ALAT (SGPT)', categorie:'Biochimie', description:'Enzyme hépatique - cytolyse hépatique' },
    { codeAzamed:'BIO008', nom:'Transaminases ASAT (SGOT)', categorie:'Biochimie', description:'Enzyme hépatique et musculaire - cytolyse' },
    { codeAzamed:'BIO009', nom:'Bilirubine totale, directe et indirecte', categorie:'Biochimie', description:'Ictère - bilan hépatique complet' },
    { codeAzamed:'BIO010', nom:'Phosphatases alcalines (PAL)', categorie:'Biochimie', description:'Bilan hépatique et osseux - cholestase' },
    { codeAzamed:'BIO011', nom:'Gamma GT (GGT)', categorie:'Biochimie', description:'Marqueur hépatique - alcool, médicaments, cholestase' },
    { codeAzamed:'BIO012', nom:'Protéines totales + Albumine sérique', categorie:'Biochimie', description:'État nutritionnel - fonction hépatique' },
    { codeAzamed:'BIO013', nom:'Cholestérol total', categorie:'Biochimie', description:'Bilan lipidique - risque cardiovasculaire' },
    { codeAzamed:'BIO014', nom:'HDL-Cholestérol (Bon cholestérol)', categorie:'Biochimie', description:'Facteur protecteur cardiovasculaire' },
    { codeAzamed:'BIO015', nom:'LDL-Cholestérol (Mauvais cholestérol)', categorie:'Biochimie', description:'Facteur de risque cardiovasculaire' },
    { codeAzamed:'BIO016', nom:'Triglycérides', categorie:'Biochimie', description:'Bilan lipidique - hypertriglycéridémie' },
    { codeAzamed:'BIO017', nom:'Ionogramme sanguin (Na, K, Cl, CO2)', categorie:'Biochimie', description:'Électrolytes - équilibre acido-basique et hydrosodé' },
    { codeAzamed:'BIO018', nom:'Calcémie totale + ionisée', categorie:'Biochimie', description:'Dosage calcium sanguin - hypocalcémie, hypercalcémie' },
    { codeAzamed:'BIO019', nom:'Phosphorémie', categorie:'Biochimie', description:'Dosage phosphore sanguin - bilan phosphocalcique' },
    { codeAzamed:'BIO020', nom:'Magnésémie', categorie:'Biochimie', description:'Dosage magnésium sanguin - éclampsie, arythmies' },
    { codeAzamed:'BIO021', nom:'Ferritine sérique', categorie:'Biochimie', description:'Réserves en fer - carence martiale, surcharge en fer' },
    { codeAzamed:'BIO022', nom:'Fer sérique + Capacité de fixation (TIBC)', categorie:'Biochimie', description:'Bilan martial complet - anémie ferriprive' },
    { codeAzamed:'BIO023', nom:'CRP (Protéine C Réactive)', categorie:'Biochimie', description:'Marqueur inflammatoire et infectieux' },
    { codeAzamed:'BIO024', nom:'Procalcitonine (PCT)', categorie:'Biochimie', description:'Marqueur spécifique sepsis bactérien' },
    { codeAzamed:'BIO025', nom:'LDH (Lacticodéshydrogénase)', categorie:'Biochimie', description:'Marqueur lésionnel - hémolyse, infarctus, tumeurs' },
    { codeAzamed:'BIO026', nom:'CPK (Créatine phosphokinase)', categorie:'Biochimie', description:'Marqueur musculaire - infarctus, rhabdomyolyse' },
    { codeAzamed:'BIO027', nom:'Troponine I ou T (Ultrasensible)', categorie:'Biochimie', description:'Marqueur spécifique infarctus du myocarde' },
    { codeAzamed:'BIO028', nom:'PSA total (Antigène prostatique spécifique)', categorie:'Biochimie', description:'Dépistage cancer de la prostate' },
    { codeAzamed:'BIO029', nom:'PSA libre / PSA total (Ratio)', categorie:'Biochimie', description:'Différenciation cancer / hypertrophie prostatique' },
    { codeAzamed:'BIO030', nom:'TSH (Thyréostimuline)', categorie:'Biochimie', description:'Dépistage et suivi dysthyroïdies' },
    { codeAzamed:'BIO031', nom:'T4 libre (FT4)', categorie:'Biochimie', description:'Hormone thyroïdienne active' },
    { codeAzamed:'BIO032', nom:'T3 libre (FT3)', categorie:'Biochimie', description:'Hormone thyroïdienne - hyperthyroïdie' },
    { codeAzamed:'BIO033', nom:'Beta-HCG quantitatif', categorie:'Biochimie', description:'Test de grossesse + suivi GEU + choriocarcinome' },
    { codeAzamed:'BIO034', nom:'Amylase sérique', categorie:'Biochimie', description:'Bilan pancréatique - pancréatite aiguë' },
    { codeAzamed:'BIO035', nom:'Lipase sérique', categorie:'Biochimie', description:'Bilan pancréatique - plus spécifique que amylase' },
    { codeAzamed:'BIO036', nom:'Acide lactique (Lactates)', categorie:'Biochimie', description:'Sepsis, choc, hypoxie tissulaire' },
    { codeAzamed:'BIO037', nom:'Gaz du sang artériel (GDS)', categorie:'Biochimie', description:'pH, pCO2, pO2, HCO3 - insuffisance respiratoire' },
    { codeAzamed:'BIO038', nom:'Microalbuminurie (Rapport Alb/Créat urinaire)', categorie:'Biochimie', description:'Néphropathie débutante - diabète, HTA' },
    { codeAzamed:'BIO039', nom:'Protéinurie des 24 heures', categorie:'Biochimie', description:'Syndrome néphrotique - glomérulonéphrite' },
    { codeAzamed:'BIO040', nom:'Créatinine urinaire + Clairance', categorie:'Biochimie', description:'Débit de filtration glomérulaire (DFG)' },
    { codeAzamed:'BIO041', nom:'Alpha-fœtoprotéine (AFP)', categorie:'Biochimie', description:'Marqueur tumoral - hépatocarcinome, tumeurs germinales' },
    { codeAzamed:'BIO042', nom:'CA 125', categorie:'Biochimie', description:'Marqueur tumoral - cancer ovaire' },
    { codeAzamed:'BIO043', nom:'CA 19-9', categorie:'Biochimie', description:'Marqueur tumoral - cancer pancréas, voies biliaires' },
    { codeAzamed:'BIO044', nom:'ACE (Antigène carcino-embryonnaire)', categorie:'Biochimie', description:'Marqueur tumoral - cancer colorectal, poumon' },

    // Sérologie / Immunologie
    { codeAzamed:'SER001', nom:'Test VIH (ELISA 4ème génération Ag/Ac)', categorie:'Sérologie', description:'Dépistage VIH 1 et 2 - antigène p24 + anticorps' },
    { codeAzamed:'SER002', nom:'Test Rapide VIH (TDR)', categorie:'Sérologie', description:'Dépistage VIH rapide sur sang total' },
    { codeAzamed:'SER003', nom:'Western Blot VIH (Confirmation)', categorie:'Sérologie', description:'Confirmation infection VIH après ELISA positif' },
    { codeAzamed:'SER004', nom:'Charge virale VIH (ARN VIH)', categorie:'Sérologie', description:'Quantification virémie - suivi traitement ARV' },
    { codeAzamed:'SER005', nom:'CD4 / CD8 (Lymphocytes T)', categorie:'Sérologie', description:'Suivi immunologique VIH - décision thérapeutique' },
    { codeAzamed:'SER006', nom:'Antigène HBs (Hépatite B)', categorie:'Sérologie', description:'Dépistage infection hépatite B active' },
    { codeAzamed:'SER007', nom:'Anticorps anti-HBs', categorie:'Sérologie', description:'Immunité post-vaccinale ou guérison hépatite B' },
    { codeAzamed:'SER008', nom:'Anticorps anti-HBc (IgM + IgG)', categorie:'Sérologie', description:'Contact ancien ou récent avec virus hépatite B' },
    { codeAzamed:'SER009', nom:'Antigène HBe + Anticorps anti-HBe', categorie:'Sérologie', description:'Réplication virale hépatite B - infectiosité' },
    { codeAzamed:'SER010', nom:'Charge virale VHB (ADN VHB)', categorie:'Sérologie', description:'Quantification hépatite B - suivi traitement' },
    { codeAzamed:'SER011', nom:'Anticorps anti-VHC (Hépatite C)', categorie:'Sérologie', description:'Dépistage infection hépatite C' },
    { codeAzamed:'SER012', nom:'Charge virale VHC (ARN VHC)', categorie:'Sérologie', description:'Quantification hépatite C - suivi traitement' },
    { codeAzamed:'SER013', nom:'VDRL (Syphilis - Dépistage)', categorie:'Sérologie', description:'Test non tréponémique - dépistage syphilis' },
    { codeAzamed:'SER014', nom:'TPHA (Syphilis - Confirmation)', categorie:'Sérologie', description:'Test tréponémique - confirmation syphilis' },
    { codeAzamed:'SER015', nom:'Test Rapide Syphilis (TDR)', categorie:'Sérologie', description:'Dépistage rapide syphilis - terrain' },
    { codeAzamed:'SER016', nom:'Sérologie Toxoplasmose IgG + IgM', categorie:'Sérologie', description:'Immunité et infection récente - grossesse' },
    { codeAzamed:'SER017', nom:'Sérologie Rubéole IgG + IgM', categorie:'Sérologie', description:'Immunité rubéole - bilan prénatal' },
    { codeAzamed:'SER018', nom:'Sérologie CMV (Cytomégalovirus) IgG+IgM', categorie:'Sérologie', description:'Immunodéprimés, grossesse - infection CMV' },
    { codeAzamed:'SER019', nom:'Sérologie Helicobacter pylori', categorie:'Sérologie', description:'Infection gastrique H. pylori' },
    { codeAzamed:'SER020', nom:'Test uréase (Helicobacter pylori)', categorie:'Sérologie', description:'Diagnostic H. pylori sur biopsie ou test respiratoire' },
    { codeAzamed:'SER021', nom:'Sérologie Typhoïde - Widal et Félix', categorie:'Sérologie', description:'Anticorps anti-Salmonella typhi - fièvre typhoïde' },
    { codeAzamed:'SER022', nom:'Sérologie Brucellose (Wright)', categorie:'Sérologie', description:'Brucellose - fièvre ondulante' },
    { codeAzamed:'SER023', nom:'Facteur rhumatoïde (FR)', categorie:'Sérologie', description:'Polyarthrite rhumatoïde' },
    { codeAzamed:'SER024', nom:'Anticorps anti-nucléaires (ANA)', categorie:'Sérologie', description:'Maladies auto-immunes - LED, connectivites' },
    { codeAzamed:'SER025', nom:'ASLO (Antistreptolysines O)', categorie:'Sérologie', description:'Infection streptocoque - rhumatisme articulaire aigu' },
    { codeAzamed:'SER026', nom:'Test de Coombs direct', categorie:'Sérologie', description:'Anémie hémolytique auto-immune' },

    // Parasitologie
    { codeAzamed:'PAR001', nom:'Goutte épaisse + Frottis sanguin (Paludisme)', categorie:'Parasitologie', description:'Diagnostic de référence paludisme - espèce et densité parasitaire' },
    { codeAzamed:'PAR002', nom:'TDR Paludisme (Test Rapide Ag Plasmodium)', categorie:'Parasitologie', description:'Antigène Plasmodium falciparum et vivax - résultat en 15 min' },
    { codeAzamed:'PAR003', nom:'PCR Paludisme', categorie:'Parasitologie', description:'Diagnostic moléculaire paludisme - espèce et charge parasitaire' },
    { codeAzamed:'PAR004', nom:'Examen Parasitologique des Selles (EPS)', categorie:'Parasitologie', description:'Recherche parasites intestinaux : œufs, kystes, trophozoïtes' },
    { codeAzamed:'PAR005', nom:'Coproculture et EPS (avec culture)', categorie:'Parasitologie', description:'Parasites intestinaux avec culture pour amibes' },
    { codeAzamed:'PAR006', nom:'Recherche Microfilaires (Loase)', categorie:'Parasitologie', description:'Loa loa - microfilarémie diurne sur sang' },
    { codeAzamed:'PAR007', nom:'Recherche Microfilaires (Onchocercose - Biopsie)', categorie:'Parasitologie', description:'Onchocerca volvulus - biopsie cutanée exsangue' },
    { codeAzamed:'PAR008', nom:'Sérologie Onchocercose', categorie:'Parasitologie', description:'Anticorps anti-Onchocerca volvulus' },
    { codeAzamed:'PAR009', nom:'Examen Parasitologique Urine (Bilharziose)', categorie:'Parasitologie', description:'Schistosoma haematobium - œufs dans urines' },
    { codeAzamed:'PAR010', nom:'Sérologie Schistosomiase (Bilharziose)', categorie:'Parasitologie', description:'Anticorps anti-Schistosoma' },
    { codeAzamed:'PAR011', nom:'Recherche Trypanosomes (THA - Maladie du Sommeil)', categorie:'Parasitologie', description:'Trypanosoma brucei gambiense - sang, LCR, ganglion' },
    { codeAzamed:'PAR012', nom:'Sérologie Leishmaniose', categorie:'Parasitologie', description:'Anticorps anti-Leishmania' },

    // Bactériologie
    { codeAzamed:'BAC001', nom:'ECBU (Examen Cytobactériologique Urinaire)', categorie:'Bactériologie', description:'Infection urinaire - germe + antibiogramme' },
    { codeAzamed:'BAC002', nom:'Hémoculture', categorie:'Bactériologie', description:'Bactéries dans le sang - septicémie, endocardite' },
    { codeAzamed:'BAC003', nom:'Coproculture', categorie:'Bactériologie', description:'Germes pathogènes dans les selles - diarrhée infectieuse' },
    { codeAzamed:'BAC004', nom:'Examen Bactério Sécrétions Vaginales', categorie:'Bactériologie', description:'Vaginite, vaginose, IST bactériennes + antibiogramme' },
    { codeAzamed:'BAC005', nom:'Examen Bactério Urétral (IST)', categorie:'Bactériologie', description:'Gonococcie, chlamydia - urétrite masculine' },
    { codeAzamed:'BAC006', nom:'Examen Bactério Expectorations (BAAR - Crachat TB)', categorie:'Bactériologie', description:'Bacilles Acido-Alcoolo-Résistants - tuberculose pulmonaire' },
    { codeAzamed:'BAC007', nom:'GeneXpert MTB/RIF (Tuberculose moléculaire)', categorie:'Bactériologie', description:'Diagnostic rapide tuberculose + résistance Rifampicine (2 heures)' },
    { codeAzamed:'BAC008', nom:'Culture Mycobactéries (Löwenstein-Jensen)', categorie:'Bactériologie', description:'Culture BK - antibiogramme tuberculose' },
    { codeAzamed:'BAC009', nom:'Antibiogramme (Isolé d\'une culture)', categorie:'Bactériologie', description:'Sensibilité aux antibiotiques du germe isolé' },
    { codeAzamed:'BAC010', nom:'Prélèvement Gorge / Pharynx', categorie:'Bactériologie', description:'Angine bactérienne - portage streptocoque A' },
    { codeAzamed:'BAC011', nom:'Liquide Céphalo-Rachidien (LCR) - Méningite', categorie:'Bactériologie', description:'Méningite bactérienne - cytologie + biochimie + culture' },
    { codeAzamed:'BAC012', nom:'Liquide pleural / Liquide ascite - Analyse', categorie:'Bactériologie', description:'Empyème, pleurésie, péritonite bactérienne' },
    { codeAzamed:'BAC013', nom:'Examen Bactério Plaie / Pus', categorie:'Bactériologie', description:'Infection cutanée, abcès - germe + antibiogramme' },

    // Imagerie médicale
    { codeAzamed:'IMG001', nom:'Radiographie thoracique de face', categorie:'Imagerie', description:'Poumons, cœur, médiastin - pneumonie, tuberculose, cardiomégalie' },
    { codeAzamed:'IMG002', nom:'Radiographie thoracique de profil', categorie:'Imagerie', description:'Épanchement pleural, opacités postérieures' },
    { codeAzamed:'IMG003', nom:'Radiographie abdomen sans préparation (ASP)', categorie:'Imagerie', description:'Occlusion intestinale, calcifications, pneumopéritoine' },
    { codeAzamed:'IMG004', nom:'Radiographie bassin de face', categorie:'Imagerie', description:'Fractures bassin, hanche, coxarthrose' },
    { codeAzamed:'IMG005', nom:'Radiographie membres supérieurs (épaule, coude, poignet, main)', categorie:'Imagerie', description:'Fractures et lésions ostéo-articulaires membres supérieurs' },
    { codeAzamed:'IMG006', nom:'Radiographie membres inférieurs (hanche, genou, cheville, pied)', categorie:'Imagerie', description:'Fractures et lésions ostéo-articulaires membres inférieurs' },
    { codeAzamed:'IMG007', nom:'Radiographie rachis cervical (face + profil)', categorie:'Imagerie', description:'Cervicalgies, traumatisme cervical, spondylarthrite' },
    { codeAzamed:'IMG008', nom:'Radiographie rachis lombaire (face + profil)', categorie:'Imagerie', description:'Lombalgies, hernie discale, tassement vertébral' },
    { codeAzamed:'IMG009', nom:'Radiographie rachis dorsal', categorie:'Imagerie', description:'Douleurs dorsales, fracture tassement, scoliose' },
    { codeAzamed:'IMG010', nom:'Radiographie crâne (face + profil)', categorie:'Imagerie', description:'Traumatisme crânien, calcifications, sinusites' },
    { codeAzamed:'IMG011', nom:'Échographie abdominale', categorie:'Imagerie', description:'Foie, vésicule biliaire, pancréas, rate, reins' },
    { codeAzamed:'IMG012', nom:'Échographie pelvienne', categorie:'Imagerie', description:'Utérus, ovaires, prostate, vessie' },
    { codeAzamed:'IMG013', nom:'Échographie abdominale + pelvienne (complète)', categorie:'Imagerie', description:'Exploration complète abdomen et pelvis' },
    { codeAzamed:'IMG014', nom:'Échographie obstétricale (Grossesse T1 - Datation)', categorie:'Imagerie', description:'Datation grossesse, vitalité embryonnaire - 1er trimestre' },
    { codeAzamed:'IMG015', nom:'Échographie obstétricale (Grossesse T2 - Morphologie)', categorie:'Imagerie', description:'Biométrie fœtale, morphologie, placenta - 2ème trimestre' },
    { codeAzamed:'IMG016', nom:'Échographie obstétricale (Grossesse T3 - Croissance)', categorie:'Imagerie', description:'Croissance fœtale, présentation, liquide amniotique' },
    { codeAzamed:'IMG017', nom:'Échographie cervicale / thyroïde', categorie:'Imagerie', description:'Nodules thyroïdiens, goitre, cancer thyroïde' },
    { codeAzamed:'IMG018', nom:'Échographie cardiaque (Échocardiographie)', categorie:'Imagerie', description:'Fonction cardiaque, valves, péricarde - cardiopathies' },
    { codeAzamed:'IMG019', nom:'Échographie Doppler artério-veineux membres', categorie:'Imagerie', description:'Thrombose veineuse profonde, artériopathie' },
    { codeAzamed:'IMG020', nom:'Échographie des parties molles', categorie:'Imagerie', description:'Abcès, collections, masses des tissus mous' },
    { codeAzamed:'IMG021', nom:'Électrocardiogramme (ECG 12 dérivations)', categorie:'Imagerie', description:'Activité électrique cardiaque - arythmies, infarctus, HVG' },
    { codeAzamed:'IMG022', nom:'Scanner cérébral (TDM cérébral)', categorie:'Imagerie', description:'AVC, traumatisme crânien, tumeurs cérébrales, méningite' },
    { codeAzamed:'IMG023', nom:'Scanner thoracique (TDM thorax)', categorie:'Imagerie', description:'Tuberculose, cancer poumon, embolie pulmonaire, épanchement' },
    { codeAzamed:'IMG024', nom:'Scanner abdomino-pelvien (TDM AP)', categorie:'Imagerie', description:'Tumeurs, abcès, appendicite, occlusion, lithiases' },
    { codeAzamed:'IMG025', nom:'Scanner des membres / rachis', categorie:'Imagerie', description:'Fractures complexes, hernie discale, canal étroit' },
    { codeAzamed:'IMG026', nom:'IRM cérébrale', categorie:'Imagerie', description:'Lésions cérébrales - épilepsie, SEP, AVC ischémique, tumeurs' },
    { codeAzamed:'IMG027', nom:'IRM rachidienne (cervicale / dorsale / lombaire)', categorie:'Imagerie', description:'Hernie discale, compression médullaire, myélopathie' },
    { codeAzamed:'IMG028', nom:'IRM abdominale / pelvienne', categorie:'Imagerie', description:'Tumeurs pelviennes, fibrome, cancer col utérus, prostate' },
    { codeAzamed:'IMG029', nom:'Mammographie (Sein - Dépistage)', categorie:'Imagerie', description:'Dépistage et diagnostic cancer du sein' },
    { codeAzamed:'IMG030', nom:'Échographie mammaire', categorie:'Imagerie', description:'Nodule du sein - caractérisation masse' },
    { codeAzamed:'IMG031', nom:'Colposcopie', categorie:'Imagerie', description:'Examen col utérin - lésions précancéreuses (CIN)' },
    { codeAzamed:'IMG032', nom:'Fibroscopie gastrique (Gastroscopie)', categorie:'Imagerie', description:'Ulcère gastro-duodénal, cancer gastrique, H. pylori' },
    { codeAzamed:'IMG033', nom:'Coloscopie', categorie:'Imagerie', description:'Cancer colorectal, polypes, colites' },
    { codeAzamed:'IMG034', nom:'Rectoscopie / Sigmoïdoscopie', categorie:'Imagerie', description:'Hémorroïdes, tumeurs rectales, recto-colite' },

    // Anatomopathologie / Cytologie
    { codeAzamed:'ANA001', nom:'Frottis cervico-vaginal (FCV / Test de Pap)', categorie:'Anatomopathologie', description:'Dépistage cancer du col de l\'utérus - lésions précancéreuses' },
    { codeAzamed:'ANA002', nom:'Test HPV (Human Papillomavirus)', categorie:'Anatomopathologie', description:'Dépistage virus du papillome humain - cancer col' },
    { codeAzamed:'ANA003', nom:'Biopsie hépatique', categorie:'Anatomopathologie', description:'Fibrose hépatique - hépatite B/C chronique, cirrhose' },
    { codeAzamed:'ANA004', nom:'Biopsie cutanée', categorie:'Anatomopathologie', description:'Tumeurs cutanées, dermatoses chroniques, leishmaniose cutanée' },
    { codeAzamed:'ANA005', nom:'Biopsie ganglionnaire', categorie:'Anatomopathologie', description:'Adénopathies - lymphome, tuberculose ganglionnaire, sarcoïdose' },
    { codeAzamed:'ANA006', nom:'Biopsie prostatique', categorie:'Anatomopathologie', description:'Cancer de la prostate - Gleason' },
    { codeAzamed:'ANA007', nom:'Biopsie osseuse', categorie:'Anatomopathologie', description:'Tumeurs osseuses, ostéomyélite chronique' },
    { codeAzamed:'ANA008', nom:'Examen anatomopathologique pièce opératoire', categorie:'Anatomopathologie', description:'Analyse histologique complète des pièces chirurgicales' },
    { codeAzamed:'ANA009', nom:'Cytologie du liquide pleural / ascite', categorie:'Anatomopathologie', description:'Cellules malignes, étiologie épanchement' },
    { codeAzamed:'ANA010', nom:'Myélogramme (Ponction sternale)', categorie:'Anatomopathologie', description:'Leucémies, myélome, aplasie médullaire' },
    { codeAzamed:'ANA011', nom:'Biopsie de moelle osseuse (BOM)', categorie:'Anatomopathologie', description:'Lymphome, myélome - histologie médullaire' },

    // Urologie
    { codeAzamed:'URO001', nom:'Spermiogramme complet', categorie:'Urologie', description:'Fertilité masculine - volume, mobilité, morphologie, concentration' },
    { codeAzamed:'URO002', nom:'Spermioculture', categorie:'Urologie', description:'Infection génitale masculine - leucospermie' },
    { codeAzamed:'URO003', nom:'Test de Huhner (Post-coïtal)', categorie:'Urologie', description:'Infertilité du couple - interaction sperme/glaire' },
    { codeAzamed:'URO004', nom:'Bandelette urinaire (BU)', categorie:'Urologie', description:'Dépistage rapide : nitrites, leucocytes, protéines, glucose, sang' },
    { codeAzamed:'URO005', nom:'Ionogramme urinaire', categorie:'Urologie', description:'Na, K urinaires - rein et troubles électrolytiques' },

    // Hormonologie
    { codeAzamed:'HOR001', nom:'FSH (Hormone folliculo-stimulante)', categorie:'Hormonologie', description:'Fertilité féminine et masculine - ménopause' },
    { codeAzamed:'HOR002', nom:'LH (Hormone lutéinisante)', categorie:'Hormonologie', description:'Fertilité - ovulation - hypogonadisme' },
    { codeAzamed:'HOR003', nom:'Prolactine', categorie:'Hormonologie', description:'Infertilité, galactorrhée, adénome hypophysaire' },
    { codeAzamed:'HOR004', nom:'Estradiol (E2)', categorie:'Hormonologie', description:'Fertilité féminine - cycle ovarien' },
    { codeAzamed:'HOR005', nom:'Progestérone', categorie:'Hormonologie', description:'Suivi grossesse, corps jaune, infertilité' },
    { codeAzamed:'HOR006', nom:'Testostérone totale', categorie:'Hormonologie', description:'Hypogonadisme masculin, SOPK chez la femme' },
    { codeAzamed:'HOR007', nom:'Cortisol sérique (8h)', categorie:'Hormonologie', description:'Syndrome de Cushing, insuffisance surrénale' },
    { codeAzamed:'HOR008', nom:'Insulinémie à jeun', categorie:'Hormonologie', description:'Insulinorésistance, hypoglycémie, insulinome' },
  ];

  let countEx = 0;
  for (const ex of examens) {
    const exists = await prisma.examen.findUnique({ where: { codeAzamed: ex.codeAzamed } });
    if (!exists) { await prisma.examen.create({ data: ex }); countEx++; }
  }
  console.log(`✅ Examens : ${countEx} ajoutés (${examens.length} dans la liste)`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. SERVICES MÉDICAUX — Complet Cameroun
  // ══════════════════════════════════════════════════════════════════════════
  const services = [
    // Spécialités médicales
    { nom:'Médecine Générale', categorie:'Spécialité médicale', description:'Consultations de médecine générale - toutes pathologies courantes' },
    { nom:'Pédiatrie', categorie:'Spécialité médicale', description:'Médecine des enfants de 0 à 15 ans' },
    { nom:'Cardiologie', categorie:'Spécialité médicale', description:'Maladies du cœur et des vaisseaux - HTA, insuffisance cardiaque, arythmies' },
    { nom:'Pneumologie', categorie:'Spécialité médicale', description:'Maladies poumons et voies respiratoires - asthme, BPCO, tuberculose' },
    { nom:'Neurologie', categorie:'Spécialité médicale', description:'Maladies du système nerveux - épilepsie, AVC, Parkinson, SEP' },
    { nom:'Gastro-Entérologie', categorie:'Spécialité médicale', description:'Maladies du tube digestif et du foie - ulcère, hépatites, cirrhose' },
    { nom:'Endocrinologie - Diabétologie', categorie:'Spécialité médicale', description:'Diabète, maladies thyroïdiennes, hormones, obésité' },
    { nom:'Infectiologie - Maladies Tropicales', categorie:'Spécialité médicale', description:'VIH/SIDA, tuberculose, paludisme sévère, IST, fièvres tropicales' },
    { nom:'Rhumatologie', categorie:'Spécialité médicale', description:'Maladies des articulations et des os - arthrite, lupus, polyarthrite' },
    { nom:'Hématologie', categorie:'Spécialité médicale', description:'Maladies du sang - anémie sévère, drépanocytose, leucémie, lymphome' },
    { nom:'Oncologie - Cancérologie', categorie:'Spécialité médicale', description:'Diagnostic et traitement de tous types de cancers' },
    { nom:'Dermatologie - Vénérologie', categorie:'Spécialité médicale', description:'Maladies de la peau - infections, dermatoses, IST cutanées' },
    { nom:'ORL (Oto-Rhino-Laryngologie)', categorie:'Spécialité médicale', description:'Oreille, nez, gorge, voix, audition' },
    { nom:'Ophtalmologie', categorie:'Spécialité médicale', description:'Maladies des yeux - vue, glaucome, cataracte, trachome, rétine' },
    { nom:'Stomatologie - Odontologie', categorie:'Spécialité médicale', description:'Soins dentaires, caries, extractions, prothèses' },
    { nom:'Psychiatrie - Santé Mentale', categorie:'Spécialité médicale', description:'Maladies mentales - dépression, schizophrénie, addictions, troubles anxieux' },
    { nom:'Néphrologie', categorie:'Spécialité médicale', description:'Maladies des reins - insuffisance rénale, glomérulonéphrites, dialyse' },
    { nom:'Urologie', categorie:'Spécialité médicale', description:'Voies urinaires et appareil génital masculin - prostate, lithiase, cancer' },
    { nom:'Médecine Interne', categorie:'Spécialité médicale', description:'Maladies systémiques complexes, poly-pathologies' },
    { nom:'Gériatrie', categorie:'Spécialité médicale', description:'Médecine des personnes âgées - poly-médication, fragilité' },
    { nom:'Médecine du Sport', categorie:'Spécialité médicale', description:'Pathologies sportives, certificats d\'aptitude, rééducation sportive' },
    { nom:'Allergologie', categorie:'Spécialité médicale', description:'Allergies - asthme allergique, rhinite, urticaire, anaphylaxie' },
    // Spécialités chirurgicales
    { nom:'Chirurgie Générale', categorie:'Spécialité chirurgicale', description:'Chirurgie abdominale, digestive, hernies, appendicite, vésicule' },
    { nom:'Chirurgie Orthopédique et Traumatologique', categorie:'Spécialité chirurgicale', description:'Os, articulations, fractures, prothèses de hanche et genou' },
    { nom:'Neurochirurgie', categorie:'Spécialité chirurgicale', description:'Chirurgie cerveau et moelle épinière - tumeurs, HIC, hernie discale' },
    { nom:'Chirurgie Cardio-Vasculaire', categorie:'Spécialité chirurgicale', description:'Chirurgie cœur et gros vaisseaux - pontages, valves' },
    { nom:'Chirurgie Thoracique', categorie:'Spécialité chirurgicale', description:'Poumons, plèvre, médiastin, trachée' },
    { nom:'Chirurgie Urologique', categorie:'Spécialité chirurgicale', description:'Rein, prostate, urètre, lithiase urinaire' },
    { nom:'Chirurgie Pédiatrique', categorie:'Spécialité chirurgicale', description:'Toutes chirurgies chez l\'enfant - malformations, hernies, appendicite' },
    { nom:'Chirurgie Plastique et Reconstructrice', categorie:'Spécialité chirurgicale', description:'Cicatrices, brûlures, malformations, reconstructions après cancer' },
    { nom:'Chirurgie Ophtalmologique', categorie:'Spécialité chirurgicale', description:'Cataracte, glaucome, décollement rétine, ptérygion' },
    { nom:'Chirurgie ORL', categorie:'Spécialité chirurgicale', description:'Amygdales, végétations, sinus, larynx, oreille' },
    { nom:'Chirurgie Maxillo-Faciale et Stomatologique', categorie:'Spécialité chirurgicale', description:'Chirurgie dentaire complexe, traumatismes faciaux, tumeurs bucco-faciales' },
    { nom:'Chirurgie Gynécologique', categorie:'Spécialité chirurgicale', description:'Fibrome, kyste ovarien, cancer col utérus, prolapsus' },
    // Gynécologie-Obstétrique
    { nom:'Gynécologie Médicale', categorie:'Gynécologie-Obstétrique', description:'Consultations gynécologiques, contraception, IST, ménopause' },
    { nom:'Consultation Prénatale (CPN)', categorie:'Gynécologie-Obstétrique', description:'Suivi médical femme enceinte - bilans, prévention, vaccins' },
    { nom:'Accouchement Normal (Voie Basse)', categorie:'Gynécologie-Obstétrique', description:'Accouchement par voie naturelle avec sage-femme ou médecin' },
    { nom:'Accouchement par Césarienne', categorie:'Gynécologie-Obstétrique', description:'Accouchement chirurgical sous anesthésie' },
    { nom:'Planning Familial', categorie:'Gynécologie-Obstétrique', description:'Contraception - pilule, DIU, implant, injectable, préservatifs' },
    { nom:'Consultation Post-natale (CPoN)', categorie:'Gynécologie-Obstétrique', description:'Suivi mère et nourrisson après accouchement' },
    { nom:'Dépistage Cancer du Col (FCV + Colposcopie)', categorie:'Gynécologie-Obstétrique', description:'Frottis cervico-vaginal et examen colposcopique' },
    { nom:'Échographie Obstétricale', categorie:'Gynécologie-Obstétrique', description:'Surveillance grossesse par ultrasons - tous trimestres' },
    { nom:'Prise en charge Fausse Couche / Avortement incomplet', categorie:'Gynécologie-Obstétrique', description:'Aspiration manuelle intra-utérine (AMIU), curetage' },
    { nom:'Prise en charge Grossesse Extra-Utérine (GEU)', categorie:'Gynécologie-Obstétrique', description:'Chirurgie GEU - urgence gynécologique' },
    // Urgences et Réanimation
    { nom:'Urgences Médicales et Chirurgicales 24h/24 - 7j/7', categorie:'Urgences', description:'Prise en charge immédiate de toutes les urgences' },
    { nom:'Réanimation Adulte (Soins Intensifs)', categorie:'Urgences', description:'Détresse respiratoire, état de choc, coma - ventilation artificielle' },
    { nom:'Réanimation Pédiatrique', categorie:'Urgences', description:'Soins intensifs enfants - paludisme grave, méningite, sepsis' },
    { nom:'Unité de Soins Intensifs Néonataux (USIN)', categorie:'Urgences', description:'Nouveau-nés prématurés ou malades - incubateurs, ventilation' },
    { nom:'Ambulance Médicalisée / SAMU', categorie:'Urgences', description:'Transport médicalisé et soins d\'urgence pré-hospitaliers' },
    { nom:'Prise en charge Brûlés', categorie:'Urgences', description:'Soins brûlures - pansements, greffes, réanimation' },
    // Hospitalisation
    { nom:'Hospitalisation Médecine Interne / Générale', categorie:'Hospitalisation', description:'Chambres hospitalisation adultes - médecine' },
    { nom:'Hospitalisation Chirurgie', categorie:'Hospitalisation', description:'Chambres post-opératoires - surveillance chirurgicale' },
    { nom:'Hospitalisation Pédiatrique', categorie:'Hospitalisation', description:'Chambres enfants hospitalisés' },
    { nom:'Hospitalisation Maternité', categorie:'Hospitalisation', description:'Chambres mère-enfant - pré et post-partum' },
    { nom:'Hospitalisation Psychiatrie', categorie:'Hospitalisation', description:'Unité psychiatrique - hospitalisations courtes et longues' },
    // Plateau technique
    { nom:'Laboratoire d\'Analyses Médicales (Interne)', categorie:'Plateau technique', description:'Analyses biologiques réalisées sur place' },
    { nom:'Pharmacie Hospitalière (Interne)', categorie:'Plateau technique', description:'Dispensation médicaments intra-hospitaliers' },
    { nom:'Bloc Opératoire', categorie:'Plateau technique', description:'Salles d\'opération chirurgicales avec anesthésie' },
    { nom:'Radiologie et Imagerie Médicale', categorie:'Plateau technique', description:'Radiographies, échographies, scanners, IRM sur place' },
    { nom:'Endoscopie Digestive (Fibroscopie / Coloscopie)', categorie:'Plateau technique', description:'Exploration tube digestif par endoscopes' },
    { nom:'Hémodialyse - Dialyse Péritonéale', categorie:'Plateau technique', description:'Épuration extrarénale - insuffisance rénale chronique terminale' },
    { nom:'Transfusion Sanguine (Banque de Sang)', categorie:'Plateau technique', description:'Collecte, qualification biologique et dispensation du sang' },
    { nom:'Kinésithérapie - Rééducation Fonctionnelle', categorie:'Plateau technique', description:'Rééducation motrice, respiratoire et neurologique' },
    { nom:'Consultation Nutritionnelle - Diététique Médicale', categorie:'Plateau technique', description:'Obésité, diabète, dénutrition, régimes thérapeutiques' },
    { nom:'Stérilisation et Bloc Central', categorie:'Plateau technique', description:'Stérilisation du matériel médico-chirurgical' },
    // Prévention / Santé publique
    { nom:'Vaccination Enfant - Programme Élargi (PEV)', categorie:'Prévention', description:'BCG, Polio, DTC-HepB-Hib, Rougeole, Pneumo, Rota, HPV...' },
    { nom:'Vaccination Adulte (Fièvre jaune, Méningite, Hépatite B)', categorie:'Prévention', description:'Vaccins adultes et voyageurs - carnet de vaccination' },
    { nom:'PTME (Prévention Transmission Mère-Enfant VIH)', categorie:'Prévention', description:'Dépistage VIH en maternité + ARV préventifs pour le nouveau-né' },
    { nom:'Dépistage VIH / Conseil Dépistage Volontaire (CDV)', categorie:'Prévention', description:'Test VIH + counseling pré et post test' },
    { nom:'TPI Paludisme Grossesse (Sulfadoxine-Pyriméthamine)', categorie:'Prévention', description:'Traitement Préventif Intermittent paludisme chez femme enceinte' },
    { nom:'Déparasitage Systématique (Albendazole / Mébendazole)', categorie:'Prévention', description:'Vermifugation enfants et adultes - programme national' },
    { nom:'Distribution Moustiquaires Imprégnées (MILDA)', categorie:'Prévention', description:'Prévention paludisme par moustiquaires longue durée d\'action' },
    { nom:'Santé Scolaire - Visites Médicales Scolaires', categorie:'Prévention', description:'Dépistage maladies, vaccination, déparasitage en milieu scolaire' },
    { nom:'Médecine du Travail - Visite d\'Aptitude', categorie:'Prévention', description:'Bilans médicaux professionnels, aptitude au travail' },
    // Programmes spéciaux Cameroun
    { nom:'Centre de Traitement ARV (PNLS - VIH)', categorie:'Programmes Cameroun', description:'Initiation et suivi traitement antirétroviral - Programme National de Lutte contre le SIDA' },
    { nom:'Centre de Diagnostic et de Traitement Tuberculose (CDT)', categorie:'Programmes Cameroun', description:'Diagnostic et traitement DOTS tuberculose - Programme National Tuberculose' },
    { nom:'Prise en charge Drépanocytose (Centre spécialisé)', categorie:'Programmes Cameroun', description:'Suivi régulier, hydroxyurée, prévention des crises - patients drépanocytaires' },
    { nom:'Unité Nutritionnelle Thérapeutique Ambulatoire (UNTA)', categorie:'Programmes Cameroun', description:'Prise en charge malnutrition aiguë sévère enfants sans complications' },
    { nom:'Unité Nutritionnelle Thérapeutique Intensive (UNTI)', categorie:'Programmes Cameroun', description:'Hospitalisation malnutrition aiguë sévère avec complications' },
    { nom:'Programme de Lutte contre l\'Onchocercose / Filariose (CDTI)', categorie:'Programmes Cameroun', description:'Distribution communautaire Ivermectine - Mectizan' },
    { nom:'Programme de Lutte contre la Bilharziose (PNSB)', categorie:'Programmes Cameroun', description:'Distribution Praziquantel en zones endémiques' },
    { nom:'Soins Palliatifs et Accompagnement Fin de Vie', categorie:'Programmes Cameroun', description:'Accompagnement patients en fin de vie - cancer, SIDA stade terminal' },
    { nom:'Prise en charge Hypertension Artérielle (HTA)', categorie:'Programmes Cameroun', description:'Consultation spécialisée HTA - programme maladies non transmissibles' },
    { nom:'Consultation Diabète (Programme MNT)', categorie:'Programmes Cameroun', description:'Suivi diabète - éducation thérapeutique, insuline, autosurveillance' },
    { nom:'Chirurgie Cataracte (Programme Cécité Évitable)', categorie:'Programmes Cameroun', description:'Opération cataracte - lutte contre la cécité évitable' },
    { nom:'Programme de Santé Mentale Communautaire', categorie:'Programmes Cameroun', description:'Prise en charge psychiatrique ambulatoire - épilepsie, psychoses' },
    // Services pharmacie
    { nom:'Dispensation Médicaments sur Ordonnance', categorie:'Services Pharmacie', description:'Délivrance médicaments prescrits - vérification ordonnance' },
    { nom:'Vente Médicaments sans Ordonnance (OTC)', categorie:'Services Pharmacie', description:'Médicaments de confort disponibles sans prescription médicale' },
    { nom:'Pharmacie de Garde (Nuit / Dimanche / Jours Fériés)', categorie:'Services Pharmacie', description:'Disponible en dehors des heures ouvrables' },
    { nom:'Conseil et Orientation Pharmaceutique', categorie:'Services Pharmacie', description:'Conseils sur les médicaments, interactions, effets secondaires' },
    { nom:'Vente Matériel Médical Paramédical', categorie:'Services Pharmacie', description:'Seringues, pansements, tensiomètres, glucomètres, béquilles...' },
    { nom:'Produits de Parapharmacie et Cosmétique Médicale', categorie:'Services Pharmacie', description:'Produits hygiène, compléments alimentaires, cosmétiques médicaux' },
    { nom:'Préparation Magistrale (Sur ordonnance)', categorie:'Services Pharmacie', description:'Préparations pharmaceutiques personnalisées sur ordonnance' },
    { nom:'Médicaments Essentiels Génériques (MEG)', categorie:'Services Pharmacie', description:'Médicaments essentiels à prix réduit - liste MINSANTE Cameroun' },
    // Services laboratoire
    { nom:'Analyses Urgentes - Disponibles H24', categorie:'Services Laboratoire', description:'Résultats biologiques urgents disponibles jour et nuit' },
    { nom:'Prélèvement à Domicile', categorie:'Services Laboratoire', description:'Infirmier ou technicien qui se déplace au domicile du patient' },
    { nom:'Bilan Prénuptial Complet', categorie:'Services Laboratoire', description:'VIH, syphilis, hépatite B, groupe sanguin, NFS - avant mariage' },
    { nom:'Bilan Prénatal Standard (BPN)', categorie:'Services Laboratoire', description:'NFS, groupe, VIH, syphilis, toxoplasmose, rubéole, glycémie' },
    { nom:'Bilan Préopératoire', categorie:'Services Laboratoire', description:'NFS, coagulation, groupe sanguin, ionogramme, ECG avant chirurgie' },
    { nom:'Bilan de Santé Annuel (Check-up)', categorie:'Services Laboratoire', description:'Bilan complet de routine - glycémie, lipides, rein, foie, NFS, PSA' },
    { nom:'Bilan VIH Complet (Charge virale + CD4)', categorie:'Services Laboratoire', description:'Suivi complet patient VIH sous ARV' },
    { nom:'Bilan Hépatite B Complet', categorie:'Services Laboratoire', description:'AgHBs, anticorps, charge virale, bilan hépatique' },
  ];

  let countSvc = 0;
  for (const svc of services) {
    const exists = await prisma.serviceMedical.findFirst({ where: { nom: svc.nom } });
    if (!exists) { await prisma.serviceMedical.create({ data: svc }); countSvc++; }
  }
  console.log(`✅ Services : ${countSvc} ajoutés (${services.length} dans la liste)`);

  console.log('\n🎉 Seed Cameroun terminé avec succès !');
  console.log(`📊 Total inséré : ${medicaments.length} médicaments | ${examens.length} examens | ${services.length} services`);
  console.log('👤 Connexion admin : admin@azamed.com / Admin@AZAMED2024');
}

main()
  .catch((e) => { console.error('❌ Erreur seed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });