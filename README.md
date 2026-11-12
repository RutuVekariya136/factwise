# CareOps — Clinical Ward Operations Platform

CareOps is an enterprise-style clinical ward operations prototype built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS** for managing a 74-bed isolation/recovery unit.

> **Demo Mode Notice:** This prototype persists state in browser `localStorage` only and does not include production authentication, backend APIs, or database-level security.

---

## Core Capabilities

- **74-Bed Capacity Management:** Enforces a strict 74-room limit (`TOTAL_ROOMS = 74`), prevents duplicate room assignments, blocks admissions when full, and automatically releases rooms upon patient discharge or mortality.
- **Daily Temperature Rounds (Nurse Station):**
  - Records timestamped patient temperatures (`35.0°C – 42.5°C`) attributed to the active nurse.
  - Prevents duplicate same-day temperature entries.
- **Fever-Free Streak & Discharge Eligibility:**
  - Calculates consecutive completed fever-free calendar days (`< 37.5°C`) using facility-local dates (`YYYY-MM-DD`).
  - Requires **3 consecutive completed fever-free days** before a physician can confirm clinical discharge readiness.
  - Missing temperature days or fever recurrence (`≥ 37.5°C`) reset the streak.
- **Doctor Queue & Clinical Controls:**
  - Enforces today's temperature check before standard doctor visits.
  - Supports **Urgent Override** visits when today's temperature is missing, requiring a documented clinical justification (`≥ 10` characters) and logging an `URGENT OVERRIDE` audit event.
  - Prevents silent overwriting of same-day doctor visits; subsequent edits require a documented **Correction** (`≥ 5` characters) while preserving original visit history.
- **Two-Stage Discharge Workflow:**
  1. **Clinical Readiness Confirmation:** Doctor / Head Doctor confirms 3-day fever-free eligibility.
  2. **Administrative Discharge:** Admin Staff finalizes discharge, vacates the room, and preserves full patient clinical history.
- **Facility Analytics & Mortality Benchmark:**
  - Tracks resolved-outcome mortality (`deaths / (discharged + deceased) × 100`) and recovery success rates (`85%` benchmark), surfacing alerts when mortality exceeds `15%`.
- **Role-Based Access Control (RBAC):**
  - Navigation and handler-level permission guards via `ROLE_PERMISSIONS` across `Nurse`, `Doctor`, `Admin`, and `Head Doctor` roles.
- **Chronological Activity Log:** Searchable, filterable audit trail for admissions, temperature logs, doctor visits, corrections, urgent overrides, discharge confirmations, discharges, and mortality events.

---

## Tech Stack

- **React 19** (`react`, `react-dom`)
- **TypeScript 5.8**
- **Vite 6**
- **Tailwind CSS 4** (`@tailwindcss/vite`)
- **Lucide Icons** (`lucide-react`)

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation & Local Development

```bash
npm install
npm run dev
```

The app runs locally at `http://localhost:5173/`.

### Production Build

```bash
npm run build
npm run preview
```

---

## Project Structure

```text
src/
├── App.tsx                             # Root state, RBAC-guarded handlers, localStorage sync
├── types.ts                            # Domain types, clinical thresholds, ROLE_PERMISSIONS
├── data/
│   └── seedPatients.ts                 # 74-bed baseline + resolved outcome seed dataset
├── utils/
│   └── clinical.ts                     # Fever-free streak, eligibility, analytics calculations
└── components/
    ├── Sidebar.tsx                     # Role-gated navigation, role switcher, Demo Mode notice
    ├── TopNav.tsx                      # Mobile header & status bar
    ├── OverviewView.tsx                # Facility overview, KPIs, operational alerts
    ├── PatientDirectoryView.tsx        # Searchable ward & resolved patient directory
    ├── NurseStationView.tsx            # Daily temperature rounds
    ├── DoctorQueueView.tsx             # Physician review queue
    ├── DischargeManagementView.tsx     # Two-stage clinical & admin discharge workflow
    ├── AnalyticsView.tsx               # Mortality & recovery benchmark analytics
    ├── ActivityLogView.tsx             # Chronological audit log
    ├── PatientDetailModal.tsx          # Patient timeline, temp/visit/override/correction forms
    ├── AdmitPatientModal.tsx           # Admin patient admission & room assignment
    └── MortalityAlertBanner.tsx        # >15% mortality threshold alert banner
```
