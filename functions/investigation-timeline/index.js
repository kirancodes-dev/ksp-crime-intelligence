const catalyst = require('../shared/catalyst-sdk').getInitializer();

module.exports = async (firId) => {
  try {
    const db = catalyst.datastore();

    const firs = await db.execute("SELECT * FROM FIR WHERE id = ?", [firId]);
    if (firs.length === 0) return { success: false, error: "FIR not found" };
    const fir = firs[0];

    const accused = await db.execute("SELECT * FROM Accused WHERE fir_id = ?", [firId]);
    const victims = await db.execute("SELECT * FROM Victim WHERE fir_id = ?", [firId]);
    const locations = await db.execute("SELECT * FROM Location WHERE fir_id = ?", [firId]);
    const financials = await db.execute("SELECT * FROM FinancialTransaction WHERE fir_id = ? ORDER BY transaction_date ASC", [firId]);
    const caseLinks = await db.execute(`
      SELECT cl.*, f1.fir_number as source_fir, f2.fir_number as target_fir
      FROM CaseLinks cl
      JOIN FIR f1 ON cl.source_fir_id = f1.id
      JOIN FIR f2 ON cl.target_fir_id = f2.id
      WHERE cl.source_fir_id = ? OR cl.target_fir_id = ?
    `, [firId, firId]);

    const similarFirs = await db.execute(
      "SELECT id, fir_number, crime_type, district, status, date_reported FROM FIR WHERE crime_type = ? AND district = ? AND id != ? LIMIT 5",
      [fir.crime_type, fir.district, firId]
    );

    const timeline = [];
    const location = locations[0] || null;

    timeline.push({
      date: fir.date_occurrence,
      type: 'crime_occurrence',
      title: `Crime Occurred: ${fir.crime_type}`,
      description: `${fir.description.substring(0, 200)}`,
      severity: 'critical',
      details: { location: location ? location.address : 'Unknown', district: fir.district }
    });

    timeline.push({
      date: fir.date_reported,
      type: 'fir_filed',
      title: `FIR Filed: ${fir.fir_number}`,
      description: `Case registered at ${fir.police_station}, ${fir.district}. Status: ${fir.status}`,
      severity: 'warning',
      details: { police_station: fir.police_station, status: fir.status }
    });

    const highRiskAccused = accused.filter(a => a.risk_score >= 0.7);
    if (highRiskAccused.length > 0) {
      timeline.push({
        date: fir.date_reported,
        type: 'risk_flag',
        title: `High-Risk Accused Identified: ${highRiskAccused.map(a => a.name).join(', ')}`,
        description: `${highRiskAccused.length} accused with critical risk scores (${highRiskAccused.map(a => `${a.name}: ${(a.risk_score * 100).toFixed(0)}%`).join(', ')})`,
        severity: 'critical',
        details: { accused: highRiskAccused.map(a => ({ name: a.name, score: a.risk_score, gang: a.gang_affiliation })) }
      });
    }

    const gangMembers = accused.filter(a => a.gang_affiliation);
    if (gangMembers.length > 1) {
      const gangs = {};
      gangMembers.forEach(a => {
        if (!gangs[a.gang_affiliation]) gangs[a.gang_affiliation] = [];
        gangs[a.gang_affiliation].push(a.name);
      });
      for (const [gang, members] of Object.entries(gangs)) {
        timeline.push({
          date: fir.date_reported,
          type: 'gang_flag',
          title: `Organized Crime Link: ${gang}`,
          description: `Syndicate '${gang}' linked through accused: ${members.join(', ')}`,
          severity: 'critical',
          details: { gang, members }
        });
      }
    }

    financials.forEach(txn => {
      timeline.push({
        date: txn.transaction_date,
        type: 'financial_transaction',
        title: `${txn.transaction_type}: Rs ${(txn.amount || 0).toLocaleString('en-IN')}`,
        description: `${txn.source_account} → ${txn.destination_account}${txn.is_suspicious ? ' [SUSPICIOUS]' : ''}${txn.suspicion_reason ? ': ' + txn.suspicion_reason : ''}`,
        severity: txn.is_suspicious ? 'critical' : 'info',
        details: { reference_id: txn.reference_id, amount: txn.amount, type: txn.transaction_type }
      });
    });

    caseLinks.forEach(link => {
      const linkedFir = link.source_fir_id == firId ? link.target_fir : link.source_fir;
      timeline.push({
        date: fir.date_reported,
        type: 'case_link',
        title: `Linked Case: ${linkedFir}`,
        description: `${link.link_type.replace('_', ' ')} connection (${(link.confidence_score * 100).toFixed(0)}% confidence): ${link.description}`,
        severity: link.confidence_score > 0.7 ? 'warning' : 'info',
        details: { linked_fir: linkedFir, link_type: link.link_type, confidence: link.confidence_score }
      });
    });

    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    const escalations = [];
    accused.forEach(a => {
      if (a.prior_convictions > 2) escalations.push(`${a.name}: ${a.prior_convictions} prior convictions - HIGH recidivism risk`);
      if (a.risk_score >= 0.8) escalations.push(`${a.name}: Risk score ${(a.risk_score * 100).toFixed(0)}% - CRITICAL threat level`);
    });

    const suspiciousTotal = financials.filter(t => t.is_suspicious).reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalTransactions = financials.reduce((sum, t) => sum + (t.amount || 0), 0);

    const leads = [];
    if (caseLinks.length > 0) leads.push(`Investigate ${caseLinks.length} linked case(s) for network expansion`);
    if (gangMembers.length > 0) leads.push(`Map full syndicate network for ${[...new Set(gangMembers.map(a => a.gang_affiliation))].join(', ')}`);
    if (financials.filter(t => t.is_suspicious).length > 0) leads.push(`Trace ${financials.filter(t => t.is_suspicious).length} suspicious financial transactions worth Rs ${suspiciousTotal.toLocaleString('en-IN')}`);
    if (similarFirs.length > 0) leads.push(`Review ${similarFirs.length} similar cases for MO pattern match`);
    if (accused.some(a => a.prior_convictions > 0)) leads.push(`Cross-reference prior convictions for pattern analysis`);
    leads.push(`Conduct neighborhood canvass at ${location ? location.address : 'crime scene'}`);
    leads.push(`Secure CCTV footage from area surrounding crime location`);

    const moPatterns = await db.execute(`
      SELECT modus_operandi, COUNT(*) as count FROM FIR
      WHERE modus_operandi LIKE ? AND id != ?
      GROUP BY modus_operandi ORDER BY count DESC LIMIT 3
    `, [`%${fir.modus_operandi.split(' ').slice(0, 3).join(' ')}%`, firId]);

    return {
      success: true,
      timeline,
      summary: {
        executive: `${fir.crime_type} case (${fir.fir_number}) in ${fir.district} involving ${accused.length} accused and ${victims.length} victims. ${financials.length} financial transactions traced with Rs ${totalTransactions.toLocaleString('en-IN')} total flow. ${caseLinks.length} linked cases identified.`,
        overview: {
          fir_number: fir.fir_number,
          crime_type: fir.crime_type,
          district: fir.district,
          police_station: fir.police_station,
          status: fir.status,
          date_occurrence: fir.date_occurrence,
          date_reported: fir.date_reported,
          modus_operandi: fir.modus_operandi
        },
        victims: victims.map(v => ({ name: v.name, age: v.age, gender: v.gender, injury: v.injury_type })),
        suspects: accused.map(a => ({
          name: a.name, age: a.age, risk_score: a.risk_score,
          threat_level: a.risk_score >= 0.7 ? 'Critical' : a.risk_score >= 0.4 ? 'Medium' : 'Low',
          gang: a.gang_affiliation, prior_convictions: a.prior_convictions
        })),
        financial: {
          total_transactions: financials.length,
          total_amount: totalTransactions,
          suspicious_count: financials.filter(t => t.is_suspicious).length,
          suspicious_amount: suspiciousTotal
        },
        network: {
          linked_cases: caseLinks.length,
          similar_cases: similarFirs.length,
          mo_patterns: moPatterns.length
        },
        leads,
        escalations
      },
      suspects: accused,
      leads
    };
  } catch (err) {
    console.error('Investigation timeline failed:', err);
    return { success: false, error: err.message };
  }
};
