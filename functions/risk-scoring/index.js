const catalyst = require('../shared/catalyst-sdk').getInitializer();

module.exports = async (accusedName, modifiers = {}) => {
  try {
    const db = catalyst.datastore();
    
    // Find accused details
    const accusedRecords = await db.execute(`
      SELECT a.*, f.fir_number, f.crime_type, f.district, f.date_reported
      FROM Accused a
      JOIN FIR f ON a.fir_id = f.id
      WHERE a.name LIKE ?
    `, [`%${accusedName}%`]);

    if (accusedRecords.length === 0) {
      return { success: false, message: `No accused profile found matching '${accusedName}'` };
    }

    // Aggregate profile details (in case they have multiple cases)
    const primaryRecord = accusedRecords[0];
    const priorConvictions = primaryRecord.prior_convictions;
    const gangAffiliation = primaryRecord.gang_affiliation;
    const age = primaryRecord.age;
    
    let riskScore = primaryRecord.risk_score;

    // Get socio-economic indicators for their last active district
    const socioInfo = await db.execute(`
      SELECT * FROM SocioEconomicIndicators WHERE district = ?
    `, [primaryRecord.district]);
    
    const districtStats = socioInfo.length > 0 ? socioInfo[0] : null;

    // Calculate risk factors breakdown
    const factors = [];
    if (priorConvictions > 0) {
      factors.push({
        factor: "Criminal History",
        impact: "High",
        detail: `${priorConvictions} prior conviction(s) registered.`
      });
    } else {
      factors.push({
        factor: "Criminal History",
        impact: "Low",
        detail: "No prior convictions registered."
      });
    }

    if (gangAffiliation) {
      factors.push({
        factor: "Syndicate Alliance",
        impact: "High",
        detail: `Affiliated with organized syndicate: '${gangAffiliation}'.`
      });
    }

    if (age && age < 25) {
      factors.push({
        factor: "Age Demographics",
        impact: "Medium",
        detail: "Young offender age group (under 25) linked to high recidivism."
      });
    }

    if (districtStats && districtStats.unemployment_rate > 6.0) {
      factors.push({
        factor: "Environmental Index",
        impact: "Medium",
        detail: `Active in district with high unemployment (${districtStats.unemployment_rate}%).`
      });
    }

    // Apply modifiers dynamically if selected
    if (modifiers.warrant) {
      riskScore = Math.min(1.0, riskScore + 0.25);
      factors.push({
        factor: "Active Warrant",
        impact: "Critical",
        detail: "Accused is currently absconding with an active arrest warrant."
      });
    }
    if (modifiers.weapon) {
      riskScore = Math.min(1.0, riskScore + 0.15);
      factors.push({
        factor: "Weapon Association",
        impact: "High",
        detail: "Accused has a history of violent offences involving illegal firearms or weapons."
      });
    }
    if (modifiers.hawala) {
      riskScore = Math.min(1.0, riskScore + 0.20);
      factors.push({
        factor: "Hawala Linkage",
        impact: "High",
        detail: "Suspicious bank accounts and hawala transaction lines are linked to the accused."
      });
    }
    if (modifiers.history) {
      riskScore = Math.min(1.0, riskScore + 0.15);
      factors.push({
        factor: "Habitual Offender",
        impact: "High",
        detail: "Classified as a habitual repeat offender with high recidivism risk."
      });
    }

    // Determine threat level and recommendations
    let threatLevel = "Low";
    let recommendation = "Routine monitoring during patrol rounds.";
    if (riskScore >= 0.7) {
      threatLevel = "Critical";
      recommendation = "Immediate intelligence intercept, active surveillance, deny bail recommendations.";
    } else if (riskScore >= 0.4) {
      threatLevel = "Medium";
      recommendation = "Periodic check-ins, record monitoring, update history sheet.";
    }

    // Compile profile
    const profile = {
      name: primaryRecord.name,
      age: primaryRecord.age,
      gender: primaryRecord.gender,
      occupation: primaryRecord.occupation,
      address: primaryRecord.address,
      gang_affiliation: gangAffiliation,
      prior_convictions: priorConvictions,
      overall_score: riskScore,
      threat_level: threatLevel,
      factors: factors,
      recommendation: recommendation,
      incidents: accusedRecords.map(r => ({
        fir_id: r.fir_id,
        fir_number: r.fir_number,
        crime_type: r.crime_type,
        district: r.district,
        date: r.date_reported
      }))
    };

    return { success: true, profile };
  } catch (err) {
    console.error('Risk score execution failed:', err);
    return { success: false, error: err.message };
  }
};
