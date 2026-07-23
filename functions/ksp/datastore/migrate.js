const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'ksp_crime.db');
const MIGRATION_PATH = path.join(__dirname, 'migrations', '001_canonical_schema.sql');

async function runMigration() {
  console.log('--- Running Phase 2 Canonical Schema Migration ---');
  if (!fs.existsSync(DB_PATH)) {
    console.log(`Database at ${DB_PATH} not found. Skipping SQLite file migration.`);
    return;
  }

  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const db = new sqlite3.Database(DB_PATH);

  db.exec(sql, async (err) => {
    if (err) {
      console.error('Migration failed:', err);
      process.exit(1);
    }
    console.log('✓ Phase 2 Canonical Schema Created Successfully');

    // Populate CaseMaster and CaseSourceMap from existing FIR records if needed
    db.all("SELECT * FROM FIR", [], (err, rows) => {
      if (err) {
        console.error('Error fetching FIRs:', err);
        db.close();
        return;
      }
      console.log(`Found ${rows.length} FIR records to evaluate for CaseMaster bridging.`);

      let migratedCount = 0;
      let completed = 0;

      if (rows.length === 0) {
        db.close();
        return;
      }

      rows.forEach((fir) => {
        const caseId = `KSP-CM-${fir.fir_number}`;
        
        db.get("SELECT id FROM CaseMaster WHERE fir_number = ?", [fir.fir_number], (err, existing) => {
          if (existing) {
            completed++;
            if (completed === rows.length) {
              console.log(`✓ CaseMaster bridging verified (${migratedCount} new bridges created).`);
              db.close();
            }
            return;
          }

          db.run(`
            INSERT INTO CaseMaster (case_id, fir_number, district, police_station, crime_type, status, date_reported, date_occurrence, description, modus_operandi)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            caseId, fir.fir_number, fir.district, fir.police_station, fir.crime_type,
            fir.status, fir.date_reported, fir.date_occurrence, fir.description, fir.modus_operandi
          ], function(err) {
            if (!err) {
              const caseMasterId = this.lastID;
              db.run(`
                INSERT INTO CaseSourceMap (fir_id, case_master_id)
                VALUES (?, ?)
              `, [fir.id, caseMasterId]);
              migratedCount++;
            }

            completed++;
            if (completed === rows.length) {
              console.log(`✓ CaseMaster bridging complete (${migratedCount} new bridges created).`);
              db.close();
            }
          });
        });
      });
    });
  });
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
