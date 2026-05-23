// src/seed.js — Charge le catalogue depuis seed-data.js directement
process.env.DATABASE_URL = "postgresql://postgres:VxsJGpRQLqhVpGOhAbnRmSCpNSGIQLCM@monorail.proxy.rlwy.net:47229/railway";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { MEDICAMENTS, EXAMENS, SERVICES } = require('./prisma/seed-data');

async function main() {
  console.log('🌱 Seeding catalogue AZAMED Cameroun...\n');

  // Medicaments
  console.log(`📦 Ajout de ${MEDICAMENTS.length} medicaments...`);
  let mOk = 0, mSkip = 0;
  for (const med of MEDICAMENTS) {
    try {
      const ex = await prisma.medicament.findFirst({ where: { nomCommercial: med.nomCommercial } });
      if (ex) { mSkip++; continue; }
      await prisma.medicament.create({ data: { ...med, isActive: true } });
      mOk++;
    } catch(e) { mSkip++; console.error('  ❌', med.nomCommercial, e.message); }
  }
  console.log(`  ✅ ${mOk} ajoutés, ${mSkip} ignorés\n`);

  // Examens
  console.log(`🔬 Ajout de ${EXAMENS.length} examens...`);
  let eOk = 0, eSkip = 0;
  for (const ex of EXAMENS) {
    try {
      const found = await prisma.examen.findFirst({ where: { codeAzamed: ex.codeAzamed } });
      if (found) { eSkip++; continue; }
      await prisma.examen.create({ data: { ...ex, isActive: true } });
      eOk++;
    } catch(e) { eSkip++; console.error('  ❌', ex.nom, e.message); }
  }
  console.log(`  ✅ ${eOk} ajoutés, ${eSkip} ignorés\n`);

  // Services
  console.log(`🏥 Ajout de ${SERVICES.length} services...`);
  let sOk = 0, sSkip = 0;
  for (const sv of SERVICES) {
    try {
      const found = await prisma.serviceMedical.findFirst({ where: { nom: sv.nom } });
      if (found) { sSkip++; continue; }
      await prisma.serviceMedical.create({ data: { ...sv, isActive: true } });
      sOk++;
    } catch(e) { sSkip++; console.error('  ❌', sv.nom, e.message); }
  }
  console.log(`  ✅ ${sOk} ajoutés, ${sSkip} ignorés\n`);

  console.log('🎉 Catalogue AZAMED Cameroun chargé !');
  console.log(`   📊 ${mOk} médicaments | ${eOk} examens | ${sOk} services`);
}

main()
  .catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
