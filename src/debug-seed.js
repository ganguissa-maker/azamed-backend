// debug-seed.js — Diagnostic pour comprendre l'erreur
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Test de connexion...');
  
  // 1. Tester la connexion
  try {
    const count = await prisma.medicament.count();
    console.log(`✅ Connexion OK — ${count} médicaments déjà en base`);
  } catch (e) {
    console.error('❌ Erreur connexion:', e.message);
    return;
  }

  // 2. Tester l'insertion d'un seul médicament
  console.log('\n📦 Test insertion médicament...');
  try {
    const med = await prisma.medicament.create({
      data: {
        nomCommercial:        'TEST Paracétamol 500mg',
        dci:                  'Paracétamol',
        classeTherapeutique:  'Test',
        forme:                'Comprimé',
        dosage:               '500mg',
        laboratoireFabricant: 'Test',
        isActive:             true,
      }
    });
    console.log('✅ Médicament créé:', med.id);

    // Supprimer le test
    await prisma.medicament.delete({ where: { id: med.id } });
    console.log('✅ Test nettoyé');
  } catch (e) {
    console.error('❌ Erreur création médicament:');
    console.error('   Code:', e.code);
    console.error('   Message:', e.message);
    if (e.meta) console.error('   Meta:', JSON.stringify(e.meta));
  }

  // 3. Tester l'insertion d'un examen
  console.log('\n🔬 Test insertion examen...');
  try {
    const ex = await prisma.examen.create({
      data: {
        nom:        'TEST NFS',
        codeAzamed: 'TEST-001',
        categorie:  'Test',
        isActive:   true,
      }
    });
    console.log('✅ Examen créé:', ex.id);
    await prisma.examen.delete({ where: { id: ex.id } });
    console.log('✅ Test nettoyé');
  } catch (e) {
    console.error('❌ Erreur création examen:');
    console.error('   Code:', e.code);
    console.error('   Message:', e.message);
    if (e.meta) console.error('   Meta:', JSON.stringify(e.meta));
  }

  // 4. Tester l'insertion d'un service
  console.log('\n🏥 Test insertion service...');
  try {
    const sv = await prisma.serviceMedical.create({
      data: {
        nom:      'TEST Consultation',
        categorie:'Test',
        isActive: true,
      }
    });
    console.log('✅ Service créé:', sv.id);
    await prisma.serviceMedical.delete({ where: { id: sv.id } });
    console.log('✅ Test nettoyé');
  } catch (e) {
    console.error('❌ Erreur création service:');
    console.error('   Code:', e.code);
    console.error('   Message:', e.message);
    if (e.meta) console.error('   Meta:', JSON.stringify(e.meta));
  }

  // 5. Afficher les champs disponibles
  console.log('\n📋 Vérification schema — champs table medicaments:');
  try {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'medicaments'
      ORDER BY ordinal_position
    `);
    cols.forEach(c => console.log(`   ${c.column_name} (${c.data_type}) nullable:${c.is_nullable}`));
  } catch(e) {
    console.error('❌ Erreur schema:', e.message);
  }
}

main()
  .catch((e) => { console.error('❌ Fatal:', e.message); })
  .finally(() => prisma.$disconnect());
