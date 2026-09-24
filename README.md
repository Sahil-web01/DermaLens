# DermaLens AI 🩺🔍
### Remote Surgical Wound Surveillance & Clinical Triage Decision Support
> *A clearer recovery trajectory. A better-informed clinical review.*

[![Next.js 14](https://img.shields.io/badge/Frontend-Next.js%2014%20(App%20Router)-black?logo=next.js)](https://nextjs.org/)
[![Node.js & Express](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express-green?logo=node.js)](https://nodejs.org/)
[![Python & FastAPI](https://img.shields.io/badge/ML%20Service-FastAPI%20%2F%20Uvicorn-teal?logo=fastapi)](https://fastapi.tiangolo.com/)
[![TensorFlow / Keras](https://img.shields.io/badge/AI%20Model-MobileNetV2%20CNN-orange?logo=tensorflow)](https://www.tensorflow.org/)
[![MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB%20Atlas-darkgreen?logo=mongodb)](https://www.mongodb.com/atlas)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Hackathon](https://img.shields.io/badge/Global%20Innovation-Hackathon%202026-blue.svg)](https://github.com/Sahil-web01/DermaLens)

---

## 📑 Table of Contents
1. [Overview & Problem Statement](#-01-overview--problem-statement)
2. [Key Capabilities & Features](#-02-key-capabilities--features)
3. [Live Demo Credentials & Scenarios](#-03-live-demo-credentials--scenarios)
4. [System Architecture](#-04-system-architecture)
5. [Technology Stack](#-05-technology-stack)
6. [AI / ML Inference & SurgWound Model](#-06-ai--ml-inference--surgwound-model)
7. [Repository Directory Structure](#-07-repository-directory-structure)
8. [Getting Started & Local Setup](#-08-getting-started--local-setup)
9. [Environment Configuration](#-09-environment-configuration)
10. [REST API Reference](#-10-rest-api-reference)
11. [Clinical Safety & Ethical Boundaries](#-11-clinical-safety--ethical-boundaries)
12. [Team & Hackathon Details](#-12-team--hackathon-details)

---

## 📌 01. Overview & Problem Statement

Surgical site infections (SSIs) are among the most common healthcare-associated complications, often emerging several days after hospital discharge. Patients and their caregivers frequently struggle to detect early warning signs and communicate subtle wound changes between scheduled follow-up visits.

### The Clinical Communication Gap:
- **Isolated Snapshots:** An ad-hoc smartphone photo sent through email or messaging lacks previous wound context, standardized lighting, and angle consistency.
- **Missing Symptom Context:** A photograph alone cannot detect systemic infection; reported fever, purulent discharge, and spreading margins are critical co-factors.
- **Delayed Intervention:** Mild localized complications can rapidly progress to severe deep-tissue infections without structured surveillance.

**DermaLens AI** bridges this gap by providing an end-to-end clinical workflow connecting patient home check-ins directly to a prioritized surgical review dashboard.

---

## 💡 02. Key Capabilities & Features

### 📸 1. Guided Patient Check-Ins
- **Standardized Framing:** Ghosted previous-photo overlay ensures consistent camera angle, lighting, and focal distance across recovery days.
- **Symptom Screening:** Mandatory screening for fever ($>38.0^\circ\text{C}$), spreading redness, purulent (cloudy) discharge, and escalating pain.
- **Instant Client Feedback:** Automatic quality validation and immediate escalation instructions if severe symptoms are reported.

### 🧠 2. MobileNetV2 AI Concern Assessment
- **Dual Inference Engine:** Evaluates wound photos using a fine-tuned MobileNetV2 CNN trained on the expert-annotated **SurgWound** dataset.
- **Quality & Artifact Auditing:** Verifies image illumination, resolution, and sharpness before scoring.
- **Transparent Output:** Generates calibrated concern probabilities and classification labels (*Routine* vs. *Elevated Concern*) without opaque "black box" claims.

### ⚡ 3. Prioritized Clinician Triage Queue
- **Intelligent Risk Stratification:** High-risk cases (fever, purulence, or CNN concern $\ge 50\%$) are dynamically flagged and sorted to the top of the queue.
- **Clinical Review Actions:** Physicians can transition case status with single clicks:
  - `reviewed`: Routine healing within parameters.
  - `escalated`: High priority; directs patient to ER or immediate clinic visit.
  - `retake_requested`: Triggers a retake request due to blurry photo or inadequate lighting.
  - `manual_review_required`: Flags case for senior surgeon or specialist consult.
- **Follow-Up Documentation:** Doctors input structured clinical notes and instructions that sync back to the patient.

### ⏱️ 4. Interactive Wound Trajectory Scrubber
- **Chronological Slider:** Allows clinicians and patients to scrub through healing days (Day 1 $\to$ Day 3 $\to$ Day 7 $\to$ Day 14).
- **Side-by-Side Comparison:** Compares baseline discharge images with current status to assess wound margin approximation and erythema spread.

### 🔔 5. Real-Time Notification Badging
- **Unread Badge Counter:** Header bell icon with real-time polling (15s interval) and animated pulse badge (`bg-rose-600`) displaying unread alert counts.
- **Interactive Alert Dropdown:** Color-coded severity tags (`HIGH_RISK_CHECKIN`, `CLINICAL_REVIEW`, `PHOTO_RETAKE`, `INFO`).
- **Instant Read Receipts:** Mark individual items as read or clear all alerts with a single click synced to MongoDB.

### 📄 6. Hospital-Grade Clinical PDF Report Export
- **One-Click Clinical Summary:** Accessible from the triage queue, cohort list, or patient recovery timeline.
- **Official Medical Formatting:** Includes hospital header, MRN, procedure type, surgery date, post-op day counter, and AI risk callout.
- **Chronological Photo Table:** Complete photo trajectory with symptom tags and MobileNetV2 concern scores.
- **Physician Sign-Off Block:** Doctor signature line, medical license number, and clinical sign-off date.
- **Print & JSON Export:**
  - `Print / Save PDF`: Scoped print media CSS suppresses browser chrome for a clean paper/PDF report.
  - `Export JSON`: Structured trajectory data export for electronic health record (EHR) integration.

### 🛡️ 7. Physician-Patient Cohort Isolation & Patient-Doctor Mutual Consent
- **Strict Clinical Confidentiality:** Each attending surgeon or nurse only has access to their assigned patients. Doctors cannot access or inspect symptoms or wound photography of patients under another physician's care.
- **Patient Autonomy & Right to Choose:** Patients have the clear right to choose their preferred attending surgeon from the verified hospital directory or change their doctor at any time.
- **Two-Way Mutual Consent Model:**
  - **Doctor-Initiated Care Offer:** When an attending surgeon offers care to an unassigned patient (`POST /api/patients/:id/claim`), the patient is **never trapped or forced**. The patient receives an offer card with the right to **[Accept & Consent]** or **[Decline & Choose Another Doctor]**.
  - **Patient-Initiated Choice Request:** A patient can select any surgeon (e.g. Dr. Sarah Chen or Dr. James Wong) via `POST /api/patients/:id/request-doctor`. The chosen surgeon receives an intake request and must grant clinical consent (`POST /api/patients/:id/doctor-consent`) before the patient is assigned.
  - **Patient Right to Change Doctor:** Patients can release or transfer their doctor assignment at any time from their recovery dashboard.
- **Unauthorized Guarding:** Direct URL attempts by unauthorized clinicians return `403 Forbidden` and render a dedicated **Clinical Access Restricted** safety screen.

### 🔒 8. Role-Based Access Control (RBAC) & Edge Route Protection
- **Edge Middleware Protection ([middleware.ts](frontend/src/middleware.ts)):** Prevents unauthorized route navigation.
- **Role Isolation:** Patients cannot view clinician review queues; clinicians are directed to surgical triage dashboards while maintaining access to patient trajectory scrubbers.
- **Encrypted Authentication:** Bcrypt password hashing, session tokens, and sanitized user data.

---

## 🔑 03. Live Demo Credentials & Scenarios

The codebase includes an automated seeder (`npm run seed` in `backend/`) that populates MongoDB Atlas with realistic post-op recovery scenarios and isolated doctor cohorts.

### Demo User Accounts:
| Role | Clinician / Patient Name | Email | Password | Assigned Cohort / Destination |
| :--- | :--- | :--- | :--- | :--- |
| **Attending Clinician 1** | **Dr. Sarah Chen, MD** | `clinician@demo.com` | `clinician123` | Assigned: **David Rodriguez**, **Sarah Jenkins** |
| **Attending Clinician 2** | **Dr. James Wong, MD** | `clinician2@demo.com` | `clinician123` | Assigned: **Elena Rostova** |
| **Enrolled Patient** | **David Rodriguez** | `patient@demo.com` | `demo123` | `/patient` (Patient Portal & Timeline) |
| **Registered Patient** | **Sahil** | `sahildh@gmail.com` | *(Registered)* | Unassigned Intake (Available for doctor claiming) |

### Pre-Seeded Clinical Scenarios:
1. **Scenario 1 — Normal Recovery (Sarah Jenkins, MRN-2026-001):**
   - *Attending Doctor:* Dr. Sarah Chen, MD
   - *Procedure:* Total Knee Arthroplasty
   - *Trajectory:* Days 1, 3, and 7 showing clean wound closure, pain dropping from 4/10 to 1/10, low AI concern, all triaged as `reviewed`.
2. **Scenario 2 — High-Risk Escalation (David Rodriguez, MRN-2026-002):**
   - *Attending Doctor:* Dr. Sarah Chen, MD
   - *Procedure:* Open Appendectomy
   - *Trajectory:* Day 1 baseline $\to$ Day 3 spreading erythema $\to$ Day 7 acute fever ($38.9^\circ\text{C}$), cloudy purulent discharge, and elevated AI concern score (74%).
   - *Status:* Automatically ranked **#1** in Dr. Chen's triage queue as a critical high-risk alert.
3. **Scenario 3 — Photo Retake Request (Elena Rostova, MRN-2026-003):**
   - *Attending Doctor:* Dr. James Wong, MD
   - *Procedure:* Cesarean Delivery
   - *Trajectory:* Day 1 baseline $\to$ Day 3 blurry photo flagged as `retake_requested` $\to$ Day 4 daylight retake submitted and awaiting review.
   - *Status:* Visible **only** in Dr. James Wong's dashboard and patient cohort. Dr. Chen cannot view Elena's symptoms.

---

## 🏗️ 04. System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Port 3000)"]
        PatientUI["Patient Portal\n(Photo Capture, Timeline, Symptoms)"]
        ClinicianUI["Clinician Dashboard\n(Triage Queue, Review Modal, PDF Export)"]
        Header["Header Component\n(Notification Bell & Pulse Badge)"]
    end

    subgraph AppServer ["Application Backend (Port 5000)"]
        Express["Express.js Server"]
        AuthMiddleware["JWT & RBAC Middleware"]
        PatientCtrl["Patient & Check-In Controller"]
        ClinicianCtrl["Triage & Review Controller"]
        NotifCtrl["Notification Badging Controller"]
        Uploads["Multer Protected Uploads (/uploads)"]
    end

    subgraph DatabaseTier ["Database Tier"]
        MongoAtlas[("MongoDB Atlas Cloud Database\n(Users, Patients, CheckIns, Notifications)")]
    end

    subgraph MLTier ["AI / ML Microservice (Port 8000)"]
        FastAPI["FastAPI Inference Server"]
        Preprocess["Image Preprocessor (224x224 RGB)"]
        MobileNet["MobileNetV2 CNN (SurgWound Fine-Tuned)"]
    end

    PatientUI -->|Multipart Upload + Symptoms| Express
    ClinicianUI -->|Triage Actions & Review Notes| Express
    Header -->|Polling (15s)| NotifCtrl

    Express --> AuthMiddleware
    AuthMiddleware --> PatientCtrl
    AuthMiddleware --> ClinicianCtrl
    AuthMiddleware --> NotifCtrl

    PatientCtrl -->|Save Check-In & Photo| Uploads
    PatientCtrl -->|Forward Image Buffer| FastAPI
    FastAPI --> Preprocess --> MobileNet
    MobileNet -->|Concern Score & Class| FastAPI
    FastAPI -->|JSON Inference Output| PatientCtrl

    PatientCtrl -->|High-Risk Auto-Alert| NotifCtrl
    ClinicianCtrl -->|Review Status Change Alert| NotifCtrl

    PatientCtrl <--> MongoAtlas
    ClinicianCtrl <--> MongoAtlas
    NotifCtrl <--> MongoAtlas
```

---

## 💻 05. Technology Stack

| Tier | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14** (App Router), React 18, TypeScript | High-performance server/client rendered UI with fast routing. |
| **Styling** | **Tailwind CSS**, Lucide React, Glassmorphism UI | Responsive clinical design system with dark/light theme support. |
| **Authentication** | **NextAuth.js** & Custom JWT Credentials | Role-isolated sessions (`PATIENT` vs `CLINICIAN`) with edge middleware guards. |
| **Backend API** | **Node.js** & **Express.js** (ES Modules) | RESTful API orchestration, request validation, and upload streaming. |
| **Database** | **MongoDB Atlas** with **Mongoose ODM** | Scalable document storage for users, patients, check-ins, and notifications. |
| **Image Storage** | **Multer** Local / Cloud Protected Storage | Secure storage for multi-angle wound photographs. |
| **ML Microservice** | **Python 3.10+**, **FastAPI**, **Uvicorn** | Asynchronous model serving microservice. |
| **Deep Learning** | **TensorFlow 2.x / Keras**, **MobileNetV2** | Lightweight, high-accuracy CNN architecture fine-tuned on surgical wounds. |
| **Image Pipeline** | **Pillow (PIL)**, **NumPy** | Standardized 224x224 RGB resizing, normalization, and quality validation. |

---

## 🔬 06. AI / ML Inference & SurgWound Model

- **Dataset:** [SurgWound Dataset](https://huggingface.co/datasets) (686 surgical wound images annotated across 8 clinical attributes, CC BY-SA 4.0).
- **Task Formulation:** Binary classification scoring lower concern vs. elevated concern.
- **Model Pipeline ([ml/model.py](ml/model.py)):**
  - Input: $224 \times 224 \times 3$ RGB image.
  - Base: Pre-trained `MobileNetV2` feature extractor (frozen during stage 1, fine-tuned in stage 2).
  - Classification Head: GlobalAveragePooling2D $\to$ Dense(128, ReLU) $\to$ Dropout(0.3) $\to$ Dense(1, Sigmoid).
- **Image Preprocessing ([ml/preprocess.py](ml/preprocess.py)):**
  - Aspect-ratio preserving crop and resize to $224 \times 224$.
  - Scaling pixels to $[-1, 1]$ interval via `mobilenet_v2.preprocess_input`.
  - Blur detection (Laplacian variance) and illumination threshold check.
- **Inference Service ([ml/main.py](ml/main.py)):**
  - Serves `GET /health` and `POST /predict`.
  - Fallback logic: If the ML service is unreachable, the backend marks the check-in as `manual_review_required` without dropping the patient's data.

---

## 📂 07. Repository Directory Structure

```text
DermaLens/
├── backend/                              # Node.js + Express API Backend (Port 5000)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                     # MongoDB Atlas Mongoose connection
│   │   ├── controllers/
│   │   │   ├── authController.js         # User registration, login, and profile
│   │   │   ├── checkinController.js      # Check-in review & triage status updates
│   │   │   ├── clinicianController.js    # Triage queue ranking & clinical stats (isolated by doctor)
│   │   │   ├── episodeController.js      # Wound episode management
│   │   │   ├── notificationController.js # Real-time notification badging & reads
│   │   │   ├── patientController.js      # Patient creation, cohort listing, claiming, & timeline
│   │   │   └── reviewController.js       # Review notes controller
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js         # JWT verification & role authorization
│   │   │   └── uploadMiddleware.js       # Multer image storage & type filtering
│   │   ├── models/
│   │   │   ├── CheckIn.js                # Check-in schema with ML outputs & symptoms
│   │   │   ├── Episode.js                # Surgical episode schema
│   │   │   ├── Notification.js           # Notification alerts schema
│   │   │   ├── Patient.js                # Patient demographics, MRN, & assignedClinicianId
│   │   │   └── User.js                   # Clinician & Patient authentication schema
│   │   ├── routes/
│   │   │   ├── authRoutes.js             # /api/auth routes
│   │   │   ├── checkinRoutes.js          # /api/checkins routes
│   │   │   ├── clinicianRoutes.js        # /api/clinician routes
│   │   │   ├── episodeRoutes.js          # /api/episodes routes
│   │   │   ├── notificationRoutes.js     # /api/notifications routes
│   │   │   └── patientRoutes.js          # /api/patients routes (cohort, claim, delete)
│   │   ├── services/
│   │   │   └── mlClient.js               # Axios client forwarding photos to FastAPI
│   │   ├── utils/
│   │   │   └── clinicianPatientAccess.js # Physician-patient authorization & resolution
│   │   └── app.js                        # Express application configuration & CORS
│   ├── uploads/                          # Stored wound photos (.gitignore tracked)
│   ├── .env.example                      # Backend environment variable template
│   ├── package.json                      # Backend dependencies & scripts
│   ├── seed.js                           # 3-scenario demo database seeder
│   └── server.js                         # Backend entry point
│
├── frontend/                             # Next.js 14 Client Application (Port 3000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── auth/register/        # Secure Next.js registration & MongoDB sync
│   │   │   │   └── clinical/report/      # Official clinical PDF report generator
│   │   │   ├── clinician/
│   │   │   │   ├── page.tsx              # Clinician prioritized triage queue (isolated by doctor)
│   │   │   │   └── patients/page.tsx     # Doctor care cohort & unassigned intake claiming
│   │   │   ├── patient/
│   │   │   │   ├── check-in/page.tsx     # Guided photo capture & symptom check-in
│   │   │   │   ├── timeline/page.tsx     # Wound trajectory scrubber with 403 isolation
│   │   │   │   └── page.tsx              # Patient home dashboard
│   │   │   ├── login/page.tsx            # Unified login with demo credentials
│   │   │   ├── signup/page.tsx           # Registration portal (Patient / Clinician)
│   │   │   ├── settings/page.tsx         # User profile, credentials & preferences
│   │   │   ├── globals.css               # Design system, tokens, and animations
│   │   │   ├── layout.tsx                # Root layout with Providers & Toast
│   │   │   ├── page.tsx                  # Public landing & feature showcase
│   │   │   └── providers.tsx             # NextAuth session & UI providers
│   │   ├── components/
│   │   │   ├── clinical/
│   │   │   │   └── clinical-report-modal.tsx # Hospital-grade PDF report & JSON export
│   │   │   ├── layout/
│   │   │   │   ├── dashboard-layout.tsx  # Responsive dashboard wrapper with sidebar
│   │   │   │   ├── header.tsx            # Global header with NotificationBell
│   │   │   │   └── sidebar.tsx           # Role-aware navigation sidebar
│   │   │   ├── notifications/
│   │   │   │   └── notification-bell.tsx # Unread badge counter & alerts dropdown
│   │   │   └── ui/                       # Accessible UI components (Card, Button, Dialog)
│   │   ├── lib/
│   │   │   ├── auth.ts                   # NextAuth credentials provider configuration
│   │   │   ├── backendSession.ts         # Cross-tier Express JWT token & clinician sync
│   │   │   └── utils.ts                  # Class merger and date formatters
│   │   └── middleware.ts                 # Edge route protection & RBAC redirector
│   ├── .env.example                      # Frontend environment variable template
│   ├── next.config.js                    # Next.js configuration & image domains
│   ├── package.json                      # Frontend dependencies
│   ├── tailwind.config.ts                # Tailwind CSS configuration
│   └── tsconfig.json                     # TypeScript strict configuration
│
├── ml/                                   # Python / FastAPI Inference Service (Port 8000)
│   ├── config.py                         # Hyperparameters, model paths, & server config
│   ├── dataset.py                        # SurgWound dataset loader and splitting
│   ├── evaluate.py                       # Precision, Recall, PR-AUC, Confusion Matrix
│   ├── main.py                           # FastAPI inference microservice
│   ├── model.py                          # MobileNetV2 architecture definition
│   ├── preprocess.py                     # Image preprocessing & quality checks
│   ├── train.py                          # Transfer learning & fine-tuning script
│   ├── .env.example                      # ML environment variable template
│   └── requirements.txt                  # Python dependencies (TensorFlow, FastAPI, etc.)
│
├── .gitignore                            # Version control exclusion rules
└── README.md                             # Comprehensive project documentation
```

---

## 🚀 08. Getting Started & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **MongoDB**: MongoDB Atlas connection string (or local MongoDB running on `mongodb://127.0.0.1:27017/dermalens`)

---

### Step 1: Start the ML Inference Microservice (Port 8000)
```bash
cd ml

# 1. Create and activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS / Linux:
source venv/bin/activate

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Start the FastAPI service
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*The ML service is now live at `http://127.0.0.1:8000`. You can inspect the OpenAPI documentation at `http://127.0.0.1:8000/docs`.*

---

### Step 2: Start the Express Backend & Seed Database (Port 5000)
```bash
cd backend

# 1. Install Node dependencies
npm install

# 2. Configure environment variables
# Copy .env.example to .env and provide your MONGO_URI
cp .env.example .env

# 3. Seed the database with demo clinical scenarios
npm run seed

# 4. Start the backend server in development mode
npm run dev
```
*The API server will connect to MongoDB and start on `http://localhost:5000`.*

---

### Step 3: Start the Next.js Frontend Client (Port 3000)
```bash
cd frontend

# 1. Install Node dependencies
npm install

# 2. Configure environment variables
# Copy .env.example to .env.local
cp .env.example .env.local

# 3. Start the Next.js development server
npm run dev
```
*The application is now accessible at **`http://localhost:3000`**.*

---

## ⚙️ 09. Environment Configuration

### Backend (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/dermalens?retryWrites=true&w=majority
CORS_ORIGIN=http://localhost:3000
UPLOAD_DIR=uploads
ML_SERVICE_URL=http://127.0.0.1:8000
JWT_SECRET=your_super_secret_jwt_key_here
```

### Frontend (`frontend/.env.local`):
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="DermaLens AI"
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
AUTH_SECRET="dermalens-local-development-secret-32-chars-key"
NEXTAUTH_URL="http://localhost:3000"
```

### ML Service (`ml/.env`):
```env
ML_PORT=8000
ML_HOST=127.0.0.1
DEBUG=True
```

---

## 📡 10. REST API Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user (`PATIENT` or `CLINICIAN`) | No |
| `POST` | `/api/auth/login` | Authenticate user and issue JWT token | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes (Bearer Token) |

### 🩺 Clinician Triage (`/api/clinician`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/clinician/queue` | Prioritized triage queue scoped to acting doctor's assigned patients | Yes (`X-Clinician-Email` or Bearer) |
| `GET` | `/api/clinician/stats` | Triage statistics scoped to acting doctor's cohort | Yes (`X-Clinician-Email` or Bearer) |

### 📝 Patient Check-Ins & Cohort Management (`/api/checkins` & `/api/patients`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/patients/clinicians` | Fetch directory of verified hospital surgeons, specialties, and active caseloads | No / Authenticated |
| `GET` | `/api/patients?scope=assigned` | List patients assigned to acting clinician's cohort with mutual consent | Yes (`X-Clinician-Email` or Bearer) |
| `GET` | `/api/patients?scope=incoming_requests` | List patient care requests awaiting acting clinician's consent | Yes (`X-Clinician-Email` or Bearer) |
| `GET` | `/api/patients?scope=unassigned` | List unassigned intake patients awaiting physician assignment | Yes (`X-Clinician-Email` or Bearer) |
| `POST` | `/api/patients/:id/claim` | Clinician offers care to an unassigned patient (sets `pending_patient_consent`) | Yes (Clinician) |
| `POST` | `/api/patients/:id/cancel-offer` | Clinician cancels/withdraws their pending care offer | Yes (Clinician) |
| `POST` | `/api/patients/:id/patient-consent` | Patient accepts or declines doctor's care offer (`action: 'accept' \| 'decline'`) | Yes (Patient) |
| `POST` | `/api/patients/:id/request-doctor` | Patient chooses preferred doctor with doctor consent (`{ clinicianId }`) | Yes (Patient) |
| `POST` | `/api/patients/:id/doctor-consent` | Doctor grants or declines consent for patient request (`action: 'accept' \| 'decline'`) | Yes (Clinician) |
| `POST` | `/api/patients/:id/release-doctor` | Patient releases current doctor assignment to choose a different surgeon | Yes (Patient or Clinician) |
| `DELETE` | `/api/patients/:id` | Remove a patient profile and associated check-ins | Yes (Clinician) |
| `POST` | `/api/patients/:id/checkins` | Submit wound photo (multipart) + symptom flags | No |
| `GET` | `/api/patients/:id/timeline` | Fetch chronological check-ins (enforces doctor-patient isolation with `403 Forbidden`) | Yes (Assigned Clinician or Patient) |
| `GET` | `/api/patients/timeline` | Fetch timeline for the authenticated patient | Yes |
| `PATCH` | `/api/checkins/:id/review` | Update triage status (`reviewed`, `escalated`, etc.) & clinician notes | Yes (Assigned Clinician) |

### 🔔 Notifications & Badging (`/api/notifications`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications?role=clinician` | Get notification alerts filtered by recipient role | No |
| `GET` | `/api/notifications/unread-count?role=clinician` | Get unread notification count for header badge | No |
| `POST/PATCH` | `/api/notifications/read` | Mark specific notification ID(s) as read | No |
| `POST/PATCH` | `/api/notifications/read-all` | Mark all notifications for a role as read | No |

### 🤖 Machine Learning Service (`http://127.0.0.1:8000`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Check ML microservice status and model readiness |
| `POST` | `/predict` | Accept multipart image file, return concern score & predicted class |

---

## ⚠️ 11. Clinical Safety & Ethical Boundaries

> **CRITICAL CLINICAL BOUNDARY NOTICE:**
> 1. **Decision Support Only:** DermaLens AI is an assistive screening decision-support aid designed solely to organize evidence and highlight high-risk indicators for licensed surgeons and wound care nurses.
> 2. **No Autonomous Diagnosis:** The software **does not diagnose, treat, or declare a surgical wound infection-free**.
> 3. **Symptoms Override AI:** A low MobileNetV2 CNN score **never overrides** patient-reported fever, cloudy purulent drainage, or spreading erythema.
> 4. **Emergency Escalation:** Patients presenting with acute systemic symptoms are instructed by the application to seek emergency medical attention immediately.

---

## 👥 12. Team & Hackathon Details

- **Event:** Global Innovation Hackathon 2026 — *Build for a Better Future*
- **Organised by:** Bharat Academix
- **Team Name:** Logic Legion
- **Repository:** [Sahil-web01/DermaLens](https://github.com/Sahil-web01/DermaLens)

---

## 📄 13. References & Standards
1. **CDC:** *Guideline for the Prevention of Surgical Site Infection (SSI)*.
2. **TensorFlow / Keras:** *MobileNetV2: Inverted Residuals and Linear Bottlenecks (Sandler et al.)*.
3. **SurgWound Dataset:** *A benchmark dataset for surgical site infection surveillance (CC BY-SA 4.0)*.
4. **World Health Organization (WHO):** *Global Guidelines for the Prevention of Surgical Site Infection*.
