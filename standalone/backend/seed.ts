import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      resolve(salt + ':' + derived.toString('hex'));
    });
  });
}

function createId(prefix: string): string {
  return prefix + crypto.randomBytes(8).toString('hex');
}

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const passwordHash = await hashPassword('admin123');
  const admin = await prisma.labUser.upsert({
    where: { email: 'admin@labor.hu' },
    update: {},
    create: {
      userId: createId('LU'),
      email: 'admin@labor.hu',
      fullName: 'Admin Felhasználó',
      passwordHash,
      role: 'admin',
    },
  });
  console.log(`Admin user: ${admin.email}`);

  // Create sample doctor partners
  const doctors = [
    { doctorName: 'Dr. Kovács János', clinicName: 'Kovács Fogászat', phone: '+36 30 123 4567', email: 'kovacs@fogaszat.hu', address: '1052 Budapest, Váci u. 10.' },
    { doctorName: 'Dr. Nagy Éva', clinicName: 'Nagy Dental Kft.', phone: '+36 20 234 5678', email: 'nagy@dental.hu', address: '2000 Szentendre, Fő tér 5.' },
    { doctorName: 'Dr. Szabó Péter', clinicName: 'Szabó és Társa Klinika', phone: '+36 70 345 6789', email: 'szabo@klinika.hu', address: '1134 Budapest, Lehel u. 22.' },
  ];

  for (const doc of doctors) {
    await prisma.doctorPartner.upsert({
      where: { doctorPartnerId: createId('DP') },
      update: {},
      create: {
        doctorPartnerId: createId('DP'),
        ...doc,
      },
    });
  }
  console.log(`Created ${doctors.length} doctor partners`);

  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
