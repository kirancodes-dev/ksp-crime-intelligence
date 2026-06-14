const catalyst = require('../shared/catalyst-sdk').getInitializer();

module.exports = async (userId, role, queryText, actionTaken, ipAddress) => {
  try {
    const db = catalyst.datastore();
    const result = await db.table('AuditLog').insert({
      user_id: userId,
      role: role,
      query_text: queryText,
      action_taken: actionTaken,
      timestamp: new Date().toISOString(),
      ip_address: ipAddress || '127.0.0.1'
    });
    return { success: true, logId: result.id };
  } catch (err) {
    console.error('Audit logging execution failed:', err);
    return { success: false, error: err.message };
  }
};
