/**
 * CCTNS (Crime and Criminal Tracking Network & Systems) API Client
 * Mode: DEMO_SIMULATOR (Synthetic Data for Prototype Evaluation)
 * 
 * When live CCTNS credentials are configured and authorized, connects to national API gateway.
 * When unconfigured, returns explicitly tagged simulated prototype data.
 */
const https = require('https');
const crypto = require('crypto');

// CCTNS Configuration (set in .env for production)
const CCTNS_API_BASE = process.env.CCTNS_API_BASE || null;
const CCTNS_API_KEY = process.env.CCTNS_API_KEY || null;
const CCTNS_STATE_CODE = process.env.CCTNS_STATE_CODE || 'KA'; // Karnataka
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Check if CCTNS is configured for live connection
 */
function isLiveMode() {
  return !!(CCTNS_API_BASE && CCTNS_API_KEY);
}

/**
 * Make an authenticated request to CCTNS API with retry logic
 */
async function makeRequest(endpoint, method = 'GET', body = null, retryCount = 0) {
  if (!isLiveMode()) {
    throw new Error('CCTNS_NOT_CONFIGURED');
  }

  return new Promise((resolve, reject) => {
    const url = `${CCTNS_API_BASE}${endpoint}`;
    const dataString = body ? JSON.stringify(body) : null;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CCTNS_API_KEY}`,
        'X-State-Code': CCTNS_STATE_CODE,
        'X-Request-ID': crypto.randomUUID(),
        ...(dataString ? { 'Content-Length': Buffer.byteLength(dataString) } : {})
      },
      timeout: 30000
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } 
          catch (e) { reject(new Error('Invalid CCTNS response JSON')); }
        } else if (res.statusCode === 429 && retryCount < MAX_RETRIES) {
          // Rate limited — retry with exponential backoff
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
          setTimeout(() => {
            makeRequest(endpoint, method, body, retryCount + 1).then(resolve).catch(reject);
          }, delay);
        } else {
          reject(new Error(`CCTNS API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
        setTimeout(() => {
          makeRequest(endpoint, method, body, retryCount + 1).then(resolve).catch(reject);
        }, delay);
      } else {
        reject(err);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('CCTNS request timed out'));
    });

    if (dataString) req.write(dataString);
    req.end();
  });
}

/**
 * Fetch new FIRs from CCTNS since a given timestamp
 */
async function fetchNewFIRs(sinceTimestamp = null) {
  if (isLiveMode()) {
    const since = sinceTimestamp || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return await makeRequest(`/api/v2/firs?state=${CCTNS_STATE_CODE}&since=${since}`);
  }

  // Simulated response for development
  const districts = ['Bengaluru City', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi'];
  const crimeTypes = ['Cyber Crime', 'Theft', 'Organized Crime', 'Financial Fraud'];
  const count = 3 + Math.floor(Math.random() * 12);
  
  const firs = [];
  for (let i = 0; i < count; i++) {
    const district = districts[Math.floor(Math.random() * districts.length)];
    firs.push({
      fir_number: `FIR-CCTNS-${Date.now()}-${i}`,
      district,
      police_station: `${district.split(' ')[0]} Central PS`,
      crime_type: crimeTypes[Math.floor(Math.random() * crimeTypes.length)],
      status: 'Under Investigation',
      date_reported: new Date().toISOString().split('T')[0],
      date_occurrence: new Date(Date.now() - Math.random() * 7 * 24 * 3600000).toISOString().split('T')[0],
      description: `CCTNS synced incident report from ${district} jurisdiction`,
      modus_operandi: 'Pending forensic analysis and witness corroboration'
    });
  }

  return { success: true, firs, source: 'CCTNS_SIMULATED', count };
}

/**
 * Fetch accused/suspect updates from CCTNS
 */
async function fetchAccusedUpdates(sinceTimestamp = null) {
  if (isLiveMode()) {
    const since = sinceTimestamp || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return await makeRequest(`/api/v2/accused?state=${CCTNS_STATE_CODE}&since=${since}`);
  }

  return {
    success: true,
    accused: [],
    count: 0,
    source: 'CCTNS_SIMULATED'
  };
}

/**
 * Fetch warrant status updates from CCTNS
 */
async function fetchWarrantStatus() {
  if (isLiveMode()) {
    return await makeRequest(`/api/v2/warrants?state=${CCTNS_STATE_CODE}&status=pending`);
  }

  return {
    success: true,
    warrants: [
      { fir_number: 'FIR-2026-003', type: 'Non-Bailable', status: 'Pending', issued_by: 'CMM Court Bengaluru', accused: 'Rupa Naik' },
      { fir_number: 'FIR-2026-007', type: 'Search', status: 'Pending', issued_by: 'Sessions Court Mysuru', accused: 'Unknown' }
    ],
    source: 'CCTNS_SIMULATED'
  };
}

/**
 * Push local intelligence data back to CCTNS
 */
async function pushIntelligence(payload) {
  if (isLiveMode()) {
    return await makeRequest('/api/v2/intelligence/submit', 'POST', payload);
  }

  return {
    success: true,
    acknowledgement: `CCTNS-ACK-${Date.now()}`,
    message: 'Intelligence payload queued for CCTNS submission (simulated mode)',
    source: 'CCTNS_SIMULATED'
  };
}

/**
 * Get CCTNS connection status
 */
function getConnectionStatus() {
  return {
    live: isLiveMode(),
    endpoint: CCTNS_API_BASE || 'Not configured',
    stateCode: CCTNS_STATE_CODE,
    mode: isLiveMode() ? 'PRODUCTION' : 'SIMULATED'
  };
}

module.exports = {
  fetchNewFIRs,
  fetchAccusedUpdates,
  fetchWarrantStatus,
  pushIntelligence,
  getConnectionStatus,
  isLiveMode
};
