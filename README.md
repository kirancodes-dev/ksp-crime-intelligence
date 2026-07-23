# 🛡️ Karnataka State Police (KSP) — Crime Intelligence & Analytics Portal

[![Status](https://img.shields.io/badge/Status-Catalyst%20Prototype%20(Pilot%20Pathway)-amber.svg?style=for-the-badge)]()
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Tailwind%20v4-blue.svg?style=for-the-badge)]()
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Catalyst%20Serverless-lightgrey.svg?style=for-the-badge)]()
[![Database](https://img.shields.io/badge/Database-Catalyst%20Data%20Store%20(SQLite%20Emulated)-navy.svg?style=for-the-badge)]()
[![LLM Target](https://img.shields.io/badge/LLM%20Target-Catalyst%20QuickML%20(Qwen%202.5--14B)-purple.svg?style=for-the-badge)]()

> [!WARNING]
> **PROTOTYPE AUDIT DISCLAIMER & PILOT PATHWAY**:
> This project is a **proof-of-concept demonstration prototype** designed for evidence-grounded crime intelligence evaluation. It is **NOT** an official production-ready police deployment.
> - **Data Notice**: Current environments use synthetic data and local SQLite emulation (`/tmp/ksp_crime.db`).
> - **Simulations**: Integrations (CCTNS, Biometrics, CDR, OCR, SmartBrowz) are operated under `DEMO_SIMULATOR` mode.
> - **AI Engine Roadmap**: Production target is **Zoho Catalyst QuickML RAG with Qwen 2.5-14B-Instruct** (India Data Center). External providers (Gemini/Ollama) are used strictly for local development testing.
> - **Ethical AI**: Automated individual threat/risk scoring and bail recommendations ("deny bail") are strictly disabled in accordance with the *Digital Personal Data Protection Act, 2023*.

An advanced, multi-role tactical intelligence and conversational analytics portal built for the **Karnataka State Police (KSP) Crime Intelligence & Analytics Division**.

---

## 🏛️ System Architecture


```mermaid
graph TD
    %% Frontend Layer
    subgraph Client [React + TypeScript Client Portal]
        UI[App.tsx]
        Inv[Investigator Dashboard]
        Ana[Analyst Dashboard]
        Sup[Supervisor Dashboard]
        Pol[Policymaker Dashboard]
        Chat[AI Assistant Widget]
    end

    %% Backend Layer
    subgraph Backend [Node.js Express Catalyst Emulator]
        Server[server.js - API Gateway]
        Handler[chat-handler/index.js]
        Router[tool-router/index.js]
        
        %% Core Services
        Risk[risk-scoring]
        Finance[financial-analysis]
        Similar[similar-cases]
        Audit[audit-logging]
        Trans[translate - Kannada/English]
    end

    %% LLM & AI Layer
    subgraph AI [LLM Intelligence Engine]
        Dual[shared/gemini.js]
        Gemini[Google Gemini 2.5 API]
        Ollama[Local Ollama Service]
    end

    %% Database Layer
    subgraph Data [Relational Datastore]
        SQLite[(SQLite - ksp_crime.db)]
    end

    %% Connections
    UI --> Inv & Ana & Sup & Pol
    Chat --> Server
    Server --> Handler
    Handler --> Router
    Router --> Dual
    Dual --> Gemini
    Dual --> Ollama
    Router --> SQLite
    Router --> Risk & Finance & Similar
    Risk & Finance & Similar --> SQLite
    Handler --> Audit
    Audit --> SQLite
```

---

## 🌟 Core Features

### 1. Multi-Role Tactical Dashboards
* **SI (Investigator) Portal**: Integrated Secure Query Terminal side-by-side with a detailed **Case Brief** viewer showing suspect profiles, modus operandi, matching cases, and money-flow trails.
* **DA (Analyst) Portal**: Provides district-level analytics, geo-spatial Leaflet maps, vis-network syndicate association graphs, and predictive early warnings.
* **ACP (Supervisor) Portal**: Full accountability panel rendering a real-time system audit log with **data classification badges** and live microservice health checkers (Datastore, Zia ML).
* **DGP (Policymaker) Executive Brief**: High-density macro metrics showing state-wide crime rate distributions, socio-economic correlations, and seasonal crime forecasting.

### 2. Dual-Mode Conversational AI Engine
* **Cloud Mode (Google Gemini)**: Leverages Gemini 2.5 Flash for advanced structured query routing and context-aware narrative generation.
* **Offline Mode (Ollama)**: Direct integration with locally running models (e.g. `gemma2:2b`, `llama3:8b`) via local HTTP endpoints. **100% free, private, and offline**.
* **Automatic Fallback**: If the cloud API key is unconfigured or credits are depleted, the portal automatically falls back to local database query patterns and mock narratives without interrupting the user.

### 3. Interactive Visualizations
* **Geographical Hotspot Map**: Dynamic Leaflet maps rendering incident clusters, district boundaries, and local police station jurisdictions.
* **Force-Directed Syndicate Graph**: Double-clickable Vis-Network graphs mapping connections between repeat offenders, shared case links, and modus operandi matches.
* **Financial Money Trail**: Interactive transaction graph highlighting suspicious bank accounts, money flow volumes, and hawala nodes in high-contrast red.
* **Socio-Demographic Dashboard**: Deep-dive analytics on age distribution, gender splits, education levels, and unemployment rates correlated with crime rates.

### 4. Localized Accessibility
* **Voice STT/TTS**: Native Web Speech API integration. Dictate queries via microphone in real-time, or listen to the AI narrative summaries.
* **Kannada Language Support**: Dynamic dual-translation API converting Kannada queries to English for internal processing, and translating the intelligence briefings back to Kannada text and speech.

---

## 🚀 Phase 6: Next-Gen Interactive Upgrades

The application has been outfitted with four main interactive systems representing real-world operational flows:

### 1. Interactive Recidivism Risk Calculator
* **Suspect Risk Card**: Toggles have been added to suspect profiles to simulate dynamic threat changes:
  * *Active Arrest Warrant*
  * *Weapon Association*
  * *Hawala Money Linkage*
  * *Habitual Offender Status*
* **LLM Recalculation**: Clicking "Recalculate Profile" submits a structured modifier payload back to the main chat assistant, raising the overall threat score dynamically and returning a synthesized narrative explanation.

### 2. CCTNS Sync Terminal Simulator
* **Connection Badge**: A green "CCTNS Link: Connected" indicator rests in the app header, signaling handshake status.
* **Live Extraction Modal**: Clicking the sync button triggers a full sequential mock terminal log extractor (e.g., establishing SSL, querying districts, refreshing Zia AutoML weights) with real-time logs and progress increments.

### 3. Supervisor Audit & Compliance Overrides
* **Compliance Waivers**: Anomaly alert flags in the Supervisor panel can be resolved with a "Resolve Flag" action button.
* **Immutable Logs**: Inputting official resolution reasons writes a compliance justification directly to the SQLite datastore audit logs, immediately reflecting in the audit trail ledger for governance tracking.

### 4. Map Incident Side-Drawer
* **Incident Selection**: Clicking on any leaflet marker pin triggers an `onIncidentSelect` event.
* **Sliding Lateral Panel**: Opens a sliding lateral drawer from the right containing FIR details, address info, prime suspect dossiers, modus operandi summaries, and predictive early warning intelligence alerts.

---

## 🛠️ Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Lucide Icons |
| **Visualizations** | Leaflet (Maps), vis-network (Force-graphs), Recharts (Stats) |
| **Backend** | Node.js, Express, dotenv |
| **Database** | SQLite3 (simulating Zoho Catalyst Relational Datastore) |
| **Speech** | Web Speech API (Speech-to-Text & Text-to-Speech) |
| **Local LLM** | Ollama API (Llama3/Gemma2) |
| **Cloud LLM** | Google Gemini 2.5 Flash API |

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **Python 3** installed on your machine.

### 2. Installation
Install dependencies for the root repository, frontend, and backend with a single command:
```bash
npm run install-all
```

### 3. Initialize & Seed Database
Build the schema and seed the database with realistic synthetic case reports, suspect linkages, financial transactions, and early warning predictions across Karnataka districts:
```bash
npm run seed
```

### 4. Environment Configuration (`.env`)
Create a `.env` file in the root workspace. You can choose to run the cloud Gemini LLM or the local Ollama LLM:

#### To Run with Local Ollama (Free & Offline):
Make sure Ollama is running (`ollama run gemma2:2b`) and configure:
```env
USE_OLLAMA=true
OLLAMA_MODEL=gemma2:2b
```

#### To Run with Google Gemini (Cloud API):
Generate a key from [Google AI Studio](https://aistudio.google.com/) and configure:
```env
USE_OLLAMA=false
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
```

### 5. Running the Application
Start the frontend client (Vite on port `5173`) and the backend Express server (port `3001`) concurrently:
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

---

## 🔍 Example Queries to Run in Chat

The conversational AI automatically parses natural language queries and renders the correct interactive widget inside your chat logs. Try entering these:

| Objective | Query Example | Spawned Widget |
| :--- | :--- | :--- |
| **Geographic Hotspots** | *"Where are cyber crime incidents in Bengaluru City?"* | **Interactive Leaflet Map** |
| **Syndicate Links** | *"Show repeat offender connection networks"* | **vis-network Force Graph** |
| **Recidivism Risk** | *"What is the threat score of Jagadish alias 'Jacky'?"* | **AutoML Risk Scorecard** |
| **Financial Trails** | *"Trace the money flow for case FIR-2026-001"* | **Financial Transaction Graph** |
| **State Crime Trends** | *"Plot theft trends in Mysuru vs Mangaluru"* | **Recharts Timeline Chart** |
| **Demographic Insights** | *"Show socio-demographic correlation analysis"* | **Socio-Demographic Panel** |
| **Case Pattern Match** | *"Find similar cases to FIR-2026-003"* | **Similar Case Match Card** |
| **Proactive Forecasting** | *"Predict upcoming crime hotspots"* | **Forecast Alert Panel** |

---

## 🔒 Security & Accountability
The portal is designed in compliance with law enforcement security standards:
* **Data Classification**: All data responses are tagged with data classification badges (e.g. `Confidential`, `Restricted`, `Highly Sensitive`).
* **Audit Trails**: Every conversational query, translated text, and database download is logged in a secure, immutable audit table containing timestamps, badge IDs, and IP addresses.
* **Official Banner**: A persistent warning header: `Restricted — For Official Use Only • Karnataka State Police` is rendered on every viewport.

---

## 🗺️ Canonical 9-Page FIR ER Schema Integration Plan

To replace the parallel legacy `FIR` and `CaseMaster` models, the following canonical ER extensions are specified:

1. **`Person`**: Stable identity management, alias tracking, identity confidence score, source system cross-references.
2. **`CasePersonRole`**: Standardized role mapping linking `Person` to `CaseMaster` (Accused, Victim, Complainant, Witness, Officer).
3. **`CaseEvent`**: Operational audit events (FIR registration, Arrest, Bail, Chargesheet, Hearing, Custody transfer).
4. **`ExternalSourceRecord`**: Provenance metadata for CCTNS/ICJS/eCourts data ingestion.
5. **`RelationshipEdge`**: Graph intelligence relationships with explicit confidence levels and human verification state.
6. **`EvidenceObject` & `EvidenceCustodyEvent`**: File storage pointers in **Catalyst Stratus** with SHA-256 hashes and chain-of-custody tracking.
7. **`Forecast`**: District-level spatial-temporal forecasting with validation metrics and human oversight approvals.
8. **`CaseSourceMap`**: Transitional bridge mapping legacy synthetic data structures to canonical ER entities.

---

## 🤖 Catalyst QuickML RAG Architecture Contract

For official Catalyst deployments, the online conversational engine strictly follows the structured response contract:

```json
{
  "answer": "string",
  "facts": [],
  "sources": [],
  "uncertainty": "low|medium|high",
  "policy_status": "allowed|restricted|refused",
  "model_version": "ksp-quickml-qwen-2.5-14b"
}
```

* **Model Specification**: Zoho Catalyst QuickML RAG with **Qwen 2.5-14B-Instruct** (India Data Center).
* **Tool Router Isolation**: LLM generates structured tool invocations (`get_case`, `search_cases`, `get_person_history`); arbitrary SQL generation by LLM is prohibited.

---

## 📅 10-Year Production Roadmap

### 0–3 Months: Safety & Truthfulness
* Rebranded system from "production" to **Catalyst Demonstration Prototype**.
* Explicitly labelled simulated integrations with `DEMO_SIMULATOR` badges.
* Unloaded individual threat/risk scoring and automated bail recommendations.
* Defined canonical `CaseMaster` schema bridge.

### 3–12 Months: Catalyst Pilot Phase
* Migration from SQLite `/tmp` to **Catalyst Data Store**.
* Deployment of **Catalyst Web Client Hosting** and API Gateway authorization policies.
* Integration of **Catalyst QuickML RAG (Qwen 2.5-14B-Instruct)** and Zia OCR/Translation.
* Evidence storage migration to **Catalyst Stratus**.

### Year 1–3: Controlled Operational Pilot
* Secure integration adapters for CCTNS, ICJS, and eCourts datasets.
* Analyst-reviewed network relationship verification.
* District-level spatial forecasting calibration and model monitoring.

### Year 3–10: Sustainable State Platform
* Versioned microservices and schema migrations.
* Independent security audits and DPDP Act 2023 compliance reviews.
* Continuous model bias monitoring and portable backend service boundaries.
