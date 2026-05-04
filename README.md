# CerTrack 2.0 🛡️
### Internship Certification & Tracking System

Welcome to *CerTrack 2.0*, a professional-grade platform designed to streamline the management of intern certifications, training hours, and reporting. Built with speed, security, and aesthetics in mind.

---

## 🚀 Core Features
*   **📊 Real-Time Dashboard**: Instant overview of total interns, certifications, and training hours.
*   **🔐 Role-Based Access Control (RBAC)**: Secure separation between **Admins** (Full Management) and **Interns** (Personal Profiles).
*   **📄 Professional PDF Reports**: Generate beautiful, print-ready certification summaries with a single click.
*   **🌓 Multi-Theme Support**: Sleek Dark Mode (default) and professional Light Mode toggle.
*   **⚡ High-Performance Backend**: Powered by Supabase for real-time updates and lightning-fast data fetching.
*   **🛠️ Admin Control Panel**: Dynamic configuration of project names and system-wide access codes.

---

## 🛠️ Tech Stack
*   **Frontend**: React.js, Vite, Lucide React (Icons).
*   **Styling**: Premium Vanilla CSS with Glassmorphism and SVG animations.
*   **Backend**: Supabase (PostgreSQL, Real-time, Auth, RLS).
*   **Documentation**: SQL Schema, Security Policies, and Triggers included in the `/backend` folder.

---

## 📂 Project Structure

├── backend/            # SQL Blueprint (Schema, Security, Triggers)
├── frontend/           # React Source Code
│   ├── src/            # Application Logic & UI
│   ├── public/         # Static Assets
│   └── .env            # Connection Credentials
└── README.md           # Master Documentation


---

## 🛡️ Security First
This system utilizes **Row Level Security (RLS)** at the database level. 
*   **Admins** have full control over all records.
*   **Interns** are strictly isolated and can only view/manage their own profile data.

---

Developed with  by **Aliviw Mwendwa**.
*"Precision in Tracking, Excellence in Certification."*
