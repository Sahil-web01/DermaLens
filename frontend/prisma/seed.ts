import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SQLite database for NextAuth demo accounts...');

  const hashedPassword = await bcrypt.hash('demo123', 10);

  // 1. Patient Demo User
  const patient = await prisma.user.upsert({
    where: { email: 'patient@demo.com' },
    update: {
      password: hashedPassword,
      name: 'David Rodriguez',
      role: 'PATIENT',
    },
    create: {
      email: 'patient@demo.com',
      name: 'David Rodriguez',
      password: hashedPassword,
      role: 'PATIENT',
    },
  });

  // Create an active wound episode for the patient
  const existingEpisode = await prisma.woundEpisode.findFirst({
    where: { patientId: patient.id },
  });

  if (!existingEpisode) {
    await prisma.woundEpisode.create({
      data: {
        patientId: patient.id,
        procedureLabel: 'Open Appendectomy',
        surgeryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // 2. Clinician Demo User
  await prisma.user.upsert({
    where: { email: 'clinician@demo.com' },
    update: {
      password: hashedPassword,
      name: 'Dr. Sarah Chen, MD',
      role: 'CLINICIAN',
    },
    create: {
      email: 'clinician@demo.com',
      name: 'Dr. Sarah Chen, MD',
      password: hashedPassword,
      role: 'CLINICIAN',
    },
  });

  console.log('Seeding complete! Demo users:');
  console.log('  Patient:   patient@demo.com   / demo123');
  console.log('  Clinician: clinician@demo.com / demo123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
