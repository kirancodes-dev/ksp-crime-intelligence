-- Schema for Karnataka State Police (KSP) Crime Intelligence System

-- 1. FIR Table
CREATE TABLE IF NOT EXISTS FIR (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fir_number TEXT UNIQUE NOT NULL,
    district TEXT NOT NULL,
    police_station TEXT NOT NULL,
    crime_type TEXT NOT NULL,
    status TEXT NOT NULL,
    date_reported TEXT NOT NULL,
    date_occurrence TEXT NOT NULL,
    description TEXT NOT NULL,
    modus_operandi TEXT NOT NULL
);

-- 2. Accused Table (Extended with demographic fields for Section 4)
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
    gang_affiliation TEXT,
    education_level TEXT DEFAULT 'Unknown',
    marital_status TEXT DEFAULT 'Unknown',
    migration_status TEXT DEFAULT 'Local',
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

-- 7. AuditLog Table
CREATE TABLE IF NOT EXISTS AuditLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    query_text TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    ip_address TEXT,
    data_classification TEXT DEFAULT 'Restricted'
);

-- 8. FinancialTransaction Table (Section 7: Financial Crime)
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

-- 9. ConversationSession Table (Section 1: Context-aware follow-ups)
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

-- 10. CrimeForecast Table (Section 8: Predictive intelligence)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fir_district ON FIR(district);
CREATE INDEX IF NOT EXISTS idx_fir_crime_type ON FIR(crime_type);
CREATE INDEX IF NOT EXISTS idx_fir_date ON FIR(date_reported);
CREATE INDEX IF NOT EXISTS idx_accused_name ON Accused(name);
CREATE INDEX IF NOT EXISTS idx_accused_gang ON Accused(gang_affiliation);
CREATE INDEX IF NOT EXISTS idx_location_coords ON Location(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_financial_fir ON FinancialTransaction(fir_id);
CREATE INDEX IF NOT EXISTS idx_financial_suspicious ON FinancialTransaction(is_suspicious);
CREATE INDEX IF NOT EXISTS idx_session_id ON ConversationSession(session_id);
CREATE INDEX IF NOT EXISTS idx_forecast_district ON CrimeForecast(district);
