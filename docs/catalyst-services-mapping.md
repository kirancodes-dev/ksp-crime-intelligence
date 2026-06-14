# KSP Crime Intelligence System - Catalyst Services Mapping

This document details how the components built in this prototype map to actual production services on the **Zoho Catalyst** platform.

---

## 1. Conversational Chat Engine (QuickML + Zia)

| Prototype Module | Catalyst Production Service | Description |
| :--- | :--- | :--- |
| `functions/chat-handler` | **Catalyst Functions (Node.js)** | The entry point serverless function mounted on Catalyst API Gateway. |
| `functions/tool-router` | **Catalyst Functions (Node.js)** | Logical parser routing queries to specific microservices or databases. |
| `functions/rag-query` | **Catalyst QuickML (RAG)** | Combines Vector Index and LLM pipelines to execute context-aware RAG search on FIR summaries. |
| `ml/rag-index/config.json` | **QuickML Index Definition** | Configuration detailing chunk sizes and vector dimensions for document parsing. |

---

## 2. Machine Learning & Translation (Zia Services)

| Prototype Module | Catalyst Production Service | Description |
| :--- | :--- | :--- |
| `functions/risk-scoring` | **Catalyst Zia AutoML (Tabular)** | Trains and hosts binary classification models to output accused recidivism risk scores. |
| `functions/anomaly-detection` | **Catalyst Cron + Zia AutoML** | Scheduled serverless cron triggers that run analytics looking for spikes or high-risk active syndicates. |
| `functions/translate` | **Catalyst Zia Translation** | Dual translation API (English <=> Kannada) to accommodate localized police dialects. |
| `functions/voice` | **Catalyst Zia STT & TTS** | Voice transcription (speech-to-text) and readout (text-to-speech) capabilities. |

---

## 3. Database & Datastore

| Prototype Module | Catalyst Production Service | Description |
| :--- | :--- | :--- |
| `datastore/schema.sql` | **Catalyst Data Store (Relational)** | Custom schema declarations defining FIR, Accused, Victim, Location, and CaseLinks tables in the Relational Datastore. |
| `functions/shared/catalyst-sdk` | **Catalyst Node.js SDK** | The programmatic interface used to execute select and insert queries against the datastore. |

---

## 4. Workflows & PDF Export

| Prototype Module | Catalyst Production Service | Description |
| :--- | :--- | :--- |
| `circuits/query-orchestration.json` | **Catalyst Circuits** | Visual state-machine JSON defining the multi-step serverless orchestration flow. |
| `functions/pdf-export` | **Catalyst SmartBrowz** | PDF conversion service compiling HTML log timelines into downloadable police briefs. |

---

## 5. Hosting & Deployment

| Prototype Module | Catalyst Production Service | Description |
| :--- | :--- | :--- |
| `client/` | **Catalyst Web Client Hosting** | Hosts the compiled React client static files on the Catalyst CDN. |
| `functions/` | **Catalyst AppSail / Functions** | Deploys backend Express runner and Node modules onto managed virtual environments. |
