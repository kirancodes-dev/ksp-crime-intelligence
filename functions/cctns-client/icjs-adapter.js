/**
 * ICJS (Interoperable Criminal Justice System) Adapter
 * Phase 3: Integration with e-Courts, e-Prisons, e-Forensics
 * 
 * Falls back to realistic simulated data when ICJS is not configured.
 */
const ICJS_API_BASE = process.env.ICJS_API_BASE || null;
const ICJS_API_KEY = process.env.ICJS_API_KEY || null;

function isLiveMode() {
  return !!(ICJS_API_BASE && ICJS_API_KEY);
}

/**
 * Fetch court disposition for a specific FIR
 */
async function fetchCourtDisposition(firNumber) {
  if (isLiveMode()) {
    // Production ICJS API call would go here
    throw new Error('ICJS live mode not yet implemented');
  }

  // Simulated court data based on FIR patterns
  const courtNames = ['CMM Court Bengaluru', 'Sessions Court Mysuru', 'JMFC Court Hubballi', 'District Court Mangaluru', 'High Court Karnataka'];
  const judges = ['Hon. Justice S. Ramanathan', 'Hon. Justice K. Gowda', 'Hon. Justice M. Patil', 'Hon. Justice R. Hegde'];
  
  return {
    success: true,
    fir_number: firNumber,
    court: {
      name: courtNames[Math.floor(Math.random() * courtNames.length)],
      case_number: `CC-${2026}-${Math.floor(Math.random() * 9000 + 1000)}`,
      judge: judges[Math.floor(Math.random() * judges.length)],
      status: Math.random() > 0.3 ? 'Under Trial' : 'Disposed',
      next_hearing: new Date(Date.now() + Math.random() * 30 * 24 * 3600000).toISOString().split('T')[0],
      charges_framed: true,
      charge_sheet_date: new Date(Date.now() - Math.random() * 90 * 24 * 3600000).toISOString().split('T')[0]
    },
    source: 'ICJS_SIMULATED'
  };
}

/**
 * Fetch prison/incarceration status for an accused
 */
async function fetchPrisonStatus(accusedName) {
  if (isLiveMode()) {
    throw new Error('ICJS live mode not yet implemented');
  }

  const prisons = ['Parappana Agrahara Central Prison', 'Mysuru District Jail', 'Hindalga Central Prison Belagavi', 'Mangaluru District Jail'];
  const isIncarcerated = Math.random() > 0.4;

  if (!isIncarcerated) {
    return {
      success: true,
      accused_name: accusedName,
      status: 'Not Incarcerated',
      bail_status: 'Released on bail',
      last_known_location: 'Community supervision',
      source: 'ICJS_SIMULATED'
    };
  }

  return {
    success: true,
    accused_name: accusedName,
    status: 'Incarcerated',
    prison: {
      name: prisons[Math.floor(Math.random() * prisons.length)],
      ward: `Ward ${Math.floor(Math.random() * 10 + 1)}`,
      prisoner_id: `KA-PRN-${Math.floor(Math.random() * 90000 + 10000)}`,
      admission_date: new Date(Date.now() - Math.random() * 365 * 24 * 3600000).toISOString().split('T')[0],
      behavior_rating: ['Good', 'Satisfactory', 'Under Watch'][Math.floor(Math.random() * 3)],
      next_parole_date: new Date(Date.now() + Math.random() * 180 * 24 * 3600000).toISOString().split('T')[0]
    },
    bail_status: 'Bail denied',
    source: 'ICJS_SIMULATED'
  };
}

/**
 * Fetch forensic lab results for a specific FIR
 */
async function fetchForensicResults(firNumber) {
  if (isLiveMode()) {
    throw new Error('ICJS live mode not yet implemented');
  }

  return {
    success: true,
    fir_number: firNumber,
    forensics: {
      lab: 'Karnataka State FSL, Bengaluru',
      sample_received: new Date(Date.now() - Math.random() * 60 * 24 * 3600000).toISOString().split('T')[0],
      status: Math.random() > 0.3 ? 'Report Ready' : 'Analysis In Progress',
      findings: [
        { test: 'DNA Analysis', result: 'Match found with accused sample', confidence: '99.2%' },
        { test: 'Fingerprint Match', result: 'Partial latent print recovered', confidence: '87.5%' },
        { test: 'Digital Forensics', result: 'IP trace confirms device association', confidence: '94.1%' }
      ].slice(0, Math.floor(Math.random() * 3) + 1),
      report_date: new Date().toISOString().split('T')[0]
    },
    source: 'ICJS_SIMULATED'
  };
}

/**
 * Get recently released high-risk offenders (for recidivism monitoring)
 */
async function getRecentReleases() {
  if (isLiveMode()) {
    throw new Error('ICJS live mode not yet implemented');
  }

  return {
    success: true,
    releases: [
      { name: 'Suresh B.', prison: 'Parappana Agrahara', release_date: new Date(Date.now() - 3 * 24 * 3600000).toISOString().split('T')[0], crime_type: 'Organized Crime', risk_level: 'High', district: 'Bengaluru City' },
      { name: 'Ganesh M.', prison: 'Hindalga Central Prison', release_date: new Date(Date.now() - 7 * 24 * 3600000).toISOString().split('T')[0], crime_type: 'Financial Fraud', risk_level: 'Medium', district: 'Belagavi' }
    ],
    source: 'ICJS_SIMULATED'
  };
}

module.exports = {
  fetchCourtDisposition,
  fetchPrisonStatus,
  fetchForensicResults,
  getRecentReleases,
  isLiveMode
};
