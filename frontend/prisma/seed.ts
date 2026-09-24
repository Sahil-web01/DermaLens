import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SQLite database for NextAuth demo accounts...');

  const demoEmails = ['patient@demo.com', 'clinician@demo.com', 'clinician2@demo.com'];

  // Purge all non-demo data
  await prisma.notification.deleteMany({});
  await prisma.clinicianReview.deleteMany({});
  await prisma.checkIn.deleteMany({});
  await prisma.woundEpisode.deleteMany({});
  await prisma.user.deleteMany({
    where: { email: { notIn: demoEmails } }
  });

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

  // Create or retrieve active wound episode for the patient
  let episode = await prisma.woundEpisode.findFirst({
    where: { patientId: patient.id },
  });

  if (!episode) {
    episode = await prisma.woundEpisode.create({
      data: {
        patientId: patient.id,
        procedureLabel: 'Open Appendectomy',
        surgeryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Clear previous check-ins for demo patient to ensure clean idempotent seed
  await prisma.checkIn.deleteMany({
    where: { woundEpisodeId: episode.id },
  });


  // 2. Clinician Demo Users
  const clinicianSarah = await prisma.user.upsert({
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

  const clinicianJames = await prisma.user.upsert({
    where: { email: 'clinician2@demo.com' },
    update: {
      password: hashedPassword,
      name: 'Dr. James Wong, MD',
      role: 'CLINICIAN',
    },
    create: {
      email: 'clinician2@demo.com',
      name: 'Dr. James Wong, MD',
      password: hashedPassword,
      role: 'CLINICIAN',
    },
  });

  // Assign demo patient David Rodriguez to Dr. Sarah Chen only
  await prisma.user.update({
    where: { id: patient.id },
    data: { assignedClinicianId: clinicianSarah.id },
  });

  // 3. Create Demo Check-Ins for David Rodriguez
  const checkIn1 = await prisma.checkIn.create({
    data: {
      woundEpisodeId: episode.id,
      capturedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      imageUrl: '/uploads/demo_david_day1.png',
      imageQualityStatus: 'GOOD',
      painScore: 2,
      redness: false,
      swelling: false,
      drainage: false,
      fever: false,
      notes: 'Day 1: Incision feels slightly tender but clean. Dressing changed as directed.',
      aiConcernLevel: 'Low Concern',
      aiScore: 0.22,
      modelVersion: 'MobileNetV2-Wound-v1.0',
      status: 'REVIEWED',
    },
  });

  await prisma.clinicianReview.create({
    data: {
      checkInId: checkIn1.id,
      clinicianId: clinicianSarah.id,
      note: 'Surgical incision clean and approximating well. Normal early recovery. Continue dressing protocol.',
      action: 'ROUTINE_FOLLOW_UP',
      reviewedAt: new Date(Date.now() - 5.8 * 24 * 60 * 60 * 1000),
    },
  });

  const checkIn2 = await prisma.checkIn.create({
    data: {
      woundEpisodeId: episode.id,
      capturedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      imageUrl: '/uploads/demo_david_day3.png',
      imageQualityStatus: 'GOOD',
      painScore: 5,
      redness: true,
      swelling: true,
      drainage: false,
      fever: false,
      notes: 'Day 3: Noticed slight red border around lower edge. Throbbing sensation when walking.',
      aiConcernLevel: 'Elevated Concern',
      aiScore: 0.62,
      modelVersion: 'MobileNetV2-Wound-v1.0',
      status: 'REVIEWED',
    },
  });

  await prisma.clinicianReview.create({
    data: {
      checkInId: checkIn2.id,
      clinicianId: clinicianSarah.id,
      note: 'Mild perimeter erythema and increasing tenderness. Prescribed preventative oral cephalexin 500mg. Review again in 48 hours.',
      action: 'PRESCRIBED_MEDICATION',
      reviewedAt: new Date(Date.now() - 3.8 * 24 * 60 * 60 * 1000),
    },
  });

  const checkIn3 = await prisma.checkIn.create({
    data: {
      woundEpisodeId: episode.id,
      capturedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      imageUrl: '/uploads/demo_david_day7.png',
      imageQualityStatus: 'GOOD',
      painScore: 8,
      redness: true,
      swelling: true,
      drainage: true,
      fever: true,
      temperature: 38.6,
      notes: 'Day 7: Pain increased overnight. Yellowish discharge on gauze. Low-grade fever 38.6 C.',
      aiConcernLevel: 'Elevated Concern',
      aiScore: 0.89,
      modelVersion: 'MobileNetV2-Wound-v1.0',
      status: 'FLAGGED',
    },
  });

  await prisma.clinicianReview.create({
    data: {
      checkInId: checkIn3.id,
      clinicianId: clinicianSarah.id,
      note: 'Severe erythema, purulent discharge, and temperature spike to 38.6°C. High infection risk. Escalated for immediate in-person clinic examination today.',
      action: 'ESCALATED_TO_CLINIC',
      reviewedAt: new Date(Date.now() - 0.8 * 24 * 60 * 60 * 1000),
    },
  });

  // Clean and add notifications
  await prisma.notification.deleteMany({ where: { userId: patient.id } });
  await prisma.notification.createMany({
    data: [
      {
        userId: patient.id,
        type: 'REVIEW_COMPLETED',
        title: 'Doctor Reviewed Day 7 Check-In',
        message: 'Dr. Sarah Chen, MD has reviewed your latest photo and recommended an urgent clinic visit.',
        relatedEntityType: 'CHECK_IN',
        relatedEntityId: checkIn3.id,
      },
      {
        userId: patient.id,
        type: 'CARE_TEAM_ASSIGNED',
        title: 'Physician Connected',
        message: 'Dr. Sarah Chen, MD is actively monitoring your postoperative wound recovery.',
        relatedEntityType: 'CLINICIAN',
        relatedEntityId: clinicianSarah.id,
      },
    ],
  });


  console.log('Seeding complete! Demo users:');
  console.log('  Patient:    patient@demo.com    / demo123  → Dr. Sarah Chen');
  console.log('  Clinician:  clinician@demo.com  / demo123  → Sarah Jenkins + David Rodriguez');
  console.log('  Clinician:  clinician2@demo.com / demo123  → Elena Rostova (Mongo seed)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
