const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('./auth-middleware/index');
const { generateToken, verifyToken, refreshToken, verifyPassword } = require('./auth-middleware/jwt-utils');
const { getRLSFilter, getUserScope } = require('./auth-middleware/rls-filter');
const writeAuditLog = require('./audit-log/index');

// Load function modules
const chatHandler = require('./chat-handler/index');
const translate = require('./translate/index');
const voice = require('./voice/index');
const pdfExport = require('./pdf-export/index');
const anomalyDetection = require('./anomaly-detection/index');
const smartBrowz = require('./smartbrowz/index');
const catalyst = require('./shared/catalyst-sdk').getInitializer();
const health = require('./health/index');
const ecourts = require('./ecourts-client/index');
const eprisons = require('./eprisons-client/index');
const evidenceVault = require('./evidence-vault/index');
const cctnsEtl = require('./cctns-client/etl-pipeline');

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Rate Limiting Middleware
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: {
    success: false,
    error: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use('/api', limiter);
app.use(authMiddleware);

// --- AUTHENTICATION ENDPOINTS ---

// 1a. User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { badgeId, password } = req.body;
    if (!badgeId || !password) {
      return res.status(400).json({ success: false, error: 'Badge ID and password are required.' });
    }

    const db = catalyst.datastore();
    const rows = await db.execute("SELECT * FROM Officers WHERE badge_id = ? AND is_active = 1", [badgeId.toUpperCase().trim()]);
    
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Authentication failed. Invalid credentials.' });
    }

    const officer = rows[0];
    
    // Check account lockout
    if (officer.locked_until && new Date(officer.locked_until) > new Date()) {
      return res.status(403).json({
        success: false,
        error: `Account locked due to excessive failed attempts. Locked until: ${new Date(officer.locked_until).toLocaleTimeString()}`
      });
    }

    const isMatch = verifyPassword(password, officer.password_hash);
    if (!isMatch) {
      const failedAttempts = (officer.failed_login_attempts || 0) + 1;
      let lockedUntil = null;
      if (failedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins lock
      }
      await db.run(
        "UPDATE Officers SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
        [failedAttempts, lockedUntil, officer.id]
      );

      return res.status(401).json({
        success: false,
        error: 'Authentication failed. Invalid credentials.'
      });
    }

    // Reset failed attempts
    await db.run(
      "UPDATE Officers SET failed_login_attempts = 0, locked_until = NULL, last_login = datetime('now') WHERE id = ?",
      [officer.id]
    );

    const token = generateToken(officer);
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    await writeAuditLog(officer.badge_id, officer.role, 'USER_LOGIN', 'Login successful', ipAddress);

    res.json({
      success: true,
      token,
      user: {
        userId: officer.badge_id,
        name: officer.name,
        rank: officer.rank,
        role: officer.role,
        district: officer.district,
        policeStation: officer.police_station
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1b. Token Refresh
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required.' });
    }

    const newToken = refreshToken(token);
    if (newToken) {
      res.json({ success: true, token: newToken });
    } else {
      res.status(400).json({ success: false, error: 'Token not in refresh window or invalid.' });
    }
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});


// --- REST API ENDPOINTS ---

