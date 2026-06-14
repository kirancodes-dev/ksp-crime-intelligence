# Real-World Production Roadmap — KSP Crime Intelligence System

To transition this high-fidelity prototype into a production-grade, secure portal suitable for active deployment by the Karnataka State Police (KSP), the following upgrades must be implemented across the architecture:

---

## 🗺️ Production Upgrade Roadmap

### 1. Database & Search Migration (SQLite ➔ Cloud Datastore & Vector Index)
* **Relational Storage**: Migrate the local SQLite `ksp_crime.db` tables (FIR, Accused, Victims, Location, CaseLinks, AuditLogs) into the managed **Catalyst Data Store**. Define indexes on search-heavy fields (`fir_number`, `accused_id`, `district`).
* **Semantic RAG Search**: Replace the token-based SQLite search in `quickML` with a real **QuickML Vector Index**. Connect it to a Catalyst embedding model (`catalyst-z3-embedding-v2`) to chunk and index case narratives and modus operandi text, enabling true semantic conceptual searches.

### 2. Live Data Ingestion Pipeline (CCTNS Integration)
* **Core Sync**: Integrate the portal directly with the national **CCTNS (Crime and Criminal Tracking Network & Systems)** database.
* **ETL Workflows**: Implement scheduled Catalyst Crons or **Catalyst Circuits** that run hourly to extract new FIRs, suspect details, arrest records, and court outcomes, validate the schema, and update the vector index automatically.

### 3. Enterprise-Grade Security & Authentication (SSO & RLS)
* **Single Sign-On (SSO)**: Replace the dropdown role-switcher with **Catalyst Authentication** integrated with KSP's central Active Directory (AD) or the Karnataka State Government SSO portal (e.g., HRMS).
* **Row-Level Security (RLS)**: Enforce strict role-based and geographical boundaries:
  - **Investigator (SI)**: Can only access case records, suspect profiles, and map markers within their designated Police Station jurisdiction.
  - **Analyst (DA)**: Access scoped to their District.
  - **Policymaker (DGP)**: Unrestricted state-wide read access.
* **Immutable Auditing**: Transition the audit logs from a database table to a write-once, tamper-evident logging framework or forward logs directly to KSP's central SIEM (Security Information and Event Management) system.

### 4. Transitioning Emulated SDK to Production Catalyst APIs
Rewrite the helper methods inside [catalyst-sdk.js](file:///Users/kiranbiradar/Desktop/KPS/functions/shared/catalyst-sdk.js) to utilize Zoho's actual production SDKs:
* **Translation**: Replace the Kannada-to-English mock dictionaries with the live **Catalyst Zia Translation API**.
* **Voice STT/TTS**: Route audio recordings to **Catalyst Zia Speech-to-Text** which is trained on diverse regional dialects.
* **AutoML Risk Assessment**: Deploy the risk evaluation model configurations into **Catalyst Zia AutoML (Tabular)** and retrain the model on historic KSP criminal record datasets (100,000+ records) to output true recidivism probabilities.
* **PDF Export**: Route case summaries through **Catalyst SmartBrowz** to convert HTML structures into official government-formatted PDF report downloads.

### 5. Production Host Deployment (AppSail & Client Hosting)
* **Frontend CDN**: Deploy the static React assets (`dist/` build folder) to **Catalyst Web Client Hosting** to leverage its globally distributed CDN, ensuring fast page load times even under low-bandwidth mobile networks in rural police stations.
* **API Functions**: Bundle the Express routes into standalone **Catalyst AppSail** managed runtimes or split them into micro-functions on the Catalyst serverless runtime.
* **API Gateway Configuration**: Secure the backend API behind a Catalyst API Gateway with rate limiting (to protect against DDoS attacks) and CORS rules restricted strictly to the official KSP domain.
