-- Schema for Karnataka State Police (KSP) Crime Intelligence System
-- Production-Grade Schema v2.0 — Phases 1-7 Upgrade

-- 1. FIR Table
CREATE TABLE IF NOT EXISTS FIR (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fir_number TEXT UNIQUE NOT NULL,
    district TEXT NOT NULL,
    police_station TEXT NOT NULL,
    crime_type TEXT NOT NULL,
    ipc_section TEXT,
    bns_section TEXT,
    status TEXT NOT NULL,
    date_reported TEXT NOT NULL,
    date_occurrence TEXT NOT NULL,
    description TEXT NOT NULL,
    modus_operandi TEXT NOT NULL
);

-- 2. Accused Table (Extended with demographic fields)
CREATE TABLE IF NOT EXISTS Accused (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fir_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    occupation TEXT,
    address TEXT,
    prior_convictions INTEGER DEFAULT 0,
    risk_score REAL DEFAULT 0.0,
    risk_model_version TEXT DEFAULT 'v1.0-formula',
    risk_confidence_low REAL,
    risk_confidence_high REAL,
    gang_affiliation TEXT,
    education_level TEXT DEFAULT 'Unknown',
    marital_status TEXT DEFAULT 'Unknown',
    migration_status TEXT DEFAULT 'Local',
    aadhaar_hash TEXT,
    FOREIGN KEY(fir_id) REFERENCES FIR(id) ON DELETE CASCADE
);

-- 3. Victim Table
CREATE TABLE IF NOT EXISTS Victim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fir_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    occupation TEXT,
    address TEXT,
    injury_type TEXT,
    FOREIGN KEY(fir_id) REFERENCES FIR(id) ON DELETE CASCADE
);

-- 4. Location Table
CREATE TABLE IF NOT EXISTS Location (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fir_id INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT NOT NULL,
    district TEXT NOT NULL,
    area_type TEXT NOT NULL,
    FOREIGN KEY(fir_id) REFERENCES FIR(id) ON DELETE CASCADE
);

-- 5. CaseLinks Table
CREATE TABLE IF NOT EXISTS CaseLinks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_fir_id INTEGER NOT NULL,
    target_fir_id INTEGER NOT NULL,
    link_type TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY(source_fir_id) REFERENCES FIR(id) ON DELETE CASCADE,
    FOREIGN KEY(target_fir_id) REFERENCES FIR(id) ON DELETE CASCADE
);

-- 6. SocioEconomicIndicators Table
CREATE TABLE IF NOT EXISTS SocioEconomicIndicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    district TEXT UNIQUE NOT NULL,
    literacy_rate REAL NOT NULL,
    unemployment_rate REAL NOT NULL,
    poverty_index REAL NOT NULL,
    police_density_per_k REAL NOT NULL,
    urbanization_rate REAL NOT NULL DEFAULT 50.0,
    migration_index REAL NOT NULL DEFAULT 0.0,
    population_density REAL NOT NULL DEFAULT 500.0
);

-- 7. AuditLog Table (Phase 1: Tamper-evident with hash chaining)
CREATE TABLE IF NOT EXISTS AuditLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    query_text TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    ip_address TEXT,
    data_classification TEXT DEFAULT 'Restricted',
    prev_hash TEXT DEFAULT '',
    integrity_hash TEXT DEFAULT ''
);

-- 8. FinancialTransaction Table
CREATE TABLE IF NOT EXISTS FinancialTransaction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fir_id INTEGER NOT NULL,
    transaction_date TEXT NOT NULL,
    source_account TEXT NOT NULL,
    source_account_type TEXT NOT NULL,
    destination_account TEXT NOT NULL,
    destination_account_type TEXT NOT NULL,
    amount REAL NOT NULL,
    transaction_type TEXT NOT NULL,
    reference_id TEXT,
    is_suspicious INTEGER DEFAULT 0,
    suspicion_reason TEXT,
    FOREIGN KEY(fir_id) REFERENCES FIR(id) ON DELETE CASCADE
);

-- 9. ConversationSession Table
CREATE TABLE IF NOT EXISTS ConversationSession (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    context_summary TEXT NOT NULL DEFAULT '{}',
    last_query TEXT,
    last_tool TEXT,
    last_district TEXT,
    last_crime_type TEXT,
    last_accused_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 10. CrimeForecast Table
CREATE TABLE IF NOT EXISTS CrimeForecast (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    district TEXT NOT NULL,
    predicted_crime_type TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    confidence REAL NOT NULL,
    reasoning TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    forecast_date TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    data_sources TEXT NOT NULL
);

-- ============================================================================
-- Phase 1: Officers Table (Authentication & RLS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS Officers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    badge_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    rank TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Investigator','Analyst','Supervisor','Policymaker')),
    district TEXT NOT NULL,
    police_station TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TEXT
);

-- ============================================================================
-- Phase 6: Legal & Compliance Tables
-- ============================================================================

-- 11. Warrants Table
CREATE TABLE IF NOT EXISTS Warrants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fir_id INTEGER NOT NULL,
    accused_id INTEGER,
    warrant_type TEXT NOT NULL CHECK(warrant_type IN ('Arrest','Search','NBW','Bailable','Non-Bailable')),
    issued_date TEXT NOT NULL,
    issued_by_court TEXT NOT NULL,
    executed_date TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Executed','Expired','Recalled')),
    court_order_id INTEGER,
    assigned_officer TEXT,
    notes TEXT,
    FOREIGN KEY(fir_id) REFERENCES FIR(id) ON DELETE CASCADE,
    FOREIGN KEY(accused_id) REFERENCES Accused(id),
    FOREIGN KEY(court_order_id) REFERENCES CourtOrders(id)
);

