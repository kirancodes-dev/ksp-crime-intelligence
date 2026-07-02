/**
 * e-Prisons Integration Module for KSP Portal
 * Phase 6: Karnataka Prison Department API client
 */
const icjs = require('../cctns-client/icjs-adapter');

/**
 * Get current inmate status for an accused person
 */
async function getInmateStatus(accusedName) {
  try {
    const result = await icjs.fetchPrisonStatus(accusedName);
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get parole schedule for an accused
 */
async function getParoleSchedule(accusedId) {
  try {
    const prisonData = await icjs.fetchPrisonStatus(`accused_${accusedId}`);
    if (prisonData.success && prisonData.prison) {
      return {
        success: true,
        accused_id: accusedId,
        parole: {
          eligible: true,
          next_date: prisonData.prison.next_parole_date,
          behavior_rating: prisonData.prison.behavior_rating,
          prison: prisonData.prison.name
        }
      };
    }
    return {
      success: true,
      accused_id: accusedId,
      parole: { eligible: false, reason: 'Not currently incarcerated' }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get recently released high-risk offenders for recidivism monitoring
 */
async function getReleaseAlerts() {
  try {
    const releases = await icjs.getRecentReleases();
    return releases;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { getInmateStatus, getParoleSchedule, getReleaseAlerts };
