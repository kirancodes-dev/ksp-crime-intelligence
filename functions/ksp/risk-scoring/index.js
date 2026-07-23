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

    // Calculate investigative priority factors breakdown (evidence & case history grounded)
    const factors = [];
    if (priorConvictions > 0) {
      factors.push({
        factor: "Criminal Record History",
        impact: "High",
        detail: `${priorConvictions} prior conviction(s) verified in CCTNS records.`
      });
    } else {
      factors.push({
        factor: "Criminal Record History",
        impact: "Low",
        detail: "No prior verified convictions in record database."
      });
    }

    if (gangAffiliation) {
      factors.push({
        factor: "Syndicate Linkage",
        impact: "High",
        detail: `Verified association with organized syndicate: '${gangAffiliation}'.`
      });
    }

    // Apply evidence-grounded case modifiers if specified
    if (modifiers.warrant) {
      riskScore = Math.min(1.0, riskScore + 0.25);
      factors.push({
        factor: "Active Judicial Warrant",
        impact: "Critical",
        detail: "Active arrest warrant outstanding issued by competent court."
      });
    }
    if (modifiers.weapon) {
      riskScore = Math.min(1.0, riskScore + 0.15);
      factors.push({
        factor: "Weapon Seizure Linkage",
        impact: "High",
        detail: "Case evidence includes illegal firearms or seized offensive weapons."
      });
    }
    if (modifiers.hawala) {
      riskScore = Math.min(1.0, riskScore + 0.20);
      factors.push({
        factor: "Financial Trail Anomaly",
        impact: "High",
        detail: "High-value suspicious transactions and hawala channels linked to case."
      });
    }
    if (modifiers.history) {
      riskScore = Math.min(1.0, riskScore + 0.15);
      factors.push({
        factor: "Repeat Case Pattern",
        impact: "High",
        detail: "Multiple similar modus-operandi incidents recorded across police stations."
      });
    }

    // Determine case investigative priority (Human-in-the-loop oversight compliant)
    let threatLevel = "Standard";
    let recommendation = "Routine case file monitoring and verification of evidence chain.";
    if (riskScore >= 0.7) {
      threatLevel = "High Priority";
      recommendation = "High-priority investigative review: Verify outstanding warrants, coordinate multi-station intelligence, and present evidence dossier to senior investigating officer.";
    } else if (riskScore >= 0.4) {
      threatLevel = "Medium Priority";
      recommendation = "Standard investigative review: Update case history sheets, verify witness statements, and monitor related syndicate linkages.";
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
      investigative_priority_score: riskScore,
      priority_classification: threatLevel,
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
