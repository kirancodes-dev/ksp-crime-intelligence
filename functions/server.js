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
        CASE 
          WHEN is_migrant = 1 OR is_migrant = 'true' THEN 'Migrant'
          ELSE 'Local'
        END as status,
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

// Start the server
app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(` Catalyst Functions Server running on port ${PORT}`);
  console.log(` Connect to: http://localhost:${PORT}`);
  console.log(`========================================================`);
});