-- 12. CourtOrders Table
CREATE TABLE IF NOT EXISTS CourtOrders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fir_id INTEGER NOT NULL,
    accused_id INTEGER,
    order_type TEXT NOT NULL CHECK(order_type IN ('Bail','Remand','Charge-Sheet','Acquittal','Conviction','Stay','Transfer')),
    court_name TEXT NOT NULL,
    judge_name TEXT,
    order_date TEXT NOT NULL,
    next_hearing TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    order_summary TEXT,
    sentence_details TEXT,
    FOREIGN KEY(fir_id) REFERENCES FIR(id) ON DELETE CASCADE,
    FOREIGN KEY(accused_id) REFERENCES Accused(id)
);

-- 13. EvidenceChain Table (Digital Chain-of-Custody)
CREATE TABLE IF NOT EXISTS EvidenceChain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fir_id INTEGER NOT NULL,
    evidence_type TEXT NOT NULL CHECK(evidence_type IN ('photograph','video','document','forensic','digital','physical','statement')),
    file_hash TEXT NOT NULL,
    file_name TEXT,
    description TEXT,
    uploaded_by TEXT NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    custody_log TEXT NOT NULL DEFAULT '[]',
    is_verified INTEGER DEFAULT 0,
    verification_hash TEXT,
    FOREIGN KEY(fir_id) REFERENCES FIR(id) ON DELETE CASCADE
);

-- 14. WitnessStatements Table
CREATE TABLE IF NOT EXISTS WitnessStatements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fir_id INTEGER NOT NULL,
    witness_name TEXT NOT NULL,
    witness_contact TEXT,
    statement_text TEXT NOT NULL,
    recorded_by TEXT NOT NULL,
    recorded_date TEXT NOT NULL DEFAULT (datetime('now')),
    is_confidential INTEGER DEFAULT 0,
    statement_hash TEXT,
    FOREIGN KEY(fir_id) REFERENCES FIR(id) ON DELETE CASCADE
);

-- 15. BNS Mapping Table (IPC to Bharatiya Nyaya Sanhita)
CREATE TABLE IF NOT EXISTS BNS_Mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ipc_section TEXT NOT NULL,
    bns_section TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    max_punishment TEXT,
    is_cognizable INTEGER DEFAULT 1,
    is_bailable INTEGER DEFAULT 0
);

-- 16. LLMMemory Table (Memory Management)
CREATE TABLE IF NOT EXISTS LLMMemory (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    user_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 17. DeployedAgents Table (A2A Gateway)
CREATE TABLE IF NOT EXISTS DeployedAgents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    protocol_version TEXT NOT NULL DEFAULT '1.0',
    owner_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_fir_district ON FIR(district);
CREATE INDEX IF NOT EXISTS idx_fir_crime_type ON FIR(crime_type);
CREATE INDEX IF NOT EXISTS idx_fir_date ON FIR(date_reported);
CREATE INDEX IF NOT EXISTS idx_fir_station ON FIR(police_station);
CREATE INDEX IF NOT EXISTS idx_fir_bns ON FIR(bns_section);
CREATE INDEX IF NOT EXISTS idx_accused_name ON Accused(name);
CREATE INDEX IF NOT EXISTS idx_accused_gang ON Accused(gang_affiliation);
CREATE INDEX IF NOT EXISTS idx_accused_risk ON Accused(risk_score);
CREATE INDEX IF NOT EXISTS idx_location_coords ON Location(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_location_district ON Location(district);
CREATE INDEX IF NOT EXISTS idx_financial_fir ON FinancialTransaction(fir_id);
CREATE INDEX IF NOT EXISTS idx_financial_suspicious ON FinancialTransaction(is_suspicious);
CREATE INDEX IF NOT EXISTS idx_session_id ON ConversationSession(session_id);
CREATE INDEX IF NOT EXISTS idx_forecast_district ON CrimeForecast(district);
CREATE INDEX IF NOT EXISTS idx_officer_badge ON Officers(badge_id);
CREATE INDEX IF NOT EXISTS idx_officer_district ON Officers(district);
CREATE INDEX IF NOT EXISTS idx_warrant_fir ON Warrants(fir_id);
CREATE INDEX IF NOT EXISTS idx_warrant_status ON Warrants(status);
CREATE INDEX IF NOT EXISTS idx_court_fir ON CourtOrders(fir_id);
CREATE INDEX IF NOT EXISTS idx_evidence_fir ON EvidenceChain(fir_id);
CREATE INDEX IF NOT EXISTS idx_witness_fir ON WitnessStatements(fir_id);
CREATE INDEX IF NOT EXISTS idx_bns_ipc ON BNS_Mapping(ipc_section);
CREATE INDEX IF NOT EXISTS idx_bns_section ON BNS_Mapping(bns_section);
CREATE INDEX IF NOT EXISTS idx_audit_hash ON AuditLog(integrity_hash);
CREATE INDEX IF NOT EXISTS idx_memory_user ON LLMMemory(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_team ON LLMMemory(team_id);
CREATE INDEX IF NOT EXISTS idx_agent_owner ON DeployedAgents(owner_id);
CREATE INDEX IF NOT EXISTS idx_agent_team ON DeployedAgents(team_id);

