const express = require('express');
const cors = require('cors');
const path = require('path');
const authMiddleware = require('./auth-middleware/index');

// Load function modules
const chatHandler = require('./chat-handler/index');
const translate = require('./translate/index');
const voice = require('./voice/index');
const pdfExport = require('./pdf-export/index');
const anomalyDetection = require('./anomaly-detection/index');
const catalyst = require('./shared/catalyst-sdk').getInitializer();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(authMiddleware);

// --- REST API ENDPOINTS ---

// 1. Chat Conversation Orchestrator
app.post('/api/chat', async (req, res) => {
  const { query, sessionId } = req.body;
  if (!query) {
    return res.status(400).json({ success: false, error: "Missing 'query' in request body." });
  }

  const { userId, role } = req.user;
  const ipAddress = req.ip || req.headers['x-forwarded-for'];
  
  const result = await chatHandler(query, userId, role, ipAddress, sessionId);
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

// 2. Zia Translation Direct Endpoint
app.post('/api/translate', async (req, res) => {
  const { text, fromLanguage, toLanguage } = req.body;
  if (!text || !fromLanguage || !toLanguage) {
    return res.status(400).json({ success: false, error: "Missing required translate parameters." });
  }

  const result = await translate(text, fromLanguage, toLanguage);
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

// 3. Zia Voice Services (STT / TTS)
app.post('/api/voice', async (req, res) => {
  const { action, text } = req.body;
  if (!action) {
    return res.status(400).json({ success: false, error: "Missing action field." });
  }

  const result = await voice(action, text);
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

// 4. SmartBrowz PDF Generation
app.post('/api/pdf-export', async (req, res) => {
  const { htmlContent } = req.body;
  if (!htmlContent) {
    return res.status(400).json({ success: false, error: "Missing htmlContent." });
  }

  const result = await pdfExport(htmlContent);
  if (result.success) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=ksp-report.pdf');
    res.send(Buffer.from(result.pdfBase64, 'base64'));
  } else {
    res.status(500).json(result);
  }
});

// 5. Zia AutoML Anomaly Detection Endpoint
app.get('/api/anomalies', async (req, res) => {
  const result = await anomalyDetection();
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

// 6. Supervisor Audit Logs Fetcher
app.get('/api/audit-logs', async (req, res) => {
  try {
    const db = catalyst.datastore();
    const logs = await db.execute("SELECT * FROM AuditLog ORDER BY timestamp DESC LIMIT 50");
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6b. Supervisor Compliance Override Note Writer
app.post('/api/audit-logs/override', async (req, res) => {
  try {
    const { alertTitle, reason, justification } = req.body;
    const { userId, role } = req.user;
    const db = catalyst.datastore();
    
    const queryText = `OVERRIDE FLAG: "${alertTitle}"`;
    const actionTaken = `Resolved: ${reason}. Justification: ${justification}`;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    
    await db.execute(
      "INSERT INTO AuditLog (user_id, role, query_text, action_taken, timestamp, ip_address, data_classification) VALUES (?, ?, ?, ?, datetime('now'), ?, 'Secret')",
      [userId, role, queryText, actionTaken, ipAddress]
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Case details fetcher
app.get('/api/fir/:firNumber', async (req, res) => {
  try {
    const { firNumber } = req.params;
    const db = catalyst.datastore();

    const firs = await db.execute("SELECT * FROM FIR WHERE fir_number = ?", [firNumber]);
    if (firs.length === 0) {
      return res.status(404).json({ success: false, error: "FIR not found" });
    }

    const fir = firs[0];
    const accused = await db.execute("SELECT * FROM Accused WHERE fir_id = ?", [fir.id]);
    const victims = await db.execute("SELECT * FROM Victim WHERE fir_id = ?", [fir.id]);
    const locations = await db.execute("SELECT * FROM Location WHERE fir_id = ?", [fir.id]);

    res.json({
      success: true,
      case: {
        ...fir,
        accused,
        victims,
        location: locations[0] || null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Financial trail for a specific FIR
app.get('/api/financial/:firId', async (req, res) => {
  try {
    const { firId } = req.params;
    const financialAnalysis = require('./financial-analysis/index');
    const result = await financialAnalysis(firId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Similar cases for a specific FIR
app.get('/api/similar/:firId', async (req, res) => {
  try {
    const { firId } = req.params;
    const similarCases = require('./similar-cases/index');
    const result = await similarCases(firId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Crime forecasts
app.get('/api/forecasts', async (req, res) => {
  try {
    const db = catalyst.datastore();
    const forecasts = await db.execute("SELECT * FROM CrimeForecast ORDER BY forecast_date ASC");
    res.json({ success: true, forecasts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Socio-demographic overview
app.get('/api/socio-demographics', async (req, res) => {
  try {
    const db = catalyst.datastore();
    
    const ageGroups = await db.execute(`
      SELECT 
        CASE 
          WHEN age < 18 THEN 'Juvenile (<18)'
          WHEN age BETWEEN 18 AND 25 THEN 'Young Adult (18-25)'
          WHEN age BETWEEN 26 AND 35 THEN 'Adult (26-35)'
          WHEN age BETWEEN 36 AND 50 THEN 'Middle-Aged (36-50)'
          ELSE 'Senior (50+)'
        END as age_group,
        COUNT(*) as count
      FROM Accused
      GROUP BY age_group
      ORDER BY count DESC
    `);

    const genderSplit = await db.execute(`
      SELECT gender, COUNT(*) as count
      FROM Accused
      GROUP BY gender
      ORDER BY count DESC
    `);

    const educationLevels = await db.execute(`
      SELECT education_level, COUNT(*) as count
      FROM Accused
      WHERE education_level IS NOT NULL
      GROUP BY education_level
      ORDER BY count DESC
    `);

    const migrationStatus = await db.execute(`
      SELECT 
        migration_status as status,
        COUNT(*) as count
      FROM Accused
      GROUP BY status
    `);

    const socioCorrelation = await db.execute(`
      SELECT s.district, s.unemployment_rate, s.literacy_rate, s.poverty_index,
             COUNT(f.id) as crime_count
      FROM SocioEconomicIndicators s
      LEFT JOIN FIR f ON s.district = f.district
      GROUP BY s.district
      ORDER BY crime_count DESC
    `);

    res.json({
      success: true,
      demographics: {
        ageGroups,
        genderSplit,
        educationLevels,
        migrationStatus
      },
      socioCorrelation
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. Multimodal Vernacular OCR Direct Analyzer
app.post('/api/ocr/analyze', async (req, res) => {
  try {
    const { fileName, fileType, base64Data } = req.body;
    const ocrAnalysis = require('./ocr/index');
    const result = await ocrAnalysis(fileName, fileType, base64Data);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. CDR Cellular Timeline Tracker
app.get('/api/cdr/timeline', async (req, res) => {
  try {
    const { suspect } = req.query;
    const cdrAnalysis = require('./cdr/index');
    const result = await cdrAnalysis(suspect);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. Zia Vision Biometric Facial Search
app.post('/api/biometrics/search', async (req, res) => {
  try {
    const { name } = req.body;
    const biometricSearch = require('./biometrics/index');
    const result = await biometricSearch(name);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. Emergency Patrol Dispatch Unit List
app.get('/api/dispatch/units', async (req, res) => {
  try {
    const units = [
      { id: "PATROL-101", vehicle: "KA-02-G-4102 (Bengaluru City)", lat: 12.9720, lng: 77.5850, status: "Available", officer: "SI Sandeep Patil" },
      { id: "PATROL-102", vehicle: "KA-01-G-7788 (Bengaluru City)", lat: 12.9550, lng: 77.6100, status: "Busy", officer: "SI Priya Gowda" },
      { id: "PATROL-201", vehicle: "KA-09-G-1212 (Mysuru)", lat: 12.3010, lng: 76.6450, status: "Available", officer: "SI Manjunath K." },
      { id: "PATROL-301", vehicle: "KA-25-G-0033 (Hubballi)", lat: 15.3680, lng: 75.1200, status: "Available", officer: "SI Satish Naik" },
      { id: "PATROL-401", vehicle: "KA-19-G-4455 (Mangaluru)", lat: 12.9150, lng: 74.8500, status: "Available", officer: "SI Harish Poojary" }
    ];
    res.json({ success: true, units });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. Collaborative Workspace Get state
app.get('/api/workspace', async (req, res) => {
  try {
    const db = catalyst.datastore();
    const pinned = await db.execute("SELECT * FROM SharedWorkspace ORDER BY pinned_at DESC");
    const notesResult = await db.execute("SELECT * FROM SharedNotes ORDER BY updated_at DESC LIMIT 1");
    res.json({
      success: true,
      pinned,
      notes: notesResult.length > 0 ? notesResult[0].notes : ""
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17. Collaborative Workspace Pin Action
app.post('/api/workspace/pin', async (req, res) => {
  try {
    const { assetType, assetId, details } = req.body;
    if (!assetType || !assetId) {
      return res.status(400).json({ success: false, error: "Missing assetType or assetId." });
    }

    const db = catalyst.datastore();
    
    // Check if already pinned
    const existing = await db.execute(
      "SELECT * FROM SharedWorkspace WHERE asset_type = ? AND asset_id = ?",
      [assetType, assetId]
    );

    if (existing.length > 0) {
      // Unpin
      await db.execute(
        "DELETE FROM SharedWorkspace WHERE asset_type = ? AND asset_id = ?",
        [assetType, assetId]
      );
      res.json({ success: true, pinned: false });
    } else {
      // Pin
      await db.execute(
        "INSERT INTO SharedWorkspace (asset_type, asset_id, details, pinned_at) VALUES (?, ?, ?, datetime('now'))",
        [assetType, assetId, details || ""]
      );
      res.json({ success: true, pinned: true });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 18. Collaborative Workspace Notes updater
app.post('/api/workspace/notes', async (req, res) => {
  try {
    const { notes } = req.body;
    if (notes === undefined) {
      return res.status(400).json({ success: false, error: "Missing notes field." });
    }

    const db = catalyst.datastore();
    const existing = await db.execute("SELECT * FROM SharedNotes ORDER BY id ASC LIMIT 1");
    if (existing.length > 0) {
      await db.execute(
        "UPDATE SharedNotes SET notes = ?, updated_at = datetime('now') WHERE id = ?",
        [notes, existing[0].id]
      );
    } else {
      await db.execute(
        "INSERT INTO SharedNotes (notes, updated_at) VALUES (?, datetime('now'))",
        [notes]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 19. CCTNS Scheduler Logs Fetcher
app.get('/api/cctns/runs', async (req, res) => {
  try {
    const db = catalyst.datastore();
    const runs = await db.execute("SELECT * FROM CCTNS_SyncJobs ORDER BY timestamp DESC LIMIT 40");
    res.json({ success: true, runs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 20. CCTNS Manual Sync trigger
app.post('/api/cctns/sync', async (req, res) => {
  try {
    const { triggerType } = req.body; // 'Manual' or 'Automatic'
    const db = catalyst.datastore();
    
    const delay = 1000 + Math.floor(Math.random() * 1000);
    const records = Math.floor(Math.random() * 25);
    const successStatus = Math.random() > 0.15 ? 'SUCCESS' : 'FAILED';
    const finalRecords = successStatus === 'SUCCESS' ? records : 0;
    
    await db.execute(
      "INSERT INTO CCTNS_SyncJobs (timestamp, trigger_type, status, latency_ms, records_ingested) VALUES (datetime('now'), ?, ?, ?, ?)",
      [triggerType || 'Manual', successStatus, delay, finalRecords]
    );

    res.json({
      success: true,
      job: {
        timestamp: new Date().toISOString(),
        trigger_type: triggerType || 'Manual',
        status: successStatus,
        latency_ms: delay,
        records_ingested: finalRecords
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 21. Warrant Desk — List all FIRs with case metadata and risk scores
app.get('/api/warrants', async (req, res) => {
  try {
    const db = catalyst.datastore();
    const rows = await db.execute(`
      SELECT 
        f.id,
        f.fir_number,
        f.district,
        f.police_station,
        f.crime_type,
        f.status,
        f.date_occurrence,
        (SELECT name FROM Victim WHERE fir_id = f.id LIMIT 1) AS complainant_name,
        CAST(julianday('now') - julianday(f.date_occurrence) AS INTEGER) AS days_open,
        (SELECT COUNT(*) FROM Accused WHERE fir_id = f.id) AS accused_count,
        COALESCE(
          (SELECT MAX(a.risk_score) FROM Accused a WHERE a.fir_id = f.id), 0
        ) AS max_risk_score
      FROM FIR f
      ORDER BY days_open DESC
      LIMIT 200
    `);
    res.json({ success: true, warrants: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 22. Warrant Desk — Bulk status update
app.patch('/api/warrants/bulk', async (req, res) => {
  try {
    const { firIds, newStatus, assignedOfficer, urgencyNote } = req.body;
    const { userId, role } = req.user;
    if (!firIds || !Array.isArray(firIds) || firIds.length === 0) {
      return res.status(400).json({ success: false, error: 'firIds array is required.' });
    }
    const db = catalyst.datastore();
    // Update each FIR status
    for (const firId of firIds) {
      await db.execute(
        "UPDATE FIR SET status = ? WHERE id = ?",
        [newStatus || 'Under Review', firId]
      );
      // Audit log the action
      await db.execute(
        "INSERT INTO AuditLog (user_id, role, query_text, action_taken, ip_address, data_classification) VALUES (?, ?, ?, ?, ?, ?)",
        [
          userId, role,
          `BULK_WARRANT_UPDATE fir_id=${firId}`,
          `Status changed to '${newStatus}'${assignedOfficer ? ` | Assigned: ${assignedOfficer}` : ''}${urgencyNote ? ` | Note: ${urgencyNote}` : ''}`,
          'system', 'SENSITIVE'
        ]
      );
    }
    res.json({ success: true, updated: firIds.length, newStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(` Catalyst Functions Server running on port ${PORT}`);
  console.log(` Connect to: http://localhost:${PORT}`);
  console.log(`========================================================`);
});
