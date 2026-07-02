/**
 * Tamper-Evident Audit Logging Module for KSP Portal
 * Phase 1: SHA-256 hash-chained audit entries for immutable compliance
 * 
 * Each log entry includes a hash of the previous entry, creating
 * a verifiable chain of custody for all system actions.
 */
const crypto = require('crypto');
const catalyst = require('../shared/catalyst-sdk').getInitializer();

/**
 * Classify data sensitivity based on content
 */
function getClassification(query, action) {
  const text = `${query} ${action}`.toLowerCase();
  if (text.includes('biometric') || text.includes('facial') || text.includes('ocr') || text.includes('override') || text.includes('evidence')) {
    return 'Top Secret';
  }
  if (text.includes('warrant') || text.includes('risk') || text.includes('accused') || text.includes('suspect') || text.includes('prison')) {
    return 'Secret';
  }
  if (text.includes('finance') || text.includes('hawala') || text.includes('bank') || text.includes('transaction') || text.includes('court')) {
    return 'Confidential';
  }
  return 'Restricted';
}

/**
 * Compute SHA-256 hash of an audit entry for chain integrity
 */
function computeEntryHash(entry) {
  const data = `${entry.user_id}|${entry.role}|${entry.query_text}|${entry.action_taken}|${entry.timestamp}|${entry.ip_address}|${entry.data_classification}|${entry.prev_hash}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get the hash of the most recent audit log entry
 */
async function getLastHash(db) {
  try {
    const rows = await db.execute("SELECT integrity_hash FROM AuditLog ORDER BY id DESC LIMIT 1");
    if (rows.length > 0 && rows[0].integrity_hash) {
      return rows[0].integrity_hash;
    }
    // Genesis hash for the first entry
    return crypto.createHash('sha256').update('KSP-GENESIS-BLOCK-2026').digest('hex');
  } catch (err) {
    return crypto.createHash('sha256').update('KSP-GENESIS-BLOCK-2026').digest('hex');
  }
}

/**
 * Write an immutable, hash-chained audit log entry
 */
async function writeAuditLog(userId, role, queryText, actionTaken, ipAddress) {
  try {
    const db = catalyst.datastore();
    const classification = getClassification(queryText, actionTaken);
    const timestamp = new Date().toISOString();
    
    // Get the previous entry's hash for chaining
    const prevHash = await getLastHash(db);
    
    // Build the entry object
    const entry = {
      user_id: userId,
      role: role,
      query_text: queryText,
      action_taken: actionTaken,
      timestamp: timestamp,
      ip_address: ipAddress || '127.0.0.1',
      data_classification: classification,
      prev_hash: prevHash
    };

    // Compute this entry's integrity hash
    const integrityHash = computeEntryHash(entry);

    // Insert with hash chain
    const result = await db.run(
      `INSERT INTO AuditLog (user_id, role, query_text, action_taken, timestamp, ip_address, data_classification, prev_hash, integrity_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [entry.user_id, entry.role, entry.query_text, entry.action_taken, entry.timestamp, entry.ip_address, entry.data_classification, prevHash, integrityHash]
    );

    return { success: true, logId: result.lastID, integrityHash };
  } catch (err) {
    console.error('Audit logging execution failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Verify the integrity of the entire audit log chain
 * Returns { valid: boolean, brokenAt: number|null, totalEntries: number }
 */
async function verifyChain() {
  try {
    const db = catalyst.datastore();
    const entries = await db.execute("SELECT * FROM AuditLog ORDER BY id ASC");
    
    if (entries.length === 0) {
      return { valid: true, brokenAt: null, totalEntries: 0 };
    }

    const genesisHash = crypto.createHash('sha256').update('KSP-GENESIS-BLOCK-2026').digest('hex');
    let expectedPrevHash = genesisHash;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Skip entries without hash chain (legacy entries before upgrade)
      if (!entry.integrity_hash || !entry.prev_hash) continue;

      // Verify previous hash link
      if (entry.prev_hash !== expectedPrevHash) {
        return { valid: false, brokenAt: entry.id, totalEntries: entries.length, reason: 'Previous hash mismatch' };
      }

      // Verify integrity hash
      const computed = computeEntryHash({
        user_id: entry.user_id,
        role: entry.role,
        query_text: entry.query_text,
        action_taken: entry.action_taken,
        timestamp: entry.timestamp,
        ip_address: entry.ip_address,
        data_classification: entry.data_classification,
        prev_hash: entry.prev_hash
      });

      if (computed !== entry.integrity_hash) {
        return { valid: false, brokenAt: entry.id, totalEntries: entries.length, reason: 'Integrity hash tampered' };
      }

      expectedPrevHash = entry.integrity_hash;
    }

    return { valid: true, brokenAt: null, totalEntries: entries.length };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// Export both the main logger (default) and the verify function
module.exports = writeAuditLog;
module.exports.writeAuditLog = writeAuditLog;
module.exports.verifyChain = verifyChain;
