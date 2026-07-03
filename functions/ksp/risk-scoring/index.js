const catalyst = require('../shared/catalyst-sdk').getInitializer();

module.exports = async (accusedName, modifiers = {}, scope = null) => {
  try {
    const db = catalyst.datastore();
    
    // Find accused details (selecting police_station for RLS checks)
    // Use REPLACE to handle LLM-generated names that may differ from DB (e.g., quotes around aliases)
    const accusedRecords = await db.execute(`
      SELECT a.*, f.fir_number, f.crime_type, f.district, f.police_station, f.date_reported
      FROM FIR_Accused a
      JOIN FIR f ON a.fir_id = f.id
      WHERE a.name LIKE ?
         OR REPLACE(a.name, '''', '') LIKE ?
    `, [`%${accusedName}%`, `%${accusedName}%`]);

    if (accusedRecords.length === 0) {
      return { success: false, message: `No accused profile found matching '${accusedName}'` };
    }

    // Verify at least one incident is within the user's jurisdiction
    if (scope && scope.type !== 'statewide') {
      const hasInScopeIncident = accusedRecords.some(r => {
        if (scope.type === 'station') return r.police_station === scope.value;
        if (scope.type === 'district') return r.district === scope.value;
        return true;
      });
      if (!hasInScopeIncident) {
        return { success: false, message: `No accused profile found matching '${accusedName}' within your jurisdiction.` };
      }
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
      behavioral_profile: {},
      incidents: accusedRecords.map(r => {
        const inScope = !scope || scope.type === 'statewide' || 
          (scope.type === 'station' && r.police_station === scope.value) ||
          (scope.type === 'district' && r.district === scope.value);
        if (inScope) {
          return {
            fir_id: r.fir_id,
            fir_number: r.fir_number,
            crime_type: r.crime_type,
            district: r.district,
            date: r.date_reported
          };
        } else {
          return {
            fir_id: null,
            fir_number: "[RESTRICTED - JURISDICTION]",
            crime_type: "[RESTRICTED - JURISDICTION]",
            district: r.district,
            date: "[RESTRICTED]"
          };
        }
      })
    };

    // Behavioral Analysis
    const crimeTypes = [...new Set(accusedRecords.map(r => r.crime_type))];
    const districts = [...new Set(accusedRecords.map(r => r.district))];
    const dateRange = accusedRecords.map(r => new Date(r.date_reported)).sort((a, b) => a - b);
    const firstOffense = dateRange[0];
    const lastOffense = dateRange[dateRange.length - 1];
    const activePeriodDays = firstOffense && lastOffense ? Math.ceil((lastOffense - firstOffense) / (1000 * 60 * 60 * 24)) : 0;

    const moPatterns = await db.execute(`
      SELECT f.modus_operandi, COUNT(*) as count
      FROM FIR_Accused a JOIN FIR f ON a.fir_id = f.id
      WHERE a.name LIKE ? OR REPLACE(a.name, '''', '') LIKE ?
      GROUP BY f.modus_operandi ORDER BY count DESC
    `, [`%${accusedName}%`, `%${accusedName}%`]);

    const escalationDetected = accusedRecords.length >= 2 &&
      accusedRecords[accusedRecords.length - 1].risk_score > accusedRecords[0].risk_score;

    const crossDistrict = districts.length > 1;

    profile.behavioral_profile = {
      crime_diversity: crimeTypes.length,
      crime_types: crimeTypes,
      geographic_reach: districts.length,
      districts_active: districts,
      active_period_days: activePeriodDays,
      mo_patterns: moPatterns.map(m => ({ pattern: m.modus_operandi, frequency: m.count })),
      escalation_detected: escalationDetected,
      cross_district_operations: crossDistrict,
      behavioral_classification: priorConvictions >= 3 ? 'Habitual/Professional'
        : priorConvictions >= 1 ? 'Repeat Offender'
        : gangAffiliation ? 'Gang-Associated'
        : crimeTypes.length > 2 ? 'Versatile Offender'
        : 'First-time/Specialist',
      spatial_pattern: crossDistrict ? 'Mobile/Jurisdiction-hopping' : districts.length === 1 ? 'Localized' : 'Multi-district',
      tempo_pattern: activePeriodDays < 30 ? 'Rapid-fire' : activePeriodDays < 180 ? 'Sustained campaign' : 'Long-term pattern'
    };

    return { success: true, profile };
  } catch (err) {
    console.error('Risk score execution failed:', err);
    return { success: false, error: err.message };
  }
};
