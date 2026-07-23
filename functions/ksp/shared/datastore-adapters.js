/**
 * Datastore Abstraction Layer for KSP Portal
 * Phase 3: SqliteDatastoreAdapter (Development) & CatalystDatastoreAdapter (Production)
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

/**
 * Base Datastore Adapter Interface
 */
class BaseDatastoreAdapter {
  async execute(sql, params = []) {
    throw new Error('execute() must be implemented by adapter subclass');
  }

  async getTable(tableName) {
    throw new Error('getTable() must be implemented by adapter subclass');
  }
}

/**
 * SqliteDatastoreAdapter — For local development & offline evaluation only.
 */
class SqliteDatastoreAdapter extends BaseDatastoreAdapter {
  constructor(dbPath) {
    super();
    this.dbPath = dbPath;
    this.db = new sqlite3.Database(dbPath);
  }

  async execute(sql, params = []) {
    return new Promise((resolve, reject) => {
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      if (isSelect) {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve([{ lastID: this.lastID, changes: this.changes }]);
        });
      }
    });
  }

  async getTable(tableName) {
    return {
      get: async (id) => {
        const rows = await this.execute(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
        return rows[0] || null;
      },
      insert: async (row) => {
        const keys = Object.keys(row);
        const placeholders = keys.map(() => '?').join(', ');
        const columns = keys.join(', ');
        const values = Object.values(row);
        const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
        return await this.execute(sql, values);
      }
    };
  }
}

/**
 * CatalystDatastoreAdapter — For official Zoho Catalyst cloud deployment.
 */
class CatalystDatastoreAdapter extends BaseDatastoreAdapter {
  constructor(catalystSdkInstance) {
    super();
    this.catalystSdk = catalystSdkInstance;
  }

  async execute(zcqlQuery, params = []) {
    if (!this.catalystSdk || !this.catalystSdk.zcql) {
      throw new Error('Catalyst ZCQL service unavailable. Check Catalyst project configuration.');
    }
    // Execute ZCQL query via Zoho Catalyst Datastore SDK
    const zcql = this.catalystSdk.zcql();
    const result = await zcql.executeZCQLQuery(zcqlQuery);
    return result.map(item => Object.values(item)[0]);
  }

  async getTable(tableName) {
    const datastore = this.catalystSdk.datastore();
    const table = datastore.table(tableName);
    return {
      get: async (ROWID) => {
        return await table.getRow(ROWID);
      },
      insert: async (row) => {
        return await table.insertRow(row);
      }
    };
  }
}

/**
 * Adapter Factory: Enforces strict environment boundaries.
 */
function createDatastoreAdapter(catalystSdkInstance = null) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.CATALYST_ENV === 'production';
  
  if (isProduction) {
    if (!catalystSdkInstance) {
      throw new Error('FATAL DATABASE SECURITY ERROR: Production deployment must use CatalystDatastoreAdapter. SQLite /tmp fallback is disabled in production.');
    }
    return new CatalystDatastoreAdapter(catalystSdkInstance);
  }

  // Development environment SQLite path
  const dbPath = path.join(__dirname, '..', 'datastore', 'ksp_crime.db');
  return new SqliteDatastoreAdapter(dbPath);
}

module.exports = {
  SqliteDatastoreAdapter,
  CatalystDatastoreAdapter,
  createDatastoreAdapter
};
