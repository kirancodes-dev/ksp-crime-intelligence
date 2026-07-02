const catalyst = require('../shared/catalyst-sdk').getInitializer();

module.exports = async (firId) => {
  try {
    const db = catalyst.datastore();

    // Query all transactions for the given FIR
    const transactions = await db.execute(
      'SELECT * FROM FinancialTransaction WHERE fir_id = ? ORDER BY transaction_date ASC',
      [firId]
    );

    if (transactions.length === 0) {
      return {
        success: true,
        nodes: [],
        edges: [],
        totalAmount: 0,
        suspiciousCount: 0,
        summary: `No financial transactions found for FIR ID ${firId}.`
      };
    }

    // Build nodes (unique accounts) and edges (transactions)
    const nodeMap = new Map();
    const edges = [];
    let totalAmount = 0;
    let suspiciousCount = 0;

    transactions.forEach((txn, idx) => {
      const fromId = `acc_${txn.source_account}`;
      const toId = `acc_${txn.destination_account}`;
      const amount = parseFloat(txn.amount) || 0;
      const isSuspicious = txn.is_suspicious === 1 || txn.is_suspicious === true || txn.is_suspicious === 'true';

      totalAmount += amount;
      if (isSuspicious) suspiciousCount++;

      // Add sender node
      if (!nodeMap.has(fromId)) {
        nodeMap.set(fromId, {
          id: fromId,
          label: txn.source_account,
          type: txn.source_account_type || 'unknown',
          suspicious: false
        });
      }

      // Add receiver node
      if (!nodeMap.has(toId)) {
        nodeMap.set(toId, {
          id: toId,
          label: txn.destination_account,
          type: txn.destination_account_type || 'unknown',
          suspicious: false
        });
      }

      // Mark nodes involved in suspicious transactions
      if (isSuspicious) {
        nodeMap.get(fromId).suspicious = true;
        nodeMap.get(toId).suspicious = true;
      }

      // Add edge for this transaction
      edges.push({
        from: fromId,
        to: toId,
        label: `₹${amount.toLocaleString('en-IN')} (${txn.transaction_date || 'N/A'})`,
        color: isSuspicious ? '#ef4444' : '#22c55e',
        arrows: 'to',
        title: `Type: ${txn.transaction_type || 'N/A'} | Ref: ${txn.reference_id || 'N/A'}`
      });
    });

    const nodes = Array.from(nodeMap.values());

    return {
      success: true,
      nodes,
      edges,
      totalAmount,
      suspiciousCount,
      summary: `Financial trail for FIR ID ${firId}: ${transactions.length} transactions across ${nodes.length} accounts totalling ₹${totalAmount.toLocaleString('en-IN')}. ${suspiciousCount} flagged as suspicious.`
    };
  } catch (err) {
    console.error('Financial analysis failed:', err);
    return { success: false, error: err.message };
  }
};
