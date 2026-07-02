const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
// Helper to resolve paths to either local dev (../../datastore) or bundled function path (../datastore)
function resolveDataPath(...parts) {
  const bundledPath = path.join(__dirname, '..', 'datastore', ...parts);
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }
  return path.join(__dirname, '..', '..', 'datastore', ...parts);
}

// Function to check if a directory is writable
function isDirectoryWritable(dir) {
  try {
    const testFile = path.join(dir, '.write_test_' + Math.random().toString(36).substring(2));
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (e) {
    return false;
  }
}

// Detect Catalyst environment or read-only runtime
const sourceDbPath = resolveDataPath('ksp_crime.db');
const sourceDbDir = path.dirname(sourceDbPath);
const isCatalyst = !!(
  process.env.CATALYST_ENVIRONMENT || 
  process.env.CATALYST_PROJECT_ID || 
  process.env.CATALYST_ENV_ID || 
  process.env.CATALYST_PROJECT_NAME ||
  !isDirectoryWritable(sourceDbDir)
);

let activeDbPath;

if (isCatalyst) {
  activeDbPath = '/tmp/ksp_crime.db';
  
  // Copy the database to /tmp if it doesn't exist or is empty/invalid
  let shouldCopy = !fs.existsSync(activeDbPath);
  if (!shouldCopy) {
    try {
      const stats = fs.statSync(activeDbPath);
      if (stats.size < 10000) {
        shouldCopy = true;
      }
    } catch (e) {
      shouldCopy = true;
    }
  }

  if (shouldCopy) {
    try {
      console.log(`Catalyst environment or read-only filesystem detected. Copying database from ${sourceDbPath} to ${activeDbPath}...`);
      fs.copyFileSync(sourceDbPath, activeDbPath);
      console.log('Database copy to /tmp successful.');
    } catch (err) {
      console.error('Failed to copy database to /tmp:', err);
    }
  }
} else {
  activeDbPath = sourceDbPath;
}

class DatastoreTable {
  constructor(db, tableName) {
    this.db = db;
    this.tableName = tableName;
  }

  async get(id) {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async insert(row) {
    const keys = Object.keys(row);
    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.join(', ');
    const values = Object.values(row);
    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, values, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
}

class CatalystInstance {
  constructor() {
    this._readyResolve = null;
    this.ready = new Promise(resolve => { this._readyResolve = resolve; });
    this._initPending = 0;
    this._initDone = false;

    this.db = new sqlite3.Database(activeDbPath, (err) => {
      if (err) {
        console.error('Failed to open SQLite database in Catalyst SDK:', err);
        if (this._readyResolve) this._readyResolve();
      } else {
        this.db.run('PRAGMA journal_mode=WAL');
        this.db.run('PRAGMA busy_timeout=5000');

        const markDone = () => {
          this._initPending--;
          if (this._initPending === 0 && !this._initDone) {
            this._initDone = true;
            if (this._readyResolve) this._readyResolve();
            console.log('Database initialization complete.');
          }
        };

        // Run schema.sql on first startup to create all core tables
        const schemaPath = resolveDataPath('schema.sql');
        if (fs.existsSync(schemaPath)) {
          this._initPending++;
          const schema = fs.readFileSync(schemaPath, 'utf8');
          this.db.exec(schema, (schemaErr) => {
            if (schemaErr) {
              console.error('Schema initialization error (may be partial):', schemaErr.message);
            } else {
              console.log('Core schema initialized from schema.sql');
            }
            markDone();
          });
        }

        // Initialize schema additions for collaborative workspaces and CCTNS scheduler
        this.db.serialize(() => {
          this.db.run(`
            CREATE TABLE IF NOT EXISTS SharedWorkspace (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              asset_type TEXT NOT NULL,
              asset_id TEXT NOT NULL,
              details TEXT,
              pinned_at TEXT NOT NULL
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS SharedNotes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              notes TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS CCTNS_SyncJobs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              timestamp TEXT NOT NULL,
              trigger_type TEXT NOT NULL,
              status TEXT NOT NULL,
              latency_ms INTEGER NOT NULL,
              records_ingested INTEGER NOT NULL
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS SmartBrowz_Logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              timestamp TEXT NOT NULL,
              category TEXT NOT NULL,
              feature TEXT NOT NULL,
              status TEXT NOT NULL,
              latency_ms INTEGER NOT NULL,
              size_kb INTEGER,
              details TEXT
            )
          `);

          // ====================================================================
          // Phase 1: Officers Table (Authentication & RLS)
          this.db.run(`
            CREATE TABLE IF NOT EXISTS Officers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              badge_id TEXT UNIQUE NOT NULL,
              name TEXT NOT NULL,
              rank TEXT NOT NULL,
              role TEXT NOT NULL,
              district TEXT NOT NULL,
              police_station TEXT NOT NULL,
              password_hash TEXT NOT NULL,
              is_active INTEGER DEFAULT 1,
              last_login TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              failed_login_attempts INTEGER DEFAULT 0,
              locked_until TEXT
            )
          `);

          // ====================================================================
          // Gateway Schema: LLMMemory and DeployedAgents
          // ====================================================================
          this.db.run(`
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
            )
          `);

          this.db.run(`
            CREATE TABLE IF NOT EXISTS DeployedAgents (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              url TEXT NOT NULL,
              protocol_version TEXT NOT NULL DEFAULT '1.0',
              owner_id TEXT NOT NULL,
              team_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `);

          // ====================================================================
          // Official Karnataka Police FIR System Schema (CCTNS Compliant)
          // ====================================================================
          this.db.run(`
            CREATE TABLE IF NOT EXISTS State (
              StateID INTEGER PRIMARY KEY AUTOINCREMENT,
              StateName TEXT NOT NULL,
              NationalityID INTEGER,
              Active INTEGER DEFAULT 1
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS District (
              DistrictID INTEGER PRIMARY KEY AUTOINCREMENT,
              DistrictName TEXT NOT NULL,
              StateID INTEGER NOT NULL,
              Active INTEGER DEFAULT 1,
              FOREIGN KEY(StateID) REFERENCES State(StateID)
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS UnitType (
              UnitTypeID INTEGER PRIMARY KEY AUTOINCREMENT,
              UnitTypeName TEXT NOT NULL,
              CityDistState TEXT,
              Hierarchy INTEGER,
              Active INTEGER DEFAULT 1
            )
          `);
          this.db.run(`
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
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS Rank (
              RankID INTEGER PRIMARY KEY AUTOINCREMENT,
              RankName TEXT NOT NULL,
              Hierarchy INTEGER,
              Active INTEGER DEFAULT 1
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS Designation (
              DesignationID INTEGER PRIMARY KEY AUTOINCREMENT,
              DesignationName TEXT NOT NULL,
              Active INTEGER DEFAULT 1,
              SortOrder INTEGER
            )
          `);
          this.db.run(`
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
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS CaseCategory (
              CaseCategoryID INTEGER PRIMARY KEY AUTOINCREMENT,
              LookupValue TEXT NOT NULL
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS GravityOffence (
              GravityOffenceID INTEGER PRIMARY KEY AUTOINCREMENT,
              LookupValue TEXT NOT NULL
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS CrimeHead (
              CrimeHeadID INTEGER PRIMARY KEY AUTOINCREMENT,
              CrimeGroupName TEXT NOT NULL,
              Active INTEGER DEFAULT 1
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS CrimeSubHead (
              CrimeSubHeadID INTEGER PRIMARY KEY AUTOINCREMENT,
              CrimeHeadID INTEGER NOT NULL,
              CrimeHeadName TEXT NOT NULL,
              SeqID INTEGER,
              FOREIGN KEY(CrimeHeadID) REFERENCES CrimeHead(CrimeHeadID)
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS CaseStatusMaster (
              CaseStatusID INTEGER PRIMARY KEY AUTOINCREMENT,
              CaseStatusName TEXT NOT NULL
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS Court (
              CourtID INTEGER PRIMARY KEY AUTOINCREMENT,
              CourtName TEXT NOT NULL,
              DistrictID INTEGER NOT NULL,
              StateID INTEGER NOT NULL,
              Active INTEGER DEFAULT 1,
              FOREIGN KEY(DistrictID) REFERENCES District(DistrictID),
              FOREIGN KEY(StateID) REFERENCES State(StateID)
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS CasteMaster (
              caste_master_id INTEGER PRIMARY KEY AUTOINCREMENT,
              caste_master_name TEXT NOT NULL
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS ReligionMaster (
              ReligionID INTEGER PRIMARY KEY AUTOINCREMENT,
              ReligionName TEXT NOT NULL
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS OccupationMaster (
              OccupationID INTEGER PRIMARY KEY AUTOINCREMENT,
              OccupationName TEXT NOT NULL
            )
          `);
          this.db.run(`
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
              IncidentFromDate TEXT NOT NULL,
              IncidentToDate TEXT,
              InfoReceivedPSDate TEXT NOT NULL,
              latitude REAL,
              longitude REAL,
              BriefFacts TEXT NOT NULL,
              FOREIGN KEY(PolicePersonID) REFERENCES Employee(EmployeeID),
              FOREIGN KEY(PoliceStationID) REFERENCES Unit(UnitID),
              FOREIGN KEY(CaseCategoryID) REFERENCES CaseCategory(CaseCategoryID),
              FOREIGN KEY(GravityOffenceID) REFERENCES GravityOffence(GravityOffenceID),
              FOREIGN KEY(CrimeMajorHeadID) REFERENCES CrimeHead(CrimeHeadID),
              FOREIGN KEY(CrimeMinorHeadID) REFERENCES CrimeSubHead(CrimeSubHeadID),
              FOREIGN KEY(CaseStatusID) REFERENCES CaseStatusMaster(CaseStatusID),
              FOREIGN KEY(CourtID) REFERENCES Court(CourtID)
            )
          `);
          this.db.run(`
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
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS Act (
              ActCode TEXT PRIMARY KEY,
              ActDescription TEXT NOT NULL,
              ShortName TEXT,
              Active INTEGER DEFAULT 1
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS Section (
              ActCode TEXT NOT NULL,
              SectionCode TEXT NOT NULL,
              SectionDescription TEXT,
              Active INTEGER DEFAULT 1,
              PRIMARY KEY (ActCode, SectionCode),
              FOREIGN KEY(ActCode) REFERENCES Act(ActCode)
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS ActSectionAssociation (
              CaseMasterID INTEGER NOT NULL,
              ActCode TEXT NOT NULL,
              SectionCode TEXT NOT NULL,
              ActOrderID INTEGER,
              SectionOrderID INTEGER,
              PRIMARY KEY (CaseMasterID, ActCode, SectionCode),
              FOREIGN KEY(CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
              FOREIGN KEY(ActCode, SectionCode) REFERENCES Section(ActCode, SectionCode)
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS VictimMaster (
              VictimMasterID INTEGER PRIMARY KEY AUTOINCREMENT,
              CaseMasterID INTEGER NOT NULL,
              VictimName TEXT NOT NULL,
              AgeYear INTEGER,
              GenderID INTEGER,
              VictimPolice TEXT DEFAULT '0',
              FOREIGN KEY(CaseMasterID) REFERENCES CaseMaster(CaseMasterID)
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS AccusedMaster (
              AccusedMasterID INTEGER PRIMARY KEY AUTOINCREMENT,
              CaseMasterID INTEGER NOT NULL,
              AccusedName TEXT NOT NULL,
              AgeYear INTEGER,
              GenderID INTEGER,
              PersonID TEXT NOT NULL,
              FOREIGN KEY(CaseMasterID) REFERENCES CaseMaster(CaseMasterID)
            )
          `);
          this.db.run(`
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
              FOREIGN KEY(AccusedMasterID) REFERENCES AccusedMaster(AccusedMasterID)
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS CrimeHeadActSection (
              CrimeHeadID INTEGER NOT NULL,
              ActCode TEXT NOT NULL,
              SectionCode TEXT NOT NULL,
              PRIMARY KEY (CrimeHeadID, ActCode, SectionCode),
              FOREIGN KEY(CrimeHeadID) REFERENCES CrimeHead(CrimeHeadID),
              FOREIGN KEY(ActCode, SectionCode) REFERENCES Section(ActCode, SectionCode)
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS ChargesheetDetails (
              CSID INTEGER PRIMARY KEY AUTOINCREMENT,
              CaseMasterID INTEGER NOT NULL,
              csdate TEXT NOT NULL,
              cstype TEXT NOT NULL,
              PolicePersonID INTEGER NOT NULL,
              FOREIGN KEY(CaseMasterID) REFERENCES CaseMaster(CaseMasterID),
              FOREIGN KEY(PolicePersonID) REFERENCES Employee(EmployeeID)
            )
          `);

          // Indexes for CCTNS schema
          this.db.run("CREATE INDEX IF NOT EXISTS idx_casemaster_crime_no ON CaseMaster(CrimeNo)", () => {});
          this.db.run("CREATE INDEX IF NOT EXISTS idx_casemaster_coords ON CaseMaster(latitude, longitude)", () => {});
          this.db.run("CREATE INDEX IF NOT EXISTS idx_complainant_case ON ComplainantDetails(CaseMasterID)", () => {});
          this.db.run("CREATE INDEX IF NOT EXISTS idx_actsection_case ON ActSectionAssociation(CaseMasterID)", () => {});
          this.db.run("CREATE INDEX IF NOT EXISTS idx_victim_case ON VictimMaster(CaseMasterID)", () => {});
          this.db.run("CREATE INDEX IF NOT EXISTS idx_accused_case ON AccusedMaster(CaseMasterID)", () => {});
          this.db.run("CREATE INDEX IF NOT EXISTS idx_arrest_case ON ArrestSurrender(CaseMasterID)", () => {});

          // Add hash chain columns to AuditLog if they don't exist
          this.db.run("ALTER TABLE AuditLog ADD COLUMN prev_hash TEXT DEFAULT ''", () => {});
          this.db.run("ALTER TABLE AuditLog ADD COLUMN integrity_hash TEXT DEFAULT ''", () => {});
          this.db.run("ALTER TABLE AuditLog ADD COLUMN ip_address TEXT", () => {});
          this.db.run("ALTER TABLE AuditLog ADD COLUMN data_classification TEXT DEFAULT 'Restricted'", () => {});

          // ====================================================================
          // Phase 6: Legal & Compliance Tables
          // ====================================================================
          this.db.run(`
            CREATE TABLE IF NOT EXISTS Warrants (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              fir_id INTEGER NOT NULL,
              accused_id INTEGER,
              warrant_type TEXT NOT NULL,
              issued_date TEXT NOT NULL,
              issued_by_court TEXT NOT NULL,
              executed_date TEXT,
              status TEXT NOT NULL DEFAULT 'Pending',
              court_order_id INTEGER,
              assigned_officer TEXT,
              notes TEXT
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS CourtOrders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              fir_id INTEGER NOT NULL,
              accused_id INTEGER,
              order_type TEXT NOT NULL,
              court_name TEXT NOT NULL,
              judge_name TEXT,
              order_date TEXT NOT NULL,
              next_hearing TEXT,
              status TEXT NOT NULL DEFAULT 'Active',
              order_summary TEXT,
              sentence_details TEXT
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS EvidenceChain (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              fir_id INTEGER NOT NULL,
              evidence_type TEXT NOT NULL,
              file_hash TEXT NOT NULL,
              file_name TEXT,
              description TEXT,
              uploaded_by TEXT NOT NULL,
              uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
              custody_log TEXT NOT NULL DEFAULT '[]',
              is_verified INTEGER DEFAULT 0,
              verification_hash TEXT
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS WitnessStatements (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              fir_id INTEGER NOT NULL,
              witness_name TEXT NOT NULL,
              witness_contact TEXT,
              statement_text TEXT NOT NULL,
              recorded_by TEXT NOT NULL,
              recorded_date TEXT NOT NULL DEFAULT (datetime('now')),
              is_confidential INTEGER DEFAULT 0,
              statement_hash TEXT
            )
          `);
          this.db.run(`
            CREATE TABLE IF NOT EXISTS BNS_Mapping (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              ipc_section TEXT NOT NULL,
              bns_section TEXT NOT NULL,
              description TEXT NOT NULL,
              category TEXT NOT NULL,
              max_punishment TEXT,
              is_cognizable INTEGER DEFAULT 1,
              is_bailable INTEGER DEFAULT 0
            )
          `);

          // ====================================================================
          // Seed Officer Accounts (Phase 1)
          // ====================================================================
          this._initPending++;
          this.db.get("SELECT COUNT(*) as count FROM Officers", (err, row) => {
            if (!err && row && row.count === 0) {
              const hashPw = (password) => {
                const salt = crypto.randomBytes(16).toString('hex');
                const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
                return `${salt}:${hash}`;
              };
              const officers = [
                ['INV-1001', 'Meera Nair', 'SI', 'Investigator', 'Bengaluru City', 'Bengaluru City Central PS', hashPw('ksp2026')],
                ['ANA-2001', 'Priya Sharma', 'DA', 'Analyst', 'Bengaluru City', 'Bengaluru City Central PS', hashPw('ksp2026')],
                ['SUP-3001', 'Raghavendra K.', 'ACP', 'Supervisor', 'Bengaluru City', 'Bengaluru City Central PS', hashPw('ksp2026')],
                ['POL-4001', 'Srinivas M.', 'DGP', 'Policymaker', 'Karnataka State', 'DGP Office Bengaluru', hashPw('ksp2026')]
              ];
              const stmt = this.db.prepare('INSERT INTO Officers (badge_id, name, rank, role, district, police_station, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)');
              officers.forEach(o => stmt.run(...o));
              stmt.finalize();
              console.log('Default officer accounts seeded successfully.');
            }
            markDone();
          });

          // ====================================================================
          // Seed BNS Mapping Data (Phase 6)
          // ====================================================================
          this._initPending++;
          this.db.get("SELECT COUNT(*) as count FROM BNS_Mapping", (err, row) => {
            if (!err && row && row.count === 0) {
              try {
                const bnsPath = resolveDataPath('seed', 'bns_mapping.json');
                if (fs.existsSync(bnsPath)) {
                  const bnsData = JSON.parse(fs.readFileSync(bnsPath, 'utf8'));
                  const stmt = this.db.prepare('INSERT INTO BNS_Mapping (ipc_section, bns_section, description, category, max_punishment, is_cognizable, is_bailable) VALUES (?, ?, ?, ?, ?, ?, ?)');
                  bnsData.forEach(b => stmt.run(b.ipc, b.bns, b.description, b.category, b.max_punishment, b.cognizable ? 1 : 0, b.bailable ? 1 : 0));
                  stmt.finalize();
                  console.log(`BNS mapping seeded: ${bnsData.length} sections.`);
                }
              } catch (bnsErr) {
                console.error('Failed to seed BNS mapping:', bnsErr);
              }
            }
            markDone();
          });

          // Seed initial notes if empty
          this.db.get("SELECT COUNT(*) as count FROM SharedNotes", (err, row) => {
            if (!err && row && row.count === 0) {
              this.db.run("INSERT INTO SharedNotes (notes, updated_at) VALUES (?, ?)", [
                "Collaborative Notes: Active focus on Rupa Naik and associated Hawala money trail...",
                new Date().toISOString()
              ]);
            }
          });

          // Seed historical sync jobs if empty
          this.db.get("SELECT COUNT(*) as count FROM CCTNS_SyncJobs", (err, row) => {
            if (!err && row && row.count === 0) {
              this.db.run(`
                INSERT INTO CCTNS_SyncJobs (timestamp, trigger_type, status, latency_ms, records_ingested)
                VALUES 
                (datetime('now', '-2 hours'), 'Automatic', 'SUCCESS', 1240, 14),
                (datetime('now', '-4 hours'), 'Automatic', 'SUCCESS', 980, 8),
                (datetime('now', '-6 hours'), 'Manual', 'SUCCESS', 1450, 22),
                (datetime('now', '-8 hours'), 'Automatic', 'FAILED', 3200, 0)
              `);
            }
          });

          // Seed SmartBrowz logs if empty
          this.db.get("SELECT COUNT(*) as count FROM SmartBrowz_Logs", (err, row) => {
            if (!err && row && row.count === 0) {
              const features = [
                { category: 'Browser Control', feature: 'Headless', details: 'Rendered crime analytics dashboard for automated archive' },
                { category: 'Browser Control', feature: 'Browser Logic', details: 'Simulated supervisor verification script run' },
                { category: 'Convert', feature: 'PDF & Screenshot', details: 'Exported intelligence brief PDF' },
                { category: 'Convert', feature: 'Templates', details: 'Compiled vernacular translator template' },
                { category: 'Data', feature: 'Dataverse', details: 'Synchronized CCTNS regional dataverse schema' }
              ];
              
              const seedStmt = this.db.prepare(`
                INSERT INTO SmartBrowz_Logs (timestamp, category, feature, status, latency_ms, size_kb, details)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `);

              const now = new Date();
              const offsetDate = (hoursAgo) => {
                const d = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
                return d.toISOString().replace('T', ' ').substring(0, 19);
              };

              for (let h = 0.5; h <= 24; h += 1) {
                const feat = features[Math.floor(Math.random() * features.length)];
                const status = Math.random() > 0.05 ? 'SUCCESS' : 'FAILED';
                const latency = status === 'SUCCESS' ? 300 + Math.floor(Math.random() * 1200) : 2000 + Math.floor(Math.random() * 3000);
                const size = feat.category === 'Convert' ? 20 + Math.floor(Math.random() * 150) : null;
                seedStmt.run(offsetDate(h), feat.category, feat.feature, status, latency, size, feat.details);
              }
              for (let d = 2; d <= 7; d++) {
                for (let i = 0; i < 3; i++) {
                  const feat = features[Math.floor(Math.random() * features.length)];
                  const status = Math.random() > 0.08 ? 'SUCCESS' : 'FAILED';
                  const latency = status === 'SUCCESS' ? 300 + Math.floor(Math.random() * 1200) : 2000 + Math.floor(Math.random() * 3000);
                  const size = feat.category === 'Convert' ? 20 + Math.floor(Math.random() * 150) : null;
                  const hoursAgo = d * 24 + i * 8 + Math.floor(Math.random() * 6);
                  seedStmt.run(offsetDate(hoursAgo), feat.category, feat.feature, status, latency, size, feat.details);
                }
              }
              for (let d = 8; d <= 30; d++) {
                const feat = features[Math.floor(Math.random() * features.length)];
                const status = Math.random() > 0.1 ? 'SUCCESS' : 'FAILED';
                const latency = status === 'SUCCESS' ? 300 + Math.floor(Math.random() * 1200) : 2000 + Math.floor(Math.random() * 3000);
                const size = feat.category === 'Convert' ? 20 + Math.floor(Math.random() * 150) : null;
                const hoursAgo = d * 24 + Math.floor(Math.random() * 24);
                seedStmt.run(offsetDate(hoursAgo), feat.category, feat.feature, status, latency, size, feat.details);
              }

              seedStmt.finalize();
              console.log('SmartBrowz historical logs seeded successfully.');
            }
          });

          // Safety fallback: resolve ready after 3s even if callbacks didn't fire
          setTimeout(() => {
            if (!this._initDone) {
              this._initDone = true;
              if (this._readyResolve) this._readyResolve();
              console.log('Database initialization complete (fallback).');
            }
          }, 3000);
        });
      }
    });
  }

  datastore() {
    return {
      table: (tableName) => new DatastoreTable(this.db, tableName),
      execute: async (sql, params = []) => {
        return new Promise((resolve, reject) => {
          this.db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      },
      run: async (sql, params = []) => {
        return new Promise((resolve, reject) => {
          this.db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        });
      }
    };
  }

  zia() {
    return {
      translate: async (text, fromLang, toLang) => {
        const f = fromLang.toLowerCase();
        const t = toLang.toLowerCase();
        
        // Expanded police/legal Kannada dictionary (~100+ essential terms)
        const enToKn = {
          // Core Police Terms
          "where": "ಎಲ್ಲಿ", "crime": "ಅಪರಾಧ", "cyber": "ಸೈಬರ್", "theft": "ಕಳ್ಳತನ",
          "fraud": "ವಂಚನೆ", "organized": "ಸಂಘಟಿತ", "accused": "ಆರೋಪಿ",
          "victim": "ಸಂತ್ರಸ್ತ", "police": "ಪೊಲೀಸ್", "station": "ಠಾಣೆ",
          "risk": "ಅಪಾಯ", "score": "ಅಂಕ", "show": "ತೋರಿಸಿ", "map": "ನಕ್ಷೆ",
          "history": "ಇತಿಹಾಸ", "murder": "ಕೊಲೆ", "robbery": "ದರೋಡೆ",
          "assault": "ಹಲ್ಲೆ", "kidnapping": "ಅಪಹರಣ", "arrest": "ಬಂಧನ",
          "bail": "ಜಾಮೀನು", "warrant": "ವಾರಂಟ್", "evidence": "ಸಾಕ್ಷ್ಯ",
          "witness": "ಸಾಕ್ಷಿ", "court": "ನ್ಯಾಯಾಲಯ", "judge": "ನ್ಯಾಯಾಧೀಶ",
          "investigation": "ತನಿಖೆ", "complaint": "ದೂರು", "charge": "ಆರೋಪ",
          "conviction": "ಶಿಕ್ಷೆ", "acquittal": "ಖುಲಾಸೆ", "sentence": "ಶಿಕ್ಷೆ",
          "imprisonment": "ಸೆರೆವಾಸ", "fine": "ದಂಡ", "parole": "ಪೆರೋಲ್",
          "remand": "ನ್ಯಾಯಾಂಗ ಬಂಧನ", "suspect": "ಶಂಕಿತ", "informant": "ಮಾಹಿತಿದಾರ",
          "patrol": "ಗಸ್ತು", "raid": "ದಾಳಿ", "seizure": "ವಶಪಡಿಸಿಕೊಳ್ಳುವಿಕೆ",
          "forensic": "ವಿಧಿವಿಜ್ಞಾನ", "autopsy": "ಮರಣೋತ್ತರ ಪರೀಕ್ಷೆ",
          "fingerprint": "ಬೆರಳಚ್ಚು", "dna": "ಡಿಎನ್ಎ", "weapon": "ಆಯುಧ",
          "firearm": "ಬಂದೂಕು", "drug": "ಮಾದಕ ವಸ್ತು", "smuggling": "ಕಳ್ಳಸಾಗಣೆ",
          "extortion": "ಸುಲಿಗೆ", "bribery": "ಲಂಚ", "corruption": "ಭ್ರಷ್ಟಾಚಾರ",
          "gang": "ಗ್ಯಾಂಗ್", "syndicate": "ಸಿಂಡಿಕೇಟ್", "network": "ಜಾಲ",
          "district": "ಜಿಲ್ಲೆ", "superintendent": "ಅಧೀಕ್ಷಕ", "inspector": "ಇನ್ಸ್ಪೆಕ್ಟರ್",
          "constable": "ಕಾನ್ಸ್ಟೇಬಲ್", "commissioner": "ಆಯುಕ್ತ",
          "report": "ವರದಿ", "statement": "ಹೇಳಿಕೆ", "confession": "ತಪ್ಪೊಪ್ಪಿಗೆ",
          "search": "ಹುಡುಕಾಟ", "surveillance": "ಕಣ್ಗಾವಲು", "intelligence": "ಗುಪ್ತಚರ",
          "alert": "ಎಚ್ಚರಿಕೆ", "warning": "ಎಚ್ಚರಿಕೆ", "danger": "ಅಪಾಯ",
          "safe": "ಸುರಕ್ಷಿತ", "emergency": "ತುರ್ತು", "help": "ಸಹಾಯ",
          "law": "ಕಾನೂನು", "order": "ಆದೇಶ", "section": "ಸೆಕ್ಷನ್",
          "offense": "ಅಪರಾಧ", "criminal": "ಅಪರಾಧಿ", "case": "ಪ್ರಕರಣ",
          "file": "ಕಡತ", "register": "ನೋಂದಣಿ", "transfer": "ವರ್ಗಾವಣೆ",
          "prison": "ಕಾರಾಗೃಹ", "jail": "ಜೈಲು", "hearing": "ವಿಚಾರಣೆ",
          "trial": "ವಿಚಾರಣೆ", "appeal": "ಮೇಲ್ಮನವಿ", "petition": "ಅರ್ಜಿ",
          // Karnataka Places
          "bengaluru": "ಬೆಂಗಳೂರು", "mysuru": "ಮೈಸೂರು", "hubli": "ಹುಬ್ಬಳ್ಳಿ",
          "mangaluru": "ಮಂಗಳೂರು", "belagavi": "ಬೆಳಗಾವಿ", "dharwad": "ಧಾರವಾಡ",
          "gulbarga": "ಗುಲ್ಬರ್ಗಾ", "karnataka": "ಕರ್ನಾಟಕ",
          // Common Action Words
          "find": "ಹುಡುಕಿ", "get": "ಪಡೆಯಿರಿ", "tell": "ಹೇಳಿ", "give": "ಕೊಡಿ",
          "open": "ತೆರೆಯಿರಿ", "close": "ಮುಚ್ಚಿ", "start": "ಪ್ರಾರಂಭಿಸಿ",
          "stop": "ನಿಲ್ಲಿಸಿ", "yes": "ಹೌದು", "no": "ಇಲ್ಲ",
          // Numbers & Time
          "today": "ಇಂದು", "yesterday": "ನಿನ್ನೆ", "tomorrow": "ನಾಳೆ",
          "month": "ತಿಂಗಳು", "year": "ವರ್ಷ", "total": "ಒಟ್ಟು"
        };

        // Build reverse mapping automatically
        const knToEn = {};
        Object.entries(enToKn).forEach(([en, kn]) => { knToEn[kn] = en; });

        if (f === 'en' && t === 'kn') {
          const words = text.toLowerCase().split(/\s+/);
          const translated = words.map(w => enToKn[w] || w).join(' ');
          return `ಕನ್ನಡ ಅನುವಾದ: ${translated}`;
        }
        
        if (f === 'kn' && t === 'en') {
          const words = text.split(/\s+/);
          const translated = words.map(w => knToEn[w] || w).join(' ');
          return translated;
        }

        return text;
      },
      speechToText: async () => {
        return "Show me cyber crime incidents in Bengaluru City";
      },
      textToSpeech: async (text) => {
        return "UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
      }
    };
  }

  quickML() {
    return {
      rag: {
        retrieve: async (queryText, limit = 5) => {
          // Concept vector simulation: 7 concept dimensions
          // [Cyber, Theft, Organized Crime, Financial Fraud, Bengaluru, Mysuru, Hubballi]
          const getConceptVector = (text) => {
            const t = text.toLowerCase();
            const vector = [0, 0, 0, 0, 0, 0, 0];
            const keywords = [
              [/online|phishing|cyber|hack|otp|email|fraud|digital|compromise|credential/g, 0],
              [/theft|steal|stole|robbery|break|gold|lock|house|shop|loot|burglary/g, 1],
              [/gang|syndicate|extortion|threat|weapon|assault|homicide|kidnap|murder|accomplice/g, 2],
              [/transaction|money|bank|account|hawala|transfer|cash|card|audit|invoice|lakh|crore/g, 3],
              [/bengaluru|bangalore|majestic|indiranagar|soudha|koramangala/g, 4],
              [/mysuru|mysore|chamundi/g, 5],
              [/hubli|hubballi|keshwapur|gokul/g, 6]
            ];
            keywords.forEach(([regex, index]) => {
              const matches = t.match(regex);
              if (matches) {
                vector[index] = matches.length;
              }
            });
            const mag = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
            if (mag === 0) return [1/Math.sqrt(7), 1/Math.sqrt(7), 1/Math.sqrt(7), 1/Math.sqrt(7), 1/Math.sqrt(7), 1/Math.sqrt(7), 1/Math.sqrt(7)];
            return vector.map(v => v / mag);
          };

          const db = this.datastore();
          const allFirs = await db.execute("SELECT * FROM FIR");
          const queryVector = getConceptVector(queryText);
          
          const results = allFirs.map(fir => {
            const docText = `${fir.crime_type} ${fir.description} ${fir.modus_operandi} ${fir.district}`;
            const docVector = getConceptVector(docText);
            // Dot product gives cosine similarity since vectors are pre-normalized
            const similarity = queryVector.reduce((sum, val, idx) => sum + val * docVector[idx], 0);
            return {
              ...fir,
              similarity_score: parseFloat(similarity.toFixed(3))
            };
          });

          // Sort descending by similarity
          results.sort((a, b) => b.similarity_score - a.similarity_score);
          return results.slice(0, limit);
        }
      }
    };
  }

  smartBrowz() {
    return {
      generatePdfFromHtml: async (htmlContent) => {
        // Simulate PDF export by returning a base64 encoded mock PDF string
        return Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 50 >>\nstream\nBT /F1 12 Tf 70 700 Td (KSP Intelligence Report PDF Export) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000203 00000 n\ntrailer\n<< /Size 5 >>\nstartxref\n302\n%%EOF");
      }
    };
  }
}

let _instance = null;

module.exports = {
  getInitializer: () => {
    if (!_instance) {
      _instance = new CatalystInstance();
    }
    return _instance;
  },
  waitForReady: () => {
    if (!_instance) return Promise.resolve();
    return _instance.ready || Promise.resolve();
  }
};
