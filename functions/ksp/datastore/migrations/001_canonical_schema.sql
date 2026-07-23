-- Phase 2 Canonical Schema Migration v1.0
-- Implements nine-page FIR ER diagram entities and CaseSourceMap bridge

CREATE TABLE IF NOT EXISTS CaseMaster (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT UNIQUE NOT NULL,
    fir_number TEXT UNIQUE,
    district TEXT NOT NULL,
    police_station TEXT NOT NULL,
    crime_type TEXT NOT NULL,
    status TEXT NOT NULL,
    date_reported TEXT NOT NULL,
    date_occurrence TEXT NOT NULL,
    description TEXT,
    modus_operandi TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Person (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    aliases TEXT,
    gender TEXT,
    age INTEGER,
    dob TEXT,
    occupation TEXT,
    address TEXT,
    aadhaar_hash TEXT,
    identity_confidence REAL DEFAULT 1.0,
    source_ref TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS CasePersonRole (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Accused','Victim','Complainant','Witness','InvestigatingOfficer')),
    notes TEXT,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(case_id) REFERENCES CaseMaster(id) ON DELETE CASCADE,
    FOREIGN KEY(person_id) REFERENCES Person(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS CaseEvent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('FIRRegistration','Arrest','BailApplication','Chargesheet','CourtHearing','EvidenceTransfer','StatusChange')),
    event_date TEXT NOT NULL,
    description TEXT NOT NULL,
    recorded_by TEXT,
    provenance_hash TEXT,
    FOREIGN KEY(case_id) REFERENCES CaseMaster(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ExternalSourceRecord (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id TEXT UNIQUE NOT NULL,
    system_source TEXT NOT NULL,
    source_ref_id TEXT NOT NULL,
    payload_version TEXT DEFAULT 'v1',
    ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
    provenance_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS RelationshipEdge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_person_id INTEGER NOT NULL,
    target_person_id INTEGER NOT NULL,
    relationship_type TEXT NOT NULL,
    confidence_score REAL NOT NULL DEFAULT 0.8,
    supporting_case_ids TEXT,
    human_reviewed INTEGER DEFAULT 0,
    model_version TEXT DEFAULT 'v1.0-rules',
    FOREIGN KEY(source_person_id) REFERENCES Person(id) ON DELETE CASCADE,
    FOREIGN KEY(target_person_id) REFERENCES Person(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS EvidenceObject (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id TEXT UNIQUE NOT NULL,
    case_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    stratus_uri TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    classification TEXT DEFAULT 'Confidential',
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(case_id) REFERENCES CaseMaster(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS EvidenceCustodyEvent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id INTEGER NOT NULL,
    action_type TEXT NOT NULL CHECK(action_type IN ('Seized','Uploaded','Transferred','Analyzed','PresentedInCourt')),
    handled_by TEXT NOT NULL,
    custody_date TEXT NOT NULL,
    hash_verified INTEGER DEFAULT 1,
    notes TEXT,
    FOREIGN KEY(evidence_id) REFERENCES EvidenceObject(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Forecast (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_id TEXT UNIQUE NOT NULL,
    district TEXT NOT NULL,
    time_window TEXT NOT NULL,
    predicted_crime_type TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    confidence_interval REAL NOT NULL,
    validation_metric TEXT,
    human_approved INTEGER DEFAULT 0,
    model_version TEXT DEFAULT 'v1.0-quickml',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS CaseSourceMap (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fir_id INTEGER NOT NULL,
    case_master_id INTEGER NOT NULL,
    mapped_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(fir_id) REFERENCES FIR(id) ON DELETE CASCADE,
    FOREIGN KEY(case_master_id) REFERENCES CaseMaster(id) ON DELETE CASCADE
);
