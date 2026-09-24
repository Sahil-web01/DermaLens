import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

import bcrypt from 'bcryptjs';
import Patient from './src/models/Patient.js';
import CheckIn from './src/models/CheckIn.js';
import Notification from './src/models/Notification.js';
import User from './src/models/User.js';

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dermalens';

// Helper to ensure demo image files exist in uploads/
const ensureDemoImages = (uploadDir) => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 1x1 valid PNG buffer as lightweight placeholder
  const samplePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const demoFiles = [
    'demo_sarah_day1.png',
    'demo_sarah_day3.png',
    'demo_sarah_day7.png',
    'demo_david_day1.png',
    'demo_david_day3.png',
    'demo_david_day7.png',
    'demo_elena_day1.png',
    'demo_elena_day3_blurry.png',
    'demo_elena_day4_retake.png',
  ];

  for (const filename of demoFiles) {
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, samplePng);
    }
  }
};

const seedDatabase = async () => {
  try {
    const primaryUri = process.env.MONGO_URI;
    const fallbackUri = 'mongodb://127.0.0.1:27017/dermalens';
    let connected = false;

    if (primaryUri && primaryUri !== fallbackUri) {
      try {
        console.log('[Seeder] Attempting primary MongoDB URI...');
        await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 4000 });
        console.log('[Seeder] Connected to MongoDB Atlas successfully!');
        connected = true;
      } catch (e) {
        console.warn(`[Seeder Warning] Primary MongoDB failed (${e.message}). Switching to local fallback...`);
      }
    }

    if (!connected) {
      console.log('[Seeder] Connecting to local MongoDB on mongodb://127.0.0.1:27017/dermalens...');
      await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 4000 });
      console.log('[Seeder] Connected to local MongoDB successfully!');
    }

    // Ensure uploads folder and demo images exist
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
    ensureDemoImages(uploadDir);
    console.log('[Seeder] Demo images ready in:', uploadDir);

    // Clean existing data - delete all non-demo users and non-demo records
    console.log('[Seeder] Clearing previous data...');
    await CheckIn.deleteMany({});
    await Patient.deleteMany({});
    await Notification.deleteMany({});
    await User.deleteMany({ email: { $nin: ['clinician@demo.com', 'clinician2@demo.com', 'patient@demo.com'] } });

    // Demo clinician accounts (each sees only assigned patients)
    console.log('[Seeder] Creating demo clinician users...');
    const demoPasswordHash = await bcrypt.hash('demo123', 10);
    const clinicianSarah = await User.findOneAndUpdate(
      { email: 'clinician@demo.com' },
      {
        name: 'Dr. Sarah Chen, MD',
        email: 'clinician@demo.com',
        password: demoPasswordHash,
        role: 'CLINICIAN',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const clinicianJames = await User.findOneAndUpdate(
      { email: 'clinician2@demo.com' },
      {
        name: 'Dr. James Wong, MD',
        email: 'clinician2@demo.com',
        password: demoPasswordHash,
        role: 'CLINICIAN',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const now = new Date();
    const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // ========================================================
    // SCENARIO 1: Normal Recovery (Sarah Jenkins)
    // Decreasing pain, no fever, clean incision, low ML scores
    // ========================================================
    console.log('\n[Seeder] Creating Scenario 1: Normal Recovery...');
    const patient1 = await Patient.create({
      name: 'Sarah Jenkins',
      mrn: 'MRN-2026-001',
      surgeryType: 'Total Knee Arthroplasty',
      surgeryDate: daysAgo(8),
      assignedClinicianId: clinicianSarah._id,
      assignmentStatus: 'assigned',
    });

    await CheckIn.create([
      {
        patientId: patient1._id,
        photoUrl: '/uploads/demo_sarah_day1.png',
        capturedAt: daysAgo(7),
        symptoms: {
          fever: false,
          increasingPain: false,
          purulentDischarge: false,
          spreadingRedness: false,
        },
        mlOutput: {
          concernScore: 0.14,
          predictedClass: 'Low Concern',
          modelVersion: 'v1.0',
        },
        reviewStatus: 'reviewed',
        clinicianNotes: 'Day 1 Post-op: Baseline surgical incision clean, mild expected postoperative edema.',
      },
      {
        patientId: patient1._id,
        photoUrl: '/uploads/demo_sarah_day3.png',
        capturedAt: daysAgo(5),
        symptoms: {
          fever: false,
          increasingPain: false,
          purulentDischarge: false,
          spreadingRedness: false,
        },
        mlOutput: {
          concernScore: 0.08,
          predictedClass: 'Low Concern',
          modelVersion: 'v1.0',
        },
        reviewStatus: 'reviewed',
        clinicianNotes: 'Day 3 Check-in: Erythema subsiding, surgical margins approximated nicely.',
      },
      {
        patientId: patient1._id,
        photoUrl: '/uploads/demo_sarah_day7.png',
        capturedAt: daysAgo(1),
        symptoms: {
          fever: false,
          increasingPain: false,
          purulentDischarge: false,
          spreadingRedness: false,
        },
        mlOutput: {
          concernScore: 0.04,
          predictedClass: 'Low Concern',
          modelVersion: 'v1.0',
        },
        reviewStatus: 'reviewed',
        clinicianNotes: 'Day 7 Follow-up: Incision fully granulating with no discharge. Approved for outpatient staple removal.',
      },
    ]);

    // ========================================================
    // SCENARIO 2: High-Risk Infection Escalation (David Rodriguez)
    // Day 1 normal -> Day 3 spreading redness -> Day 7 fever,
    // purulent discharge, 89% AI concern score (Priority #1 Queue)
    // ========================================================
    console.log('[Seeder] Creating Scenario 2: High-Risk Infection Escalation...');
    const patient2 = await Patient.create({
      name: 'David Rodriguez',
      email: 'patient@demo.com',
      mrn: 'MRN-2026-002',
      surgeryType: 'Open Appendectomy',
      surgeryDate: daysAgo(7),
      assignedClinicianId: clinicianSarah._id,
      assignmentStatus: 'assigned',
    });

    await CheckIn.create([
      {
        patientId: patient2._id,
        photoUrl: '/uploads/demo_david_day1.png',
        capturedAt: daysAgo(6),
        symptoms: {
          fever: false,
          increasingPain: false,
          purulentDischarge: false,
          spreadingRedness: false,
        },
        mlOutput: {
          concernScore: 0.22,
          predictedClass: 'Low Concern',
          modelVersion: 'v1.0',
        },
        reviewStatus: 'reviewed',
        clinicianNotes: 'Day 1 Post-op: Normal baseline, wound dry and intact.',
      },
      {
        patientId: patient2._id,
        photoUrl: '/uploads/demo_david_day3.png',
        capturedAt: daysAgo(4),
        symptoms: {
          fever: false,
          increasingPain: true,
          purulentDischarge: false,
          spreadingRedness: true,
        },
        mlOutput: {
          concernScore: 0.62,
          predictedClass: 'Elevated Concern',
          modelVersion: 'v1.0',
        },
        reviewStatus: 'reviewed',
        clinicianNotes: 'Day 3 Check-in: Advised patient to outline erythema with pen and check temperature twice daily.',
      },
      {
        patientId: patient2._id,
        photoUrl: '/uploads/demo_david_day7.png',
        capturedAt: new Date(), // Just submitted today!
        symptoms: {
          fever: true,
          increasingPain: true,
          purulentDischarge: true,
          spreadingRedness: true,
        },
        mlOutput: {
          concernScore: 0.89,
          predictedClass: 'Elevated Concern',
          modelVersion: 'v1.0',
        },
        reviewStatus: 'pending', // PENDING HIGH-RISK IN CLINICIAN QUEUE!
        clinicianNotes: 'CRITICAL ALERT: Patient reports 38.9°C fever and cloudy discharge. CNN concern score 89%. Priority triage needed.',
      },
    ]);

    // ========================================================
    // SCENARIO 3: Unreadable Photo Retake (Elena Rostova)
    // Day 1 clean -> Day 3 blurry photo (retake requested)
    // -> Day 4 clear retake submitted
    // ========================================================
    console.log('[Seeder] Creating Scenario 3: Unreadable Photo Retake...');
    const patient3 = await Patient.create({
      name: 'Elena Rostova',
      mrn: 'MRN-2026-003',
      surgeryType: 'Cesarean Delivery',
      surgeryDate: daysAgo(5),
      assignedClinicianId: clinicianJames._id,
      assignmentStatus: 'assigned',
    });

    await CheckIn.create([
      {
        patientId: patient3._id,
        photoUrl: '/uploads/demo_elena_day1.png',
        capturedAt: daysAgo(4),
        symptoms: {
          fever: false,
          increasingPain: false,
          purulentDischarge: false,
          spreadingRedness: false,
        },
        mlOutput: {
          concernScore: 0.18,
          predictedClass: 'Low Concern',
          modelVersion: 'v1.0',
        },
        reviewStatus: 'reviewed',
        clinicianNotes: 'Day 1 Post-op: Pfannenstiel incision well approximated without signs of complication.',
      },
      {
        patientId: patient3._id,
        photoUrl: '/uploads/demo_elena_day3_blurry.png',
        capturedAt: daysAgo(2),
        symptoms: {
          fever: false,
          increasingPain: false,
          purulentDischarge: false,
          spreadingRedness: false,
        },
        mlOutput: {
          concernScore: null,
          predictedClass: 'Unreadable',
          modelVersion: 'v1.0',
        },
        reviewStatus: 'retake_requested',
        clinicianNotes: 'RETAKE REQUESTED: Photo is out of focus and has strong shadow over the left margin. Please upload a clear photo taken in direct daylight.',
      },
      {
        patientId: patient3._id,
        photoUrl: '/uploads/demo_elena_day4_retake.png',
        capturedAt: daysAgo(1),
        symptoms: {
          fever: false,
          increasingPain: false,
          purulentDischarge: false,
          spreadingRedness: false,
        },
        mlOutput: {
          concernScore: 0.28,
          predictedClass: 'Low Concern',
          modelVersion: 'v1.0',
        },
        reviewStatus: 'pending', // PENDING in clinician queue
        clinicianNotes: 'Retake photo received with direct lighting. Wound margins visible.',
      },
    ]);

    // ========================================================
    // NOTIFICATIONS SEEDING
    // ========================================================
    console.log('[Seeder] Creating Demo Notifications for Badging...');
    await Notification.deleteMany({});
    await Notification.create([
      {
        recipientRole: 'CLINICIAN',
        patientId: patient2._id,
        title: 'CRITICAL TRIAGE: David Rodriguez',
        message: 'Patient reports 38.9°C fever and cloudy discharge with 89% AI concern score.',
        type: 'HIGH_RISK_CHECKIN',
        read: false,
      },
      {
        recipientRole: 'CLINICIAN',
        patientId: patient3._id,
        title: 'Retake Photo Submitted: Elena Rostova',
        message: 'Day 4 retake photo submitted with direct daylight illumination. Awaiting triage.',
        type: 'INFO',
        read: false,
      },
      {
        recipientRole: 'PATIENT',
        patientId: patient1._id,
        title: 'Clinical Review Approved',
        message: 'Dr. Sarah Chen: Incision clean and approximated. Approved for outpatient staple removal.',
        type: 'CLINICAL_REVIEW',
        read: false,
      },
    ]);

    console.log('\n======================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('   - 2 Clinicians: clinician@demo.com (Sarah+David), clinician2@demo.com (Elena)');
    console.log('   - 3 Patients Created with clinician assignments');
    console.log('   - 9 Check-In Records Seeded');
    console.log('   - 3 Demo Notifications Seeded (Unread Badging active)');
    console.log('   - Demo placeholder photos generated in uploads/');
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
