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
          // Simple token search in description / modus_operandi / crime_type
          const tokens = queryText.toLowerCase().replace(/[?,.!-]/g, '').split(/\s+/).filter(t => t.length > 2);
          const db = this.datastore();
          
          if (tokens.length === 0) {
            return await db.execute("SELECT * FROM FIR ORDER BY date_reported DESC LIMIT ?", [limit]);
          }

          let sql = "SELECT * FROM FIR";
          let clauses = [];
          let params = [];

          tokens.forEach(token => {
            clauses.push("(description LIKE ? OR modus_operandi LIKE ? OR crime_type LIKE ? OR district LIKE ?)");
            const paramVal = `%${token}%`;
            params.push(paramVal, paramVal, paramVal, paramVal);
          });

          sql += " WHERE " + clauses.join(" OR ");
          sql += " ORDER BY date_reported DESC LIMIT ?";
          params.push(limit);

          return await db.execute(sql, params);
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
