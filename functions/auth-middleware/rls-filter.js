/**
 * Row-Level Security (RLS) Filter Module for KSP Portal
 * Phase 1: Enforces jurisdiction-based data access boundaries
 * 
 * - Investigator (SI): Sees only their Police Station's records
 * - Analyst (DA) / Supervisor (ACP): Sees only their District's records
 * - Policymaker (DGP): Unrestricted statewide read access
 */

/**
 * Get SQL WHERE clause and params for RLS enforcement
 * @param {Object} user — decoded JWT payload { role, district, policeStation }
 * @param {string} tableAlias — SQL table alias (e.g., 'f' for FIR, 'l' for Location)
 * @param {string} districtColumn — column name for district (default 'district')
 * @param {string} stationColumn — column name for police station (default 'police_station')
 * @returns {{ clause: string, params: string[] }}
 */
function getRLSFilter(user, tableAlias = 'f', districtColumn = 'district', stationColumn = 'police_station') {
  if (!user || !user.role) {
    return { clause: ' AND 1=0', params: [] }; // Deny all if no user context
  }

  const role = user.role;

  // DGP / Policymaker: Statewide access — no filter
  if (role === 'Policymaker') {
    return { clause: '', params: [] };
  }

  // Supervisor (ACP) / Analyst (DA): District-scoped
  if (role === 'Supervisor' || role === 'Analyst') {
    const district = user.district;
    if (!district) return { clause: '', params: [] }; // Fallback to no filter if no district set
    const alias = tableAlias ? `${tableAlias}.` : '';
    return {
      clause: ` AND ${alias}${districtColumn} = ?`,
      params: [district]
    };
  }

  // Investigator (SI): Police Station-scoped
  if (role === 'Investigator') {
    const station = user.policeStation;
    const district = user.district;
    if (!station && !district) return { clause: '', params: [] };
    
    // Primary filter: police station. Fallback to district if station not in table.
    if (station) {
      const alias = tableAlias ? `${tableAlias}.` : '';
      return {
        clause: ` AND ${alias}${stationColumn} = ?`,
        params: [station]
      };
    }
    
    // Fallback to district
    const alias = tableAlias ? `${tableAlias}.` : '';
    return {
      clause: ` AND ${alias}${districtColumn} = ?`,
      params: [district]
    };
  }

  // Unknown role: deny all
  return { clause: ' AND 1=0', params: [] };
}

/**
 * Get scope object for function modules (risk-scoring, early-warning, etc.)
 * Translates JWT user context into the scope format used by internal modules
 * @param {Object} user — decoded JWT payload
 * @returns {{ type: string, value: string } | null}
 */
function getUserScope(user) {
  if (!user || !user.role) return null;

  if (user.role === 'Policymaker') {
    return { type: 'statewide' };
  }
  if (user.role === 'Supervisor' || user.role === 'Analyst') {
    return { type: 'district', value: user.district || 'Bengaluru City' };
  }
  if (user.role === 'Investigator') {
    return { type: 'station', value: user.policeStation || 'Bengaluru City Central PS' };
  }
  return { type: 'statewide' };
}

module.exports = { getRLSFilter, getUserScope };
