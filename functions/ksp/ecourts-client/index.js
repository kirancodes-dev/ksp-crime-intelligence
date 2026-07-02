/**
 * e-Courts Integration Module for KSP Portal
 * Phase 6: Karnataka e-Courts API client for case tracking
 */
const catalyst = require('../shared/catalyst-sdk').getInitializer();
const icjs = require('../cctns-client/icjs-adapter');

/**
 * Get court case status for a FIR
 */
async function getCaseStatus(firNumber) {
  try {
    // First check local CourtOrders table
    const db = catalyst.datastore();
    const localOrders = await db.execute(`
      SELECT co.*, f.fir_number 
      FROM CourtOrders co 
      JOIN FIR f ON co.fir_id = f.id 
      WHERE f.fir_number = ? 
      ORDER BY co.order_date DESC
    `, [firNumber]);

    // Also fetch from ICJS
    const icjsData = await icjs.fetchCourtDisposition(firNumber);

    return {
      success: true,
      fir_number: firNumber,
      local_orders: localOrders,
      icjs_court: icjsData.court || null,
      total_orders: localOrders.length,
      source: localOrders.length > 0 ? 'LOCAL+ICJS' : 'ICJS'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get bail status for a specific accused
 */
async function getBailStatus(accusedId) {
  try {
    const db = catalyst.datastore();
    const bailOrders = await db.execute(`
      SELECT co.*, a.name as accused_name, f.fir_number
      FROM CourtOrders co
      JOIN Accused a ON co.accused_id = a.id
      JOIN FIR f ON co.fir_id = f.id
      WHERE co.accused_id = ? AND co.order_type = 'Bail'
      ORDER BY co.order_date DESC
    `, [accusedId]);

    return {
      success: true,
      accused_id: accusedId,
      bail_orders: bailOrders,
      current_status: bailOrders.length > 0 ? bailOrders[0].status : 'No bail application on record'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get conviction record for an accused
 */
async function getConvictionRecord(accusedId) {
  try {
    const db = catalyst.datastore();
    const convictions = await db.execute(`
      SELECT co.*, a.name as accused_name, f.fir_number, f.crime_type
      FROM CourtOrders co
      JOIN Accused a ON co.accused_id = a.id
      JOIN FIR f ON co.fir_id = f.id
      WHERE co.accused_id = ? AND co.order_type IN ('Conviction', 'Acquittal')
      ORDER BY co.order_date DESC
    `, [accusedId]);

    return {
      success: true,
      accused_id: accusedId,
      convictions,
      total: convictions.length
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { getCaseStatus, getBailStatus, getConvictionRecord };
