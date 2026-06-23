const catalyst = require('../shared/catalyst-sdk').getInitializer();

function getClassification(query, action) {
  const text = `${query} ${action}`.toLowerCase();
  if (text.includes('biometric') || text.includes('facial') || text.includes('ocr') || text.includes('override')) {
    return 'Top Secret';
  }
  if (text.includes('warrant') || text.includes('risk') || text.includes('accused') || text.includes('suspect')) {
    return 'Secret';
  }
  if (text.includes('finance') || text.includes('hawala') || text.includes('bank') || text.includes('transaction')) {
    return 'Confidential';
  }
  return 'Restricted';
}

module.exports = async (userId, role, queryText, actionTaken, ipAddress) => {
  try {
    const db = catalyst.datastore();
    const classification = getClassification(queryText, actionTaken);
    const result = await db.table('AuditLog').insert({
      user_id: userId,
      role: role,
      query_text: queryText,
      action_taken: actionTaken,
      timestamp: new Date().toISOString(),
      ip_address: ipAddress || '127.0.0.1',
      data_classification: classification
    });
    return { success: true, logId: result.id };
  } catch (err) {
    console.error('Audit logging execution failed:', err);
    return { success: false, error: err.message };
  }
};