// 1. Chat Conversation Orchestrator
app.post('/api/chat', async (req, res) => {
  try {
    const { query, sessionId } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: "Missing 'query' in request body." });
    }

    const { userId, role } = req.user;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    
    const result = await chatHandler(query, userId, role, ipAddress, sessionId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1c. Chat Conversation Streaming Orchestrator (SSE)
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { query, sessionId } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: "Missing 'query' in request body." });
    }

    const { userId, role } = req.user;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Call chatHandler with onStream callback
    const result = await chatHandler(query, userId, role, ipAddress, sessionId, (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    if (result.success) {
      res.write(`data: ${JSON.stringify({ type: 'done', narrative: result.narrative, llmMode: result.llmMode })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: result.error })}\n\n`);
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

// 2. Zia Translation Direct Endpoint
app.post('/api/translate', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Zia Voice Services (STT / TTS)
app.post('/api/voice', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. SmartBrowz PDF Generation
app.post('/api/pdf-export', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Zia AutoML Anomaly Detection Endpoint
app.get('/api/anomalies', async (req, res) => {
  try {
    const result = await anomalyDetection();
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Supervisor Audit Logs Fetcher (Restricted to Supervisor / Policymaker)
app.get('/api/audit-logs', async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'Supervisor' && role !== 'Policymaker') {
      return res.status(403).json({ success: false, error: 'Forbidden: Access restricted to Supervisors and Policymakers.' });
    }

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
    const { role } = req.user;
    if (role !== 'Supervisor' && role !== 'Policymaker') {
      return res.status(403).json({ success: false, error: 'Forbidden: Access restricted to Supervisors and Policymakers.' });
    }

    const { alertTitle, reason, justification } = req.body;
    const { userId } = req.user;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    
    const queryText = `OVERRIDE FLAG: "${alertTitle}"`;
    const actionTaken = `Resolved: ${reason}. Justification: ${justification}`;
    
    await writeAuditLog(userId, role, queryText, actionTaken, ipAddress);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Case details fetcher (RLS Enforced)
app.get('/api/fir/:firNumber', async (req, res) => {
  try {
    const { firNumber } = req.params;
    const db = catalyst.datastore();

    const { clause, params } = getRLSFilter(req.user, 'f');
    const firs = await db.execute(`SELECT * FROM FIR f WHERE f.fir_number = ? ${clause}`, [firNumber, ...params]);
    if (firs.length === 0) {
      return res.status(404).json({ success: false, error: "FIR not found or Access Denied." });
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

// 8. Financial trail for a specific FIR (RLS Enforced)
app.get('/api/financial/:firId', async (req, res) => {
  try {
    const { firId } = req.params;
    const db = catalyst.datastore();
    
    // RLS Enforcement
    const { clause, params } = getRLSFilter(req.user, 'f');
    const fir = await db.execute(`SELECT id FROM FIR f WHERE f.id = ? ${clause}`, [firId, ...params]);
    if (fir.length === 0) {
      return res.status(403).json({ success: false, error: 'Access Denied: You do not have permission to access records for this FIR.' });
    }

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

// 9. Similar cases for a specific FIR (RLS Enforced)
app.get('/api/similar/:firId', async (req, res) => {
  try {
    const { firId } = req.params;
    const db = catalyst.datastore();
    
    // RLS Enforcement
    const { clause, params } = getRLSFilter(req.user, 'f');
    const fir = await db.execute(`SELECT id FROM FIR f WHERE f.id = ? ${clause}`, [firId, ...params]);
    if (fir.length === 0) {
      return res.status(403).json({ success: false, error: 'Access Denied: You do not have permission to access records for this FIR.' });
    }

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

// 10. Crime forecasts (RLS Enforced)
app.get('/api/forecasts', async (req, res) => {
  try {
    const db = catalyst.datastore();
    const { clause, params } = getRLSFilter(req.user, 'cf', 'district', 'district');
    const forecasts = await db.execute(`SELECT * FROM CrimeForecast cf WHERE 1=1 ${clause} ORDER BY forecast_date ASC`, params);
    res.json({ success: true, forecasts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Socio-demographic overview (RLS Enforced)
app.get('/api/socio-demographics', async (req, res) => {
  try {
    const db = catalyst.datastore();
    const { clause: rlsClause, params: rlsParams } = getRLSFilter(req.user, 'f');
    
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
      FROM Accused a
      JOIN FIR f ON a.fir_id = f.id
      WHERE 1=1 ${rlsClause}
      GROUP BY age_group
      ORDER BY count DESC
    `, rlsParams);

    const genderSplit = await db.execute(`
      SELECT gender, COUNT(*) as count
      FROM Accused a
      JOIN FIR f ON a.fir_id = f.id
      WHERE 1=1 ${rlsClause}
      GROUP BY gender
      ORDER BY count DESC
    `, rlsParams);

    const educationLevels = await db.execute(`
      SELECT education_level, COUNT(*) as count
      FROM Accused a
      JOIN FIR f ON a.fir_id = f.id
      WHERE education_level IS NOT NULL ${rlsClause}
      GROUP BY education_level
      ORDER BY count DESC
    `, rlsParams);

    const migrationStatus = await db.execute(`
      SELECT 
        migration_status as status,
        COUNT(*) as count
      FROM Accused a
      JOIN FIR f ON a.fir_id = f.id
      WHERE 1=1 ${rlsClause}
      GROUP BY status
    `, rlsParams);

    // Apply filter on SocioEconomicIndicators
    const { clause: socioClause, params: socioParams } = getRLSFilter(req.user, 's', 'district', 'district');
    const socioCorrelation = await db.execute(`
      SELECT s.district, s.unemployment_rate, s.literacy_rate, s.poverty_index,
             COUNT(f.id) as crime_count
      FROM SocioEconomicIndicators s
      LEFT JOIN FIR f ON s.district = f.district
      WHERE 1=1 ${socioClause}
      GROUP BY s.district
      ORDER BY crime_count DESC
    `, socioParams);

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

// 19. CCTNS Scheduler Sync Logs Fetcher
app.get('/api/cctns/runs', async (req, res) => {
  try {
    const db = catalyst.datastore();
    const runs = await db.execute("SELECT * FROM CCTNS_SyncJobs ORDER BY timestamp DESC LIMIT 40");
    res.json({ success: true, runs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 19b. CCTNS Connection status
app.get('/api/cctns/status', (req, res) => {
  res.json({ success: true, ...cctnsClient.getConnectionStatus() });
});

// 20. CCTNS Manual Sync trigger
app.post('/api/cctns/sync', async (req, res) => {
  try {
    const { triggerType } = req.body; // 'Manual' or 'Automatic'
    const result = await cctnsEtl.runSync(triggerType || 'Manual');
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 21. Warrant Desk — List all FIRs with case metadata and risk scores (RLS Enforced)
app.get('/api/warrants', async (req, res) => {
  try {
    const db = catalyst.datastore();
    const { clause, params } = getRLSFilter(req.user, 'f');
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
      WHERE 1=1 ${clause}
      ORDER BY days_open DESC
      LIMIT 200
    `, params);
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
    
    // RLS check for each FIR before updating
    const { clause, params } = getRLSFilter(req.user, 'f');
    
    for (const firId of firIds) {
      const allowed = await db.execute(`SELECT id FROM FIR f WHERE f.id = ? ${clause}`, [firId, ...params]);
      if (allowed.length === 0) {
        return res.status(403).json({ success: false, error: `Access Denied for FIR id ${firId}` });
      }

      await db.execute(
        "UPDATE FIR SET status = ? WHERE id = ?",
        [newStatus || 'Under Review', firId]
      );
      
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const actionDetails = `Status changed to '${newStatus}'${assignedOfficer ? ` | Assigned: ${assignedOfficer}` : ''}${urgencyNote ? ` | Note: ${urgencyNote}` : ''}`;
      await writeAuditLog(userId, role, `BULK_WARRANT_UPDATE fir_id=${firId}`, actionDetails, ipAddress);
    }
    res.json({ success: true, updated: firIds.length, newStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 23. Investigation Timeline for a specific FIR (RLS Enforced)
app.get('/api/timeline/:firId', async (req, res) => {
  try {
    const { firId } = req.params;
    const db = catalyst.datastore();

    const { clause, params } = getRLSFilter(req.user, 'f');
    const allowed = await db.execute(`SELECT id FROM FIR f WHERE f.id = ? ${clause}`, [firId, ...params]);
    if (allowed.length === 0) {
      return res.status(403).json({ success: false, error: 'Access Denied: You do not have permission to access records for this FIR.' });
    }

    const investigationTimeline = require('./investigation-timeline/index');
    const result = await investigationTimeline(parseInt(firId));
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 24. Enhanced Early Warning Intelligence (RLS Scoped)
app.get('/api/early-warning', async (req, res) => {
  try {
    const earlyWarning = require('./early-warning/index');
    const scope = getUserScope(req.user);
    const result = await earlyWarning(scope);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 25. Automated Case Summary (RLS Enforced)
app.get('/api/case-summary/:firId', async (req, res) => {
  try {
    const { firId } = req.params;
    const db = catalyst.datastore();

    const { clause, params } = getRLSFilter(req.user, 'f');
    const allowed = await db.execute(`SELECT id FROM FIR f WHERE f.id = ? ${clause}`, [firId, ...params]);
    if (allowed.length === 0) {
      return res.status(403).json({ success: false, error: 'Access Denied: You do not have permission to access records for this FIR.' });
    }

    const caseSummary = require('./case-summary/index');
    const result = await caseSummary(parseInt(firId));
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 26. Dashboard stats - count real rows in the SQLite DB (RLS Enforced)
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const { district, crimeType } = req.query;
    const db = catalyst.datastore();
    
    const { clause: rlsClause, params: rlsParams } = getRLSFilter(req.user, 'f');
    
    let firFilter = "WHERE 1=1" + rlsClause;
    let accusedFilter = "WHERE 1=1" + rlsClause;
    let params = [...rlsParams];
    let accusedParams = [...rlsParams];
    
    if (district && district !== 'All') {
      firFilter += " AND f.district = ?";
      accusedFilter += " AND f.district = ?";
      params.push(district);
      accusedParams.push(district);
    }
    if (crimeType && crimeType !== 'All') {
      firFilter += " AND f.crime_type = ?";
      params.push(crimeType);
    }
    
    const totalRow = await db.execute(`SELECT COUNT(*) as count FROM FIR f ${firFilter}`, params);
    const openRow = await db.execute(`SELECT COUNT(*) as count FROM FIR f ${firFilter} AND f.status = 'Under Investigation'`, params);
    
    const syndicateRow = await db.execute(`
      SELECT COUNT(DISTINCT a.gang_affiliation) as count 
      FROM Accused a
      JOIN FIR f ON a.fir_id = f.id
      ${accusedFilter} AND a.gang_affiliation IS NOT NULL
    `, accusedParams);
    
    const highRiskRow = await db.execute(`
      SELECT COUNT(DISTINCT a.name) as count 
      FROM Accused a
      JOIN FIR f ON a.fir_id = f.id
      ${accusedFilter} AND a.risk_score >= 0.7
    `, accusedParams);
    
    res.json({
      success: true,
      stats: {
        total: totalRow[0]?.count || 0,
        open: openRow[0]?.count || 0,
        syndicates: syndicateRow[0]?.count || 0,
        highRisk: highRiskRow[0]?.count || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 27. SmartBrowz Analytics Stats
app.get('/api/smartbrowz/stats', async (req, res) => {
  try {
    const { timeFilter } = req.query;
    const result = await smartBrowz.getStats(timeFilter || '24h');
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 28. SmartBrowz Action Simulator
app.post('/api/smartbrowz/run', async (req, res) => {
  try {
    const { actionType } = req.body;
    if (!actionType) {
      return res.status(400).json({ success: false, error: "Missing actionType." });
    }
    const result = await smartBrowz.runAction(actionType);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- LEGAL & COMPLIANCE ENDPOINTS ---

// e-Courts case status lookup
app.get('/api/court/:firNumber', async (req, res) => {
  try {
    const { firNumber } = req.params;
    
    // RLS Enforcement
    const db = catalyst.datastore();
    const { clause, params } = getRLSFilter(req.user, 'f');
    const allowed = await db.execute(`SELECT id FROM FIR f WHERE f.fir_number = ? ${clause}`, [firNumber, ...params]);
    if (allowed.length === 0) {
      return res.status(403).json({ success: false, error: 'Access Denied: You do not have permission to access records for this case.' });
    }

    const result = await ecourts.getCaseStatus(firNumber);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// e-Prisons status lookup
app.get('/api/prison/:accusedId', async (req, res) => {
  try {
    const { accusedId } = req.params;
    const db = catalyst.datastore();
    
    // RLS check based on the FIR this accused is linked to
    const { clause, params } = getRLSFilter(req.user, 'f');
    const allowed = await db.execute(`
      SELECT a.id 
      FROM Accused a 
      JOIN FIR f ON a.fir_id = f.id 
      WHERE a.id = ? ${clause}
    `, [accusedId, ...params]);
    
    if (allowed.length === 0) {
      return res.status(403).json({ success: false, error: 'Access Denied: You do not have permission to access records for this accused.' });
    }

    const result = await eprisons.getInmateStatus(accusedId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// e-Prisons Release Alerts
app.get('/api/prison/releases', async (req, res) => {
  try {
    // Release alerts are district-wide; filter based on officer district if not DGP
    const result = await eprisons.getReleaseAlerts();
    if (result.success && req.user.role !== 'Policymaker') {
      const userDistrict = req.user.district;
      result.releases = result.releases.filter(r => r.district === userDistrict);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Evidence Vault registration
app.post('/api/evidence/register', async (req, res) => {
  try {
    const { firId, type, fileHash, fileName, description } = req.body;
    const { userId } = req.user;
    if (!firId || !type || !fileHash) {
      return res.status(400).json({ success: false, error: 'firId, type, and fileHash are required.' });
    }
    
    // RLS Enforcement
    const db = catalyst.datastore();
    const { clause, params } = getRLSFilter(req.user, 'f');
    const allowed = await db.execute(`SELECT id FROM FIR f WHERE f.id = ? ${clause}`, [firId, ...params]);
    if (allowed.length === 0) {
      return res.status(403).json({ success: false, error: 'Access Denied: You cannot register evidence for this FIR.' });
    }

    const result = await evidenceVault.registerEvidence(firId, type, fileHash, userId, fileName, description);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Evidence Chain retrieval
app.get('/api/evidence/:firId', async (req, res) => {
  try {
    const { firId } = req.params;
    const db = catalyst.datastore();
    
    // RLS Enforcement
    const { clause, params } = getRLSFilter(req.user, 'f');
    const allowed = await db.execute(`SELECT id FROM FIR f WHERE f.id = ? ${clause}`, [firId, ...params]);
    if (allowed.length === 0) {
      return res.status(403).json({ success: false, error: 'Access Denied: You cannot view evidence chain for this FIR.' });
    }

    const result = await evidenceVault.getEvidenceChain(parseInt(firId));
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Evidence integrity verification
app.post('/api/evidence/verify', async (req, res) => {
  try {
    const { evidenceId, fileHash } = req.body;
    if (!evidenceId || !fileHash) {
      return res.status(400).json({ success: false, error: 'evidenceId and fileHash are required.' });
    }
    
    // RLS Check based on evidence's FIR
    const db = catalyst.datastore();
    const { clause, params } = getRLSFilter(req.user, 'f');
    const allowed = await db.execute(`
      SELECT ec.id 
      FROM EvidenceChain ec
      JOIN FIR f ON ec.fir_id = f.id
      WHERE ec.id = ? ${clause}
    `, [evidenceId, ...params]);
    
    if (allowed.length === 0) {
      return res.status(403).json({ success: false, error: 'Access Denied: You do not have permission to verify this evidence.' });
    }

    const result = await evidenceVault.verifyEvidence(evidenceId, fileHash);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// BNS section mappings lookup
app.get('/api/bns/mapping', async (req, res) => {
  try {
    const db = catalyst.datastore();
    const mappings = await db.execute("SELECT * FROM BNS_Mapping LIMIT 100");
    res.json({ success: true, mappings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/bns/translate/:ipcSection', async (req, res) => {
  try {
    const { ipcSection } = req.params;
    const db = catalyst.datastore();
    const rows = await db.execute("SELECT * FROM BNS_Mapping WHERE ipc_section = ?", [ipcSection]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: `No BNS mapping found for IPC section ${ipcSection}` });
    }
    res.json({ success: true, mapping: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// --- SYSTEM HEALTH & MONITORING ENDPOINTS ---

// Liveness, readiness, and system health checks (Public)
app.get('/api/health', async (req, res) => {
  try {
    const report = await health.getHealthReport();
    res.json(report);
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

app.get('/api/health/ready', async (req, res) => {
  const ready = await health.isReady();
  if (ready.ready) {
    res.json(ready);
  } else {
    res.status(503).json(ready);
  }
});

app.get('/api/health/live', (req, res) => {
  res.json(health.isLive());
});

// Root redirect
app.get('/', (req, res) => {
  res.redirect('http://localhost:5173');
});

// Start the server
app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(` Catalyst Functions Server running on port ${PORT}`);
  console.log(` Connect to: http://localhost:${PORT}`);
  console.log(`========================================================`);
});
