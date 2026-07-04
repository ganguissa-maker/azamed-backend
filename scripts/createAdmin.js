require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [, , emailArg, passwordArg] = process.argv;

  if (!emailArg || !passwordArg) {
    console.error('Usage: node scripts/createAdmin.js <email> <password>');
    process.exit(1);
  }
  if (passwordArg.length < 8) {
    console.error('Le mot de passe doit contenir au moins 8 caracteres.');
    process.exit(1);
  }

  const email = emailArg.toLowerCase();
  const passwordHash = await bcrypt.hash(passwordArg, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN', passwordHash, isActive: true },
    });
    console.log(`Compte existant (${email}, role precedent: ${existing.role}) promu en ADMIN avec le nouveau mot de passe.`);
  } else {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        isVerified: true,
        isActive: true,
      },
    });
    console.log(`Compte ADMIN cree avec succes : ${user.email}`);
  }
}

main()
  .catch((e) => {
    console.error('Erreur:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
