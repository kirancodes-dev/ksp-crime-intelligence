const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', '..', 'datastore', 'ksp_crime.db');

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
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Failed to open SQLite database in Catalyst SDK:', err);
      } else {
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
        
        // Simple English to Kannada word-based mockup translation
        const enToKn = {
          "where": "ಎಲ್ಲಿ (Where)",
          "crime": "ಅಪರಾಧ (Crime)",
          "cyber": "ಸೈಬರ್ (Cyber)",
          "theft": "ಕಳ್ಳತನ (Theft)",
          "fraud": "ವಂಚನೆ (Fraud)",
          "organized": "ಸಂಘಟಿತ (Organized)",
          "bengaluru": "ಬೆಂಗಳೂರು (Bengaluru)",
          "mysuru": "ಮೈಸೂರು (Mysuru)",
          "hubli": "ಹುಬ್ಬಳ್ಳಿ (Hubli)",
          "mangaluru": "ಮಂಗಳೂರು (Mangaluru)",
          "belagavi": "ಬೆಳಗಾವಿ (Belagavi)",
          "accused": "ಆರೋಪಿ (Accused)",
          "victim": "ಸಂತ್ರಸ್ತ (Victim)",
          "police": "ಪೊಲೀಸ್ (Police)",
          "station": "ಠಾಣೆ (Station)",
          "risk": "ಅಪಾಯ (Risk)",
          "score": "ಅಂಕ (Score)",
          "show": "ತೋರಿಸಿ (Show)",
          "map": "ನಕ್ಷೆ (Map)",
          "history": "ಇತಿಹಾಸ (History)"
        };

        const knToEn = {
          "ಎಲ್ಲಿ": "where",
          "ಅಪರಾಧ": "crime",
          "ಸೈಬರ್": "cyber",
          "ಕಳ್ಳತನ": "theft",
          "ವಂಚನೆ": "fraud",
          "ಸಂಘಟಿತ": "organized",
          "ಬೆಂಗಳೂರು": "bengaluru",
          "ಮೈಸೂರು": "mysuru",
          "ಹುಬ್ಬಳ್ಳಿ": "hubli",
          "ಮಂಗಳೂರು": "mangaluru",
          "ಬೆಳಗಾವಿ": "belagavi",
          "ಆರೋಪಿ": "accused",
          "ಸಂತ್ರಸ್ತ": "victim",
          "ಪೊಲೀಸ್": "police",
          "ಠಾಣೆ": "station",
          "ಅಪಾಯ": "risk",
          "ಅಂಕ": "score",
          "ತೋರಿಸಿ": "show",
          "ನಕ್ಷೆ": "map",
          "ಇತಿಹಾಸ": "history"
        };

        if (f === 'en' && t === 'kn') {
          const words = text.toLowerCase().split(/\s+/);
          const translated = words.map(w => enToKn[w] || w).join(' ');
          return `ಕನ್ನಡ ಅನುವಾದ: ${translated}`;
        }
        
        if (f === 'kn' && t === 'en') {
          // If user type in Kannada, map keywords to English for the parser to understand
          const words = text.split(/\s+/);
          const translated = words.map(w => knToEn[w] || w).join(' ');
          return translated;
        }

        return text;
      },
      speechToText: async () => {
        // Return a default voice transcription
        return "Show me cyber crime incidents in Bengaluru City";
      },
      textToSpeech: async (text) => {
        // Return base64 voice mock (a small beep or silent wave data)
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

module.exports = {
  getInitializer: () => new CatalystInstance()
};
