# Go-Getters SME Self-Onboarding Platform

## Overview
The GoGetters Onboarding Platform is a digital self-service onboarding system developed for DBS to streamline cross-border business account opening for Small and Medium Enterprises (SMEs). The platform enables SMEs to complete onboarding end-to-end through an online interface while automating verification, compliance checks, and decision-making using AI and rule-based systems.

## Setup Instructions
### Prerequisites
- Node.js
- Python 3.9+
- PostgreSQL (via Supabase)

### Database Setup (Supabase + Alembic)
1. Create a Supabase project  
2. Obtain your PostgreSQL connection string  
Afterwards, run alembic upgrade head to create the tables

### Backend Setup
cd src
pip install -r requirements.txt
uvicorn main:app --reload 

### Frontend Setup
cd src/frontend
npm install
npm run dev

### Environment Variables
The backend requires environment variables for:
- Database (Supabase)
- Storage (Supabase)
- Google Cloud (Document AI & Gemini)
- Didit (Liveness Detection)
- SendGrid (Email notifications)

These must be obtained by registering with the respective providers and are not included in the repository.

The following environment variables are required for the system to connect to external services (database, storage, AI services, email, and KYC providers).
1. SUPABASE_URL  
2. SUPABASE_SERVICE_ROLE_KEY  
3. SUPABASE_STORAGE_BUCKET  
4. SUPABASE_KYC_BUCKET  
5. SUPABASE_ANON_KEY  
6. DATABASE_URL  
7. SENDGRID_API_KEY  
8. JOB_SECRET (can be any randomly generated string)  
9. GOOGLE_APPLICATION_CREDENTIALS  
10. GCP_PROJECT_ID  
11. GCP_LOCATION=us  
12. DOC_AI_PROCESSOR_ID  
13. DOC_AI_OCR_PROCESSOR_ID  
14. GEMINI_API_KEY  
15. DIDIT_API_KEY  
16. DIDIT_WORKFLOW_ID  

### Test Accounts
SME User
- Email: smeuser@gmail.com
- Password: Gogetters2026

Bank Staff
- Email: staff@gmail.com
- Password: Staff1234!

Management
- Email: management2@gmail.com
- Password: Gogetters123