require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const [email, password, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(' ') || 'Administrator';

async function main() {
  if (!email || !password) {
    console.error('Usage: node prisma/create-admin.js <email> <password> [Full Name]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('The password must have at least 8 characters.');
    process.exit(1);
  }

  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    console.error('An account with this email already exists. Use a different email.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email: normalized,
      phone: '+998000000000', // placeholder: the phone column is required
      fullName,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log(`Admin created: ${normalized}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());