const catalyst = require('../shared/catalyst-sdk').getInitializer();

module.exports = async (firId) => {
  try {
    const db = catalyst.datastore();

    const firs = await db.execute("SELECT * FROM FIR WHERE id = ?", [firId]);
    if (firs.length === 0) return { success: false, error: "FIR not found" };
    const fir = firs[0];

    const accused = await db.execute("SELECT * FROM FIR_Accused WHERE fir_id = ?", [firId]);
    const victims = await db.execute("SELECT * FROM FIR_Victim WHERE fir_id = ?", [firId]);
    const locations = await db.execute("SELECT * FROM Location WHERE fir_id = ?", [firId]);
    const financials = await db.execute("SELECT * FROM FinancialTransaction WHERE fir_id = ?", [firId]);
    const caseLinks = await db.execute(`
      SELECT cl.*, f1.fir_number as source_fir, f2.fir_number as target_fir,
             f1.crime_type as source_crime, f2.crime_type as target_crime
      FROM CaseLinks cl
      JOIN FIR f1 ON cl.source_fir_id = f1.id
      JOIN FIR f2 ON cl.target_fir_id = f2.id
      WHERE cl.source_fir_id = ? OR cl.target_fir_id = ?
    `, [firId, firId]);

    const similarFirs = await db.execute(
      "SELECT fir_number, crime_type, district, status, date_reported, modus_operandi FROM FIR WHERE crime_type = ? AND id != ? LIMIT 5",
      [fir.crime_type, firId]
    );

    const location = locations[0] || null;
    const totalAmount = financials.reduce((sum, t) => sum + (t.amount || 0), 0);
    const suspiciousAmount = financials.filter(t => t.is_suspicious).reduce((sum, t) => sum + (t.amount || 0), 0);
    const avgRiskScore = accused.length > 0 ? accused.reduce((sum, a) => sum + (a.risk_score || 0), 0) / accused.length : 0;

    const executive = `${fir.crime_type} case registered as ${fir.fir_number} at ${fir.police_station}, ${fir.district} on ${fir.date_reported}. ` +
      `Crime occurred on ${fir.date_occurrence}. Involves ${accused.length} accused person(s) and ${victims.length} victim(s). ` +
      `${financials.length} financial transactions traced totaling Rs ${totalAmount.toLocaleString('en-IN')}, of which Rs ${suspiciousAmount.toLocaleString('en-IN')} flagged as suspicious. ` +
      `${caseLinks.length} linked case(s) identified. Case status: ${fir.status}.`;

    const riskFactors = [];
    accused.forEach(a => {
      if (a.risk_score >= 0.7) riskFactors.push({ factor: `${a.name} risk score`, impact: 'Critical', detail: `${(a.risk_score * 100).toFixed(0)}% recidivism probability` });
      if (a.prior_convictions > 0) riskFactors.push({ factor: `${a.name} criminal history`, impact: 'High', detail: `${a.prior_convictions} prior conviction(s)` });
      if (a.gang_affiliation) riskFactors.push({ factor: `Gang link: ${a.gang_affiliation}`, impact: 'High', detail: `Organized crime network involvement` });
    });

    const evidence = [];
    if (financials.filter(t => t.is_suspicious).length > 0) {
      evidence.push(`${financials.filter(t => t.is_suspicious).length} suspicious financial transactions identified - potential money laundering trail`);
    }
    if (caseLinks.length > 0) {
      evidence.push(`${caseLinks.length} linked cases found - possible serial or organized crime pattern`);
    }
    const gangMembers = accused.filter(a => a.gang_affiliation);
    if (gangMembers.length > 1) {
      const gangs = [...new Set(gangMembers.map(a => a.gang_affiliation))];
      evidence.push(`Multiple accused linked to syndicate(s): ${gangs.join(', ')}`);
    }
    if (similarFirs.length >= 2) {
      evidence.push(`${similarFirs.length} similar cases with matching MO pattern detected across the district`);
    }

    const leads = [];
    if (accused.some(a => a.prior_convictions > 0)) leads.push({ priority: 1, action: 'Cross-reference prior conviction records for pattern analysis', rationale: 'Repeat offender behavior suggests organized methodology' });
    if (financials.filter(t => t.is_suspicious).length > 0) leads.push({ priority: 1, action: 'Trace suspicious financial transactions through banking channels', rationale: `Rs ${suspiciousAmount.toLocaleString('en-IN')} in flagged transactions require source verification` });
    if (gangMembers.length > 0) leads.push({ priority: 2, action: 'Map full syndicate association network', rationale: 'Organized crime group involvement requires network-level investigation' });
    if (caseLinks.length > 0) leads.push({ priority: 2, action: `Investigate ${caseLinks.length} linked case(s) for shared intelligence`, rationale: 'Linked cases may reveal broader criminal operation' });
    if (similarFirs.length > 0) leads.push({ priority: 3, action: 'Review similar cases for joint investigation potential', rationale: 'Common MO suggests potential serial offender' });
    leads.push({ priority: 3, action: 'Secure and review CCTV footage from crime vicinity', rationale: 'Standard evidence preservation protocol' });
    leads.push({ priority: 4, action: 'Conduct neighborhood canvass for witness statements', rationale: 'Community intelligence may reveal unstated connections' });

    leads.sort((a, b) => a.priority - b.priority);

    return {
      success: true,
      summary: {
        executive,
        overview: {
          fir_number: fir.fir_number,
          crime_type: fir.crime_type,
          district: fir.district,
          police_station: fir.police_station,
          status: fir.status,
          date_occurrence: fir.date_occurrence,
          date_reported: fir.date_reported,
          description: fir.description,
          modus_operandi: fir.modus_operandi,
          location: location ? { address: location.address, area_type: location.area_type, lat: location.latitude, lng: location.longitude } : null
        },
        victims: victims.map(v => ({ name: v.name, age: v.age, gender: v.gender, occupation: v.occupation, injury_type: v.injury_type })),
        suspects: accused.map(a => ({
          name: a.name, age: a.age, gender: a.gender, occupation: a.occupation,
          risk_score: a.risk_score,
          threat_level: a.risk_score >= 0.7 ? 'Critical' : a.risk_score >= 0.4 ? 'Medium' : 'Low',
          gang: a.gang_affiliation, prior_convictions: a.prior_convictions,
          education: a.education_level, migration: a.migration_status
        })),
        financial: {
          total_transactions: financials.length,
          total_amount: totalAmount,
          suspicious_count: financials.filter(t => t.is_suspicious).length,
          suspicious_amount: suspiciousAmount,
          transactions: financials.map(t => ({
            date: t.transaction_date, type: t.transaction_type,
            amount: t.amount, suspicious: !!t.is_suspicious,
            reason: t.suspicion_reason, ref: t.reference_id
          }))
        },
        network: {
          linked_cases: caseLinks.map(l => ({
            fir: l.source_fir_id == firId ? l.target_fir : l.source_fir,
            link_type: l.link_type, confidence: l.confidence_score,
            description: l.description
          })),
          similar_cases: similarFirs.map(s => ({
            fir_number: s.fir_number, crime_type: s.crime_type,
            district: s.district, status: s.status
          }))
        },
        leads,
        evidence
      },
      riskAssessment: {
        overall: avgRiskScore,
        level: avgRiskScore >= 0.7 ? 'Critical' : avgRiskScore >= 0.4 ? 'Medium' : 'Low',
        factors: riskFactors
      }
    };
  } catch (err) {
    console.error('Case summary generation failed:', err);
    return { success: false, error: err.message };
  }
};
