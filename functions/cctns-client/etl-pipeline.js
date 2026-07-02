/**
 * CCTNS ETL Pipeline for KSP Portal
 * Phase 3: Extract-Transform-Load pipeline for CCTNS data synchronization
 */
const cctnsClient = require('./index');
const catalyst = require('../shared/catalyst-sdk').getInitializer();

/**
 * Run a full ETL sync cycle
 * @param {string} triggerType — 'Manual' or 'Automatic'
 * @returns {Object} sync result with metrics
 */
async function runSync(triggerType = 'Manual') {
  const startTime = Date.now();
  const db = catalyst.datastore();
  let recordsIngested = 0;
  let errors = [];
  let status = 'SUCCESS';

  try {
    // ---- EXTRACT ----
    const lastSync = await getLastSyncTimestamp(db);
    const firResult = await cctnsClient.fetchNewFIRs(lastSync);
    const warrantResult = await cctnsClient.fetchWarrantStatus();

    // ---- TRANSFORM & LOAD ----
    if (firResult.success && firResult.firs) {
      for (const fir of firResult.firs) {
        try {
          // Deduplicate: skip if FIR already exists
          const existing = await db.execute("SELECT id FROM FIR WHERE fir_number = ?", [fir.fir_number]);
          if (existing.length > 0) continue;

          // Validate required fields
          if (!fir.fir_number || !fir.district || !fir.crime_type) {
            errors.push(`Invalid FIR record: missing required fields for ${fir.fir_number || 'unknown'}`);
            continue;
          }

          // Insert new FIR (CCTNS is source of truth)
          await db.run(
            `INSERT INTO FIR (fir_number, district, police_station, crime_type, status, date_reported, date_occurrence, description, modus_operandi)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [fir.fir_number, fir.district, fir.police_station || `${fir.district} PS`, fir.crime_type,
             fir.status || 'Under Investigation', fir.date_reported, fir.date_occurrence || fir.date_reported,
             fir.description || 'CCTNS synced record', fir.modus_operandi || 'Pending analysis']
          );
          recordsIngested++;
        } catch (e) {
          errors.push(`Failed to ingest ${fir.fir_number}: ${e.message}`);
        }
      }
    }

    // Process warrant updates
    if (warrantResult.success && warrantResult.warrants) {
      for (const warrant of warrantResult.warrants) {
        try {
          const firRows = await db.execute("SELECT id FROM FIR WHERE fir_number = ?", [warrant.fir_number]);
          if (firRows.length > 0) {
            const existingWarrant = await db.execute(
              "SELECT id FROM Warrants WHERE fir_id = ? AND warrant_type = ?",
              [firRows[0].id, warrant.type]
            );
            if (existingWarrant.length === 0) {
              await db.run(
                `INSERT INTO Warrants (fir_id, warrant_type, issued_date, issued_by_court, status)
                 VALUES (?, ?, datetime('now'), ?, ?)`,
                [firRows[0].id, warrant.type, warrant.issued_by || 'Unknown Court', warrant.status || 'Pending']
              );
              recordsIngested++;
            }
          }
        } catch (e) {
          errors.push(`Warrant sync error for ${warrant.fir_number}: ${e.message}`);
        }
      }
    }

    if (errors.length > 0 && recordsIngested === 0) {
      status = 'FAILED';
    } else if (errors.length > 0) {
      status = 'PARTIAL';
    }

  } catch (err) {
    status = 'FAILED';
    errors.push(err.message);
  }

  const latency = Date.now() - startTime;

  // Log sync job result
  try {
    await db.run(
      "INSERT INTO CCTNS_SyncJobs (timestamp, trigger_type, status, latency_ms, records_ingested) VALUES (datetime('now'), ?, ?, ?, ?)",
      [triggerType, status, latency, recordsIngested]
    );
  } catch (logErr) {
    console.error('Failed to log sync job:', logErr);
  }

  return {
    success: status !== 'FAILED',
    job: {
      timestamp: new Date().toISOString(),
      trigger_type: triggerType,
      status,
      latency_ms: latency,
      records_ingested: recordsIngested,
      errors: errors.length > 0 ? errors : undefined,
      mode: cctnsClient.isLiveMode() ? 'PRODUCTION' : 'SIMULATED'
    }
  };
}

/**
 * Get the timestamp of the last successful sync
 */
async function getLastSyncTimestamp(db) {
  try {
    const rows = await db.execute(
      "SELECT timestamp FROM CCTNS_SyncJobs WHERE status IN ('SUCCESS','PARTIAL') ORDER BY id DESC LIMIT 1"
    );
    return rows.length > 0 ? rows[0].timestamp : null;
  } catch (e) {
    return null;
  }
}

module.exports = { runSync };
