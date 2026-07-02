/**
 * Health Check Module for KSP Portal
 * Phase 7: Comprehensive system health monitoring
 */
const catalyst = require('../shared/catalyst-sdk').getInitializer();
const cctnsClient = require('../cctns-client/index');

/**
 * Full health check — database, LLM, CCTNS, system resources
 */
async function getHealthReport() {
  const report = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    version: '2.0.0',
    checks: {}
  };

  // 1. Database connectivity
  try {
    const db = catalyst.datastore();
    const result = await db.execute("SELECT COUNT(*) as count FROM FIR");
    report.checks.database = {
      status: 'up',
      fir_count: result[0]?.count || 0,
      type: 'SQLite (Catalyst Emulated)'
    };
  } catch (err) {
    report.checks.database = { status: 'down', error: err.message };
    report.status = 'degraded';
  }

  // 2. LLM Provider availability
  const llmProvider = process.env.USE_GLM === 'true' ? 'GLM-5' :
                      process.env.USE_GROQ === 'true' && process.env.GROQ_API_KEY ? 'Groq' :
                      process.env.GEMINI_API_KEY ? 'Gemini' :
                      process.env.USE_OLLAMA === 'true' ? 'Ollama' : 'None';
  report.checks.llm = {
    status: llmProvider !== 'None' ? 'configured' : 'unavailable',
    provider: llmProvider
  };

  // 3. CCTNS connection status
  const cctnsStatus = cctnsClient.getConnectionStatus();
  report.checks.cctns = {
    status: cctnsStatus.live ? 'live' : 'simulated',
    mode: cctnsStatus.mode,
    endpoint: cctnsStatus.live ? cctnsStatus.endpoint : 'Not configured'
  };

  // 4. System resources
  const memUsage = process.memoryUsage();
  report.checks.system = {
    status: 'up',
    memory: {
      rss_mb: Math.round(memUsage.rss / 1024 / 1024),
      heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024)
    },
    node_version: process.version,
    platform: process.platform
  };

  // 5. Audit log integrity
  try {
    const { verifyChain } = require('../audit-log/index');
    const chainResult = await verifyChain();
    report.checks.audit_integrity = {
      status: chainResult.valid ? 'intact' : 'COMPROMISED',
      total_entries: chainResult.totalEntries,
      broken_at: chainResult.brokenAt
    };
    if (!chainResult.valid) report.status = 'degraded';
  } catch (err) {
    report.checks.audit_integrity = { status: 'unknown', error: err.message };
  }

  return report;
}

/**
 * Readiness probe — is the service ready to accept traffic?
 */
async function isReady() {
  try {
    const db = catalyst.datastore();
    await db.execute("SELECT 1");
    return { ready: true };
  } catch (err) {
    return { ready: false, error: err.message };
  }
}

/**
 * Liveness probe — is the process alive?
 */
function isLive() {
  return {
    live: true,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  };
}

module.exports = { getHealthReport, isReady, isLive };
