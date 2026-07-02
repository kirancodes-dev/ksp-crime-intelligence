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
CREATE TABLE IF NOT EXISTS FIR_Accused (
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
CREATE TABLE IF NOT EXISTS FIR_Victim (
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



-- ============================================================================
-- Official Karnataka Police FIR System Schema (CCTNS Compliant)
-- ============================================================================

-- 1. State Table
CREATE TABLE IF NOT EXISTS State (
    StateID INTEGER PRIMARY KEY AUTOINCREMENT,
    StateName TEXT NOT NULL,
    NationalityID INTEGER,
    Active INTEGER DEFAULT 1
);

-- 2. District Table
CREATE TABLE IF NOT EXISTS District (
    DistrictID INTEGER PRIMARY KEY AUTOINCREMENT,
    DistrictName TEXT NOT NULL,
    StateID INTEGER NOT NULL,
    Active INTEGER DEFAULT 1,
    FOREIGN KEY(StateID) REFERENCES State(StateID)
);

-- 3. UnitType Table
CREATE TABLE IF NOT EXISTS UnitType (
    UnitTypeID INTEGER PRIMARY KEY AUTOINCREMENT,
    UnitTypeName TEXT NOT NULL,
    CityDistState TEXT,
    Hierarchy INTEGER,
    Active INTEGER DEFAULT 1
);

-- 4. Unit Table
CREATE TABLE IF NOT EXISTS Unit (
    UnitID INTEGER PRIMARY KEY AUTOINCREMENT,
    UnitName TEXT NOT NULL,
    TypeID INTEGER NOT NULL,
    ParentUnit INTEGER,
    NationalityID INTEGER,
    StateID INTEGER NOT NULL,
    DistrictID INTEGER NOT NULL,
    Active INTEGER DEFAULT 1,
    FOREIGN KEY(TypeID) REFERENCES UnitType(UnitTypeID),
    FOREIGN KEY(StateID) REFERENCES State(StateID),
    FOREIGN KEY(DistrictID) REFERENCES District(DistrictID)
);

-- 5. Rank Table
CREATE TABLE IF NOT EXISTS Rank (
    RankID INTEGER PRIMARY KEY AUTOINCREMENT,
    RankName TEXT NOT NULL,
    Hierarchy INTEGER,
    Active INTEGER DEFAULT 1
);

-- 6. Designation Table
CREATE TABLE IF NOT EXISTS Designation (
    DesignationID INTEGER PRIMARY KEY AUTOINCREMENT,
    DesignationName TEXT NOT NULL,
    Active INTEGER DEFAULT 1,
    SortOrder INTEGER
);

-- 7. Employee Table
CREATE TABLE IF NOT EXISTS Employee (
    EmployeeID INTEGER PRIMARY KEY AUTOINCREMENT,
    DistrictID INTEGER NOT NULL,
    UnitID INTEGER NOT NULL,
    RankID INTEGER NOT NULL,
    DesignationID INTEGER NOT NULL,
    KGID TEXT UNIQUE NOT NULL,
    FirstName TEXT NOT NULL,
    EmployeeDOB TEXT NOT NULL,
    GenderID INTEGER,
    BloodGroupID INTEGER,
    PhysicallyChallenged INTEGER DEFAULT 0,
    AppointmentDate TEXT NOT NULL,
    FOREIGN KEY(DistrictID) REFERENCES District(DistrictID),
    FOREIGN KEY(UnitID) REFERENCES Unit(UnitID),
    FOREIGN KEY(RankID) REFERENCES Rank(RankID),
    FOREIGN KEY(DesignationID) REFERENCES Designation(DesignationID)
);

-- 8. CaseCategory Table
CREATE TABLE IF NOT EXISTS CaseCategory (
    CaseCategoryID INTEGER PRIMARY KEY AUTOINCREMENT,
    LookupValue TEXT NOT NULL
);

-- 9. GravityOffence Table
CREATE TABLE IF NOT EXISTS GravityOffence (
    GravityOffenceID INTEGER PRIMARY KEY AUTOINCREMENT,
    LookupValue TEXT NOT NULL
);

-- 10. CrimeHead Table
CREATE TABLE IF NOT EXISTS CrimeHead (
    CrimeHeadID INTEGER PRIMARY KEY AUTOINCREMENT,
    CrimeGroupName TEXT NOT NULL,
    Active INTEGER DEFAULT 1
);

-- 11. CrimeSubHead Table
CREATE TABLE IF NOT EXISTS CrimeSubHead (
    CrimeSubHeadID INTEGER PRIMARY KEY AUTOINCREMENT,
    CrimeHeadID INTEGER NOT NULL,
    CrimeHeadName TEXT NOT NULL,
    SeqID INTEGER,
    FOREIGN KEY(CrimeHeadID) REFERENCES CrimeHead(CrimeHeadID)
);

-- 12. CaseStatusMaster Table
CREATE TABLE IF NOT EXISTS CaseStatusMaster (
    CaseStatusID INTEGER PRIMARY KEY AUTOINCREMENT,
    CaseStatusName TEXT NOT NULL
);

-- 13. Court Table
CREATE TABLE IF NOT EXISTS Court (
    CourtID INTEGER PRIMARY KEY AUTOINCREMENT,
    CourtName TEXT NOT NULL,
    DistrictID INTEGER NOT NULL,
    StateID INTEGER NOT NULL,
    Active INTEGER DEFAULT 1,
    FOREIGN KEY(DistrictID) REFERENCES District(DistrictID),
    FOREIGN KEY(StateID) REFERENCES State(StateID)
);

-- 15. CasteMaster Table
CREATE TABLE IF NOT EXISTS CasteMaster (
    caste_master_id INTEGER PRIMARY KEY AUTOINCREMENT,
    caste_master_name TEXT NOT NULL
);

-- 16. ReligionMaster Table
CREATE TABLE IF NOT EXISTS ReligionMaster (
    ReligionID INTEGER PRIMARY KEY AUTOINCREMENT,
    ReligionName TEXT NOT NULL
);

-- 17. OccupationMaster Table
CREATE TABLE IF NOT EXISTS OccupationMaster (
    OccupationID INTEGER PRIMARY KEY AUTOINCREMENT,
    OccupationName TEXT NOT NULL
);

-- 14. CaseMaster Table
CREATE TABLE IF NOT EXISTS CaseMaster (
    CaseMasterID INTEGER PRIMARY KEY AUTOINCREMENT,
    CrimeNo TEXT UNIQUE NOT NULL,
    CaseNo TEXT NOT NULL,
    CrimeRegisteredDate TEXT NOT NULL,
    PolicePersonID INTEGER NOT NULL,
    PoliceStationID INTEGER NOT NULL,
    CaseCategoryID INTEGER NOT NULL,
    GravityOffenceID INTEGER NOT NULL,
    CrimeMajorHeadID INTEGER NOT NULL,
    CrimeMinorHeadID INTEGER NOT NULL,
    CaseStatusID INTEGER NOT NULL,
    CourtID INTEGER NOT NULL,
    FOREIGN KEY(PolicePersonID) REFERENCES Employee(EmployeeID),
    FOREIGN KEY(PoliceStationID) REFERENCES Unit(UnitID),
    FOREIGN KEY(CaseCategoryID) REFERENCES CaseCategory(CaseCategoryID),
    FOREIGN KEY(GravityOffenceID) REFERENCES GravityOffence(GravityOffenceID),
    FOREIGN KEY(CrimeMajorHeadID) REFERENCES CrimeHead(CrimeHeadID),
    FOREIGN KEY(CrimeMinorHeadID) REFERENCES CrimeSubHead(CrimeSubHeadID),
    FOREIGN KEY(CaseStatusID) REFERENCES CaseStatusMaster(CaseStatusID),
    FOREIGN KEY(CourtID) REFERENCES Court(CourtID)
);

-- 18. ComplainantDetails Table
CREATE TABLE IF NOT EXISTS ComplainantDetails (
    ComplainantID INTEGER PRIMARY KEY AUTOINCREMENT,
    CaseMasterID INTEGER NOT NULL,
    ComplainantName TEXT NOT NULL,
    AgeYear INTEGER,
    OccupationID INTEGER NOT NULL,
    ReligionID INTEGER NOT NULL,
    CasteID INTEGER NOT NULL,
    GenderID INTEGER,
    FOREIGN KEY(CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
    FOREIGN KEY(OccupationID) REFERENCES OccupationMaster(OccupationID),
    FOREIGN KEY(ReligionID) REFERENCES ReligionMaster(ReligionID),
    FOREIGN KEY(CasteID) REFERENCES CasteMaster(caste_master_id)
);

-- 19. Act Table
CREATE TABLE IF NOT EXISTS Act (
    ActCode TEXT PRIMARY KEY,
    ActDescription TEXT NOT NULL,
    ShortName TEXT,
    Active INTEGER DEFAULT 1
);

-- 20. Section Table
CREATE TABLE IF NOT EXISTS Section (
    ActCode TEXT NOT NULL,
    SectionCode TEXT NOT NULL,
    SectionDescription TEXT,
    Active INTEGER DEFAULT 1,
    PRIMARY KEY (ActCode, SectionCode),
    FOREIGN KEY(ActCode) REFERENCES Act(ActCode)
);

-- 21. ActSectionAssociation Table
CREATE TABLE IF NOT EXISTS ActSectionAssociation (
    CaseMasterID INTEGER NOT NULL,
    ActCode TEXT NOT NULL,
    SectionCode TEXT NOT NULL,
    ActOrderID INTEGER,
    SectionOrderID INTEGER,
    PRIMARY KEY (CaseMasterID, ActCode, SectionCode),
    FOREIGN KEY(CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
    FOREIGN KEY(ActCode, SectionCode) REFERENCES Section(ActCode, SectionCode)
);

-- 22. Victim Table
CREATE TABLE IF NOT EXISTS Victim (
    VictimMasterID INTEGER PRIMARY KEY AUTOINCREMENT,
    CaseMasterID INTEGER NOT NULL,
    VictimName TEXT NOT NULL,
    AgeYear INTEGER,
    GenderID INTEGER,
    VictimPolice TEXT DEFAULT '0',
    FOREIGN KEY(CaseMasterID) REFERENCES CaseMaster(CaseMasterID)
);

-- 23. Accused Table
CREATE TABLE IF NOT EXISTS Accused (
    AccusedMasterID INTEGER PRIMARY KEY AUTOINCREMENT,
    CaseMasterID INTEGER NOT NULL,
    AccusedName TEXT NOT NULL,
    AgeYear INTEGER,
    GenderID INTEGER,
    PersonID TEXT NOT NULL,
    FOREIGN KEY(CaseMasterID) REFERENCES CaseMaster(CaseMasterID)
);

-- 24. ArrestSurrender Table
CREATE TABLE IF NOT EXISTS ArrestSurrender (
    ArrestSurrenderID INTEGER PRIMARY KEY AUTOINCREMENT,
    CaseMasterID INTEGER NOT NULL,
    ArrestSurrenderTypeID INTEGER NOT NULL,
    ArrestSurrenderDate TEXT NOT NULL,
    ArrestSurrenderStateId INTEGER NOT NULL,
    ArrestSurrenderDistrictId INTEGER NOT NULL,
    PoliceStationID INTEGER NOT NULL,
    IOID INTEGER NOT NULL,
    CourtID INTEGER NOT NULL,
    AccusedMasterID INTEGER NOT NULL,
    IsAccused INTEGER DEFAULT 1,
    IsComplainantAccused INTEGER DEFAULT 0,
    FOREIGN KEY(CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
    FOREIGN KEY(ArrestSurrenderStateId) REFERENCES State(StateID),
    FOREIGN KEY(ArrestSurrenderDistrictId) REFERENCES District(DistrictID),
    FOREIGN KEY(PoliceStationID) REFERENCES Unit(UnitID),
    FOREIGN KEY(IOID) REFERENCES Employee(EmployeeID),
    FOREIGN KEY(CourtID) REFERENCES Court(CourtID),
    FOREIGN KEY(AccusedMasterID) REFERENCES Accused(AccusedMasterID)
);

-- 25. CrimeHeadActSection Table
CREATE TABLE IF NOT EXISTS CrimeHeadActSection (
    CrimeHeadID INTEGER NOT NULL,
    ActCode TEXT NOT NULL,
    SectionCode TEXT NOT NULL,
    PRIMARY KEY (CrimeHeadID, ActCode, SectionCode),
    FOREIGN KEY(CrimeHeadID) REFERENCES CrimeHead(CrimeHeadID),
    FOREIGN KEY(ActCode, SectionCode) REFERENCES Section(ActCode, SectionCode)
);

-- 26. ChargesheetDetails Table
CREATE TABLE IF NOT EXISTS ChargesheetDetails (
    CSID INTEGER PRIMARY KEY AUTOINCREMENT,
    CaseMasterID INTEGER NOT NULL,
    csdate TEXT NOT NULL,
    cstype TEXT NOT NULL,
    PolicePersonID INTEGER NOT NULL,
    FOREIGN KEY(CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
    FOREIGN KEY(PolicePersonID) REFERENCES Employee(EmployeeID)
);

-- 27. Junction Table: inv_arrestsurrenderaccused
CREATE TABLE IF NOT EXISTS inv_arrestsurrenderaccused (
    ArrestSurrenderID INTEGER NOT NULL,
    AccusedMasterID INTEGER NOT NULL,
    PRIMARY KEY (ArrestSurrenderID, AccusedMasterID),
    FOREIGN KEY(ArrestSurrenderID) REFERENCES ArrestSurrender(ArrestSurrenderID),
    FOREIGN KEY(AccusedMasterID) REFERENCES Accused(AccusedMasterID)
);

-- 28. Junction Table: Inv_OccuranceTime
CREATE TABLE IF NOT EXISTS Inv_OccuranceTime (
    CaseMasterID INTEGER PRIMARY KEY,
    IncidentFromDate TEXT NOT NULL,
    IncidentToDate TEXT,
    InfoReceivedPSDate TEXT NOT NULL,
    FOREIGN KEY(CaseMasterID) REFERENCES CaseMaster(CaseMasterID)
);

-- 29. Junction Table: Inv_OccuranceLocation
CREATE TABLE IF NOT EXISTS Inv_OccuranceLocation (
    CaseMasterID INTEGER PRIMARY KEY,
    latitude REAL,
    longitude REAL,
    BriefFacts TEXT,
    FOREIGN KEY(CaseMasterID) REFERENCES CaseMaster(CaseMasterID)
);

-- Indexes for CCTNS schema
CREATE INDEX IF NOT EXISTS idx_casemaster_crime_no ON CaseMaster(CrimeNo);
CREATE INDEX IF NOT EXISTS idx_casemaster_coords ON Inv_OccuranceLocation(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_complainant_case ON ComplainantDetails(CaseMasterID);
CREATE INDEX IF NOT EXISTS idx_actsection_case ON ActSectionAssociation(CaseMasterID);
CREATE INDEX IF NOT EXISTS idx_victim_case ON Victim(CaseMasterID);
CREATE INDEX IF NOT EXISTS idx_accused_case ON Accused(CaseMasterID);
CREATE INDEX IF NOT EXISTS idx_arrest_case ON ArrestSurrender(CaseMasterID);
