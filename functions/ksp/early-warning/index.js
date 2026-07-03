const catalyst = require('../shared/catalyst-sdk').getInitializer();

module.exports = async (scope = null) => {
  try {
    const db = catalyst.datastore();
    const alerts = [];

    let scopeFilter = "";
    let scopeParams = [];
    if (scope && scope.type === 'district') {
      scopeFilter = " AND f.district = ?";
      scopeParams = [scope.value];
    } else if (scope && scope.type === 'station') {
      scopeFilter = " AND f.police_station = ?";
      scopeParams = [scope.value];
    }

    const repeatOffenders = await db.execute(`
      SELECT a.name, COUNT(DISTINCT a.fir_id) as case_count, MAX(a.risk_score) as max_risk,
             a.gang_affiliation, a.prior_convictions,
             GROUP_CONCAT(DISTINCT f.fir_number) as fir_numbers,
             GROUP_CONCAT(DISTINCT f.district) as districts,
             GROUP_CONCAT(DISTINCT f.crime_type) as crime_types
      FROM FIR_Accused a
      JOIN FIR f ON a.fir_id = f.id
      WHERE 1=1 ${scopeFilter}
      GROUP BY a.name
      HAVING case_count > 1
      ORDER BY max_risk DESC, case_count DESC
      LIMIT 20
    `, scopeParams);

    repeatOffenders.forEach(offender => {
      const severity = offender.max_risk >= 0.8 ? 'Critical' : offender.max_risk >= 0.5 ? 'High' : 'Medium';
      alerts.push({
        type: 'REPEAT_OFFENDER',
        severity,
        title: `Repeat Offender: ${offender.name}`,
        description: `${offender.case_count} cases across ${offender.districts}. Risk score: ${(offender.max_risk * 100).toFixed(0)}%. ${offender.prior_convictions} prior convictions.`,
        name: offender.name,
        case_count: offender.case_count,
        risk_score: offender.max_risk,
        fir_numbers: offender.fir_numbers ? offender.fir_numbers.split(',') : [],
        districts: offender.districts ? offender.districts.split(',') : [],
        crime_types: offender.crime_types ? offender.crime_types.split(',') : [],
        recommendation: severity === 'Critical'
          ? `IMMEDIATE: Deploy surveillance on ${offender.name}. Alert all stations in ${offender.districts}. Coordinate with anti-gang unit.`
          : `Priority monitoring. Flag for next bail hearing review. Update history sheet.`
      });
    });

    const gangActivity = await db.execute(`
      SELECT a.gang_affiliation as gang_name,
             COUNT(DISTINCT a.name) as member_count,
             COUNT(DISTINCT a.fir_id) as total_cases,
             GROUP_CONCAT(DISTINCT f.district) as districts,
             GROUP_CONCAT(DISTINCT a.name) as members,
             MAX(a.risk_score) as max_risk
      FROM FIR_Accused a
      JOIN FIR f ON a.fir_id = f.id
      WHERE a.gang_affiliation IS NOT NULL ${scopeFilter}
      GROUP BY a.gang_affiliation
      HAVING member_count >= 2
      ORDER BY total_cases DESC
    `, scopeParams);

    gangActivity.forEach(gang => {
      const severity = gang.total_cases >= 5 ? 'Critical' : gang.total_cases >= 3 ? 'High' : 'Medium';
      alerts.push({
        type: 'GANG_ACTIVITY',
        severity,
        title: `Gang Activity: ${gang.gang_name}`,
        description: `${gang.member_count} identified members linked to ${gang.total_cases} cases across ${gang.districts}. Active syndicate requiring inter-district coordination.`,
        gang_name: gang.gang_name,
        member_count: gang.member_count,
        total_cases: gang.total_cases,
        districts_active: gang.districts ? gang.districts.split(',') : [],
        members: gang.members ? gang.members.split(',') : [],
        recommendation: severity === 'Critical'
          ? `URGENT: Constitute special task force for ${gang.gang_name}. Coordinate across ${gang.districts}. Execute financial intelligence sweep on all known accounts.`
          : `Monitor member movements. Map association network. Schedule intelligence briefing.`
      });
    });

    const moClusters = await db.execute(`
      SELECT modus_operandi, COUNT(*) as case_count,
             GROUP_CONCAT(DISTINCT district) as districts,
             GROUP_CONCAT(DISTINCT fir_number) as fir_numbers
      FROM FIR
      WHERE modus_operandi IS NOT NULL ${scopeFilter}
      GROUP BY modus_operandi
      HAVING case_count >= 2
      ORDER BY case_count DESC
      LIMIT 15
    `, scopeParams);

    moClusters.forEach(cluster => {
      const severity = cluster.case_count >= 4 ? 'High' : 'Medium';
      alerts.push({
        type: 'MO_CLUSTER',
        severity,
        title: `MO Pattern Cluster: ${cluster.modus_operandi.substring(0, 60)}...`,
        description: `${cluster.case_count} cases sharing identical modus operandi across ${cluster.districts}. Potential serial offender pattern.`,
        pattern: cluster.modus_operandi,
        case_count: cluster.case_count,
        affected_districts: cluster.districts ? cluster.districts.split(',') : [],
        fir_numbers: cluster.fir_numbers ? cluster.fir_numbers.split(',') : [],
        recommendation: `Conduct MO cross-reference analysis. Check accused overlap across cases. Consider geographic profiling for serial pattern.`
      });
    });

    const geoClusters = await db.execute(`
      SELECT l.district, l.area_type, COUNT(*) as incident_count,
             AVG(l.latitude) as avg_lat, AVG(l.longitude) as avg_lng,
             COUNT(DISTINCT f.crime_type) as crime_variety
      FROM Location l
      JOIN FIR f ON l.fir_id = f.id
      WHERE 1=1 ${scopeFilter.replace('f.district', 'l.district').replace('f.police_station', 'l.district')}
      GROUP BY l.district, l.area_type
      HAVING incident_count >= 3
      ORDER BY incident_count DESC
    `, scopeParams);

    geoClusters.forEach(cluster => {
      const severity = cluster.incident_count >= 8 ? 'High' : 'Medium';
      alerts.push({
        type: 'GEOGRAPHIC_CLUSTER',
        severity,
        title: `Geographic Hotspot: ${cluster.district} (${cluster.area_type})`,
        description: `${cluster.incident_count} incidents concentrated in ${cluster.district} ${cluster.area_type} areas. ${cluster.crime_variety} different crime types detected.`,
        district: cluster.district,
        area_type: cluster.area_type,
        incident_count: cluster.incident_count,
        concentration_score: Math.min(1.0, cluster.incident_count / 15),
        recommendation: `Increase patrol frequency in ${cluster.district} ${cluster.area_type} zones. Deploy community policing initiatives. Review CCTV coverage gaps.`
      });
    });

    const escalationPatterns = await db.execute(`
      SELECT a.name, a.gang_affiliation,
             COUNT(DISTINCT a.fir_id) as case_count,
             MIN(a.risk_score) as initial_risk,
             MAX(a.risk_score) as current_risk,
             GROUP_CONCAT(DISTINCT f.date_reported ORDER BY f.date_reported) as dates
      FROM FIR_Accused a
      JOIN FIR f ON a.fir_id = f.id
      WHERE 1=1 ${scopeFilter}
      GROUP BY a.name
      HAVING case_count >= 2 AND current_risk > initial_risk
      ORDER BY (current_risk - initial_risk) DESC
      LIMIT 10
    `, scopeParams);

    escalationPatterns.forEach(pattern => {
      const scoreChange = pattern.current_risk - pattern.initial_risk;
      alerts.push({
        type: 'ESCALATION',
        severity: scoreChange > 0.3 ? 'Critical' : 'High',
        title: `Escalation Pattern: ${pattern.name}`,
        description: `Risk score escalated from ${(pattern.initial_risk * 100).toFixed(0)}% to ${(pattern.current_risk * 100).toFixed(0)}% across ${pattern.case_count} incidents. Behavioral escalation detected.`,
        name: pattern.name,
        score_change: scoreChange,
        incidents: pattern.case_count,
        recommendation: `URGENT: Escalating threat profile. Recommend preemptive surveillance increase. Alert patrol units in operating area. Schedule threat assessment briefing.`
      });
    });

    const recentCluster = await db.execute(`
      SELECT f.district, COUNT(*) as incident_count,
             MIN(f.date_reported) as window_start,
             MAX(f.date_reported) as window_end
      FROM FIR f
      WHERE f.date_reported >= date('now', '-7 days') ${scopeFilter}
      GROUP BY f.district
      HAVING incident_count >= 2
      ORDER BY incident_count DESC
    `, scopeParams);

    recentCluster.forEach(cluster => {
      alerts.push({
        type: 'TEMPORAL_CLUSTER',
        severity: cluster.incident_count >= 5 ? 'Critical' : 'High',
        title: `Temporal Surge: ${cluster.district}`,
        description: `${cluster.incident_count} incidents in the last 7 days in ${cluster.district} (${cluster.window_start} to ${cluster.window_end}). Abnormal spike detected.`,
        district: cluster.district,
        incident_count: cluster.incident_count,
        time_window: `${cluster.window_start} to ${cluster.window_end}`,
        recommendation: `IMMEDIATE: Deploy additional patrol units to ${cluster.district}. Activate community alert system. Brief station-level officers on pattern.`
      });
    });

    alerts.sort((a, b) => {
      const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (order[a.severity] || 3) - (order[b.severity] || 3);
    });

    const criticalCount = alerts.filter(a => a.severity === 'Critical').length;
    const highCount = alerts.filter(a => a.severity === 'High').length;

    const recommendations = [];
    if (criticalCount > 0) recommendations.push(`${criticalCount} CRITICAL alerts require immediate tactical response`);
    if (gangActivity.length > 0) recommendations.push(`Coordinate inter-district operations against ${gangActivity.length} active syndicates`);
    if (repeatOffenders.length > 0) recommendations.push(`Prioritize surveillance on ${repeatOffenders.length} repeat offenders`);
    if (geoClusters.length > 0) recommendations.push(`Increase patrol density in ${geoClusters.length} geographic hotspots`);
    if (escalationPatterns.length > 0) recommendations.push(`${escalationPatterns.length} offenders showing behavioral escalation - reassess threat levels`);

    return {
      success: true,
      alerts,
      summary: {
        total_alerts: alerts.length,
        critical_count: criticalCount,
        high_count: highCount,
        repeat_offenders: repeatOffenders.length,
        active_gangs: gangActivity.length,
        mo_clusters: moClusters.length,
        geo_hotspots: geoClusters.length,
        escalations: escalationPatterns.length,
        temporal_surges: recentCluster.length,
        recommendations
      }
    };
  } catch (err) {
    console.error('Early warning system failed:', err);
    return { success: false, error: err.message };
  }
};
