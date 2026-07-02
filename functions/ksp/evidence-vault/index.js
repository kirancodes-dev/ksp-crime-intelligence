/**
 * Digital Evidence Vault for KSP Portal
 * Phase 6: Chain-of-custody tracking with SHA-256 integrity verification
 * Compliant with Bharatiya Sakshya Adhiniyam 2023, Section 63 (electronic records)
 */
const crypto = require('crypto');
const catalyst = require('../shared/catalyst-sdk').getInitializer();

/**
 * Register a new piece of evidence with chain-of-custody
 */
async function registerEvidence(firId, evidenceType, fileHash, uploadedBy, fileName = null, description = null) {
  try {
    const db = catalyst.datastore();

    // Verify FIR exists
    const fir = await db.execute("SELECT id, fir_number FROM FIR WHERE id = ?", [firId]);
    if (fir.length === 0) {
      return { success: false, error: `FIR with id ${firId} not found` };
    }

    // Create initial custody log entry
    const custodyLog = JSON.stringify([{
      action: 'REGISTERED',
      officer: uploadedBy,
      timestamp: new Date().toISOString(),
      notes: 'Evidence initially registered in digital vault'
    }]);

    // Compute verification hash (combines file hash + metadata for tamper detection)
    const verificationData = `${firId}|${evidenceType}|${fileHash}|${uploadedBy}|${custodyLog}`;
    const verificationHash = crypto.createHash('sha256').update(verificationData).digest('hex');

    const result = await db.run(
      `INSERT INTO EvidenceChain (fir_id, evidence_type, file_hash, file_name, description, uploaded_by, uploaded_at, custody_log, is_verified, verification_hash)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, 1, ?)`,
      [firId, evidenceType, fileHash, fileName, description, uploadedBy, custodyLog, verificationHash]
    );

    return {
      success: true,
      evidence_id: result.lastID,
      fir_number: fir[0].fir_number,
      verification_hash: verificationHash,
      message: 'Evidence registered with digital chain-of-custody'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get the full evidence chain for a FIR
 */
async function getEvidenceChain(firId) {
  try {
    const db = catalyst.datastore();
    const evidence = await db.execute(`
      SELECT ec.*, f.fir_number 
      FROM EvidenceChain ec 
      JOIN FIR f ON ec.fir_id = f.id 
      WHERE ec.fir_id = ? 
      ORDER BY ec.uploaded_at ASC
    `, [firId]);

    // Parse custody logs
    const parsed = evidence.map(e => ({
      ...e,
      custody_log: (() => {
        try { return JSON.parse(e.custody_log); } catch { return []; }
      })()
    }));

    return {
      success: true,
      fir_id: firId,
      evidence: parsed,
      total: parsed.length,
      chain_intact: parsed.every(e => e.is_verified === 1)
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Verify evidence integrity by comparing stored hash with provided file hash
 */
async function verifyEvidence(evidenceId, providedFileHash) {
  try {
    const db = catalyst.datastore();
    const rows = await db.execute("SELECT * FROM EvidenceChain WHERE id = ?", [evidenceId]);

    if (rows.length === 0) {
      return { success: false, error: 'Evidence record not found' };
    }

    const evidence = rows[0];
    const fileMatch = evidence.file_hash === providedFileHash;

    // Log verification attempt in custody chain
    let custodyLog;
    try { custodyLog = JSON.parse(evidence.custody_log); } catch { custodyLog = []; }
    custodyLog.push({
      action: fileMatch ? 'VERIFIED_INTACT' : 'VERIFICATION_FAILED',
      timestamp: new Date().toISOString(),
      notes: fileMatch ? 'File hash matches stored hash — evidence integrity confirmed' : 'File hash DOES NOT match — possible tampering detected'
    });

    await db.run(
      "UPDATE EvidenceChain SET custody_log = ?, is_verified = ? WHERE id = ?",
      [JSON.stringify(custodyLog), fileMatch ? 1 : 0, evidenceId]
    );

    return {
      success: true,
      evidence_id: evidenceId,
      integrity: fileMatch ? 'INTACT' : 'COMPROMISED',
      stored_hash: evidence.file_hash,
      provided_hash: providedFileHash,
      match: fileMatch,
      warning: fileMatch ? null : '⚠️ CRITICAL: Evidence file hash does not match stored hash. Possible tampering detected. Initiate forensic review immediately.'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Add a custody transfer record to evidence
 */
async function transferCustody(evidenceId, fromOfficer, toOfficer, reason) {
  try {
    const db = catalyst.datastore();
    const rows = await db.execute("SELECT * FROM EvidenceChain WHERE id = ?", [evidenceId]);
    if (rows.length === 0) return { success: false, error: 'Evidence not found' };

    let custodyLog;
    try { custodyLog = JSON.parse(rows[0].custody_log); } catch { custodyLog = []; }
    custodyLog.push({
      action: 'CUSTODY_TRANSFER',
      from: fromOfficer,
      to: toOfficer,
      reason,
      timestamp: new Date().toISOString()
    });

    await db.run("UPDATE EvidenceChain SET custody_log = ? WHERE id = ?", [JSON.stringify(custodyLog), evidenceId]);

    return { success: true, evidence_id: evidenceId, message: `Custody transferred from ${fromOfficer} to ${toOfficer}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { registerEvidence, getEvidenceChain, verifyEvidence, transferCustody };
