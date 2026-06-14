# Karnataka State Police (KSP) Crime Intelligence System

An AI-powered conversational analytics dashboard prototype built to demonstrate modern spatial mapping, offender relationship networks, recidivism risk scoring, and translation features under a single internal portal.

---

## 🛠️ Technology Stack

* **Frontend**: React (Vite + TypeScript) styled with Tailwind CSS v4.
  * *Visualizations*: Leaflet (crime mapping), Recharts (trends/comparisons), vis-network (syndicate linkages).
  * *Voice/Audio*: Web Speech API (real STT dictation and TTS report readouts).
* **Backend Emulator**: Node.js Express server acting as the local Catalyst Functions runner.
* **Database**: Local SQLite database populated with realistic synthetic criminal activities in Karnataka.
* **Orchestration**: Catalyst Circuits state workflows defined in JSON.

---

## 📁 Project Structure

```
ksp-crime-intelligence/
│
├── client/                          # Frontend (React + TS + Tailwind v4)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface/       # Conversational AI panel & widget mappings
│   │   │   ├── VoiceInput/          # Web Speech API microphone & speech controls
│   │   │   └── Visualizations/      # Leaflet Map, Recharts, vis-network, Risk Scorecard
│   │   ├── pages/                   # Investigator, Analyst, and Supervisor dashboards
│   │   └── services/                # API wrappers calling local Catalyst Express endpoints
│   └── index.html
│
├── functions/                       # Catalyst Node.js Functions
│   ├── chat-handler/                # Orchestrates dialogue & audit logs
│   ├── tool-router/                 # Maps NL query keywords to specific widgets
│   ├── risk-scoring/                # Computes offender risk factor matrices
│   ├── anomaly-detection/           # Flags district surges & MO groups
│   ├── translate/ & voice/          # Mocks Zia translator & speech models
│   ├── pdf-export/                  # Mocks SmartBrowz PDF engine
│   ├── shared/catalyst-sdk.js       # Custom SQLite-to-SDK query bridge
│   └── server.js                    # Express server running functions on port 3001
│
├── datastore/                       # Database Schemas & Seeds
│   ├── schema.sql                   # Relational tables: FIR, Accused, Location, AuditLog...
│   └── seed/
│       └── generate_synthetic_data.py # Python seeder mapping Karnataka districts
│
├── circuits/                        # Catalyst Circuits state charts
│   └── query-orchestration.json
│
├── ml/                              # Zia AutoML and QuickML configurations
│   ├── risk-model-config/
│   └── rag-index/
│
├── docs/                            # Technical Architecture & Deployment guides
│   └── catalyst-services-mapping.md
│
└── package.json                     # Root coordinates to install & boot the application
```

---

## 🚀 Getting Started

### 1. Prerequisites

Make sure you have **Node.js** (v18+ recommended) and **Python 3** installed on your system.

### 2. Installation

Install dependencies for all workspaces (root, client, and functions) with a single command:

```bash
npm run install-all
```

### 3. Database Seeding

Generate the SQLite database (`datastore/ksp_crime.db`) and seed it with 60 Karnataka cases, accused links, and district parameters:

```bash
npm run seed
```

### 4. Running the Application

Boot up the frontend client (Vite on port `5173`) and backend emulator (Express on port `3001`) concurrently:

```bash
npm run dev
```

Open your browser and navigate to: **`http://localhost:5173`**

---

## 🔍 Features to Test

1. **Role Toggling**: Use the "Active Role" dropdown in the header to switch between **Investigator** (chat search & case brief lookup), **Analyst** (hotspot maps & association networks), and **Supervisor** (Zia anomaly flags & audit logs).
2. **Conversational Widgets**: In the Investigator chat, submit queries to dynamically spawn analytical widgets inside the chat logs:
   * *"where are cyber crime cases in Bengaluru City?"* (Spawns Leaflet Map)
   * *"show offender connection networks"* (Spawns vis-network graph)
   * *"what is the risk profile of Jagadish alias 'Jacky'?"* (Spawns AutoML risk profile scorecard)
   * *"plot theft trends in Mysuru vs Mangaluru"* (Spawns comparative Recharts chart)
3. **Web Speech integration**: Click the microphone icon to dictate queries in real-time. Click the speaker icon to listen to the AI narrative.
4. **SmartBrowz PDF Export**: Click "Export Report" in the chat to download a compiled PDF summary of the briefing.
5. **Supervisor Audits**: Go to the Supervisor Dashboard to review the database logs of all queries run in the portal.
