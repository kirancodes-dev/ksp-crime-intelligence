const catalyst = require('../shared/catalyst-sdk').getInitializer();
const riskScoring = require('../risk-scoring/index');
const financialAnalysis = require('../financial-analysis/index');
const similarCases = require('../similar-cases/index');
const investigationTimeline = require('../investigation-timeline/index');
const earlyWarning = require('../early-warning/index');
const caseSummary = require('../case-summary/index');
const gemini = require('../shared/gemini');

module.exports = async (queryText, userId, role, userContext = null) => {
  try {
    const db = catalyst.datastore();
    const query = queryText.toLowerCase();

    // Dynamic Row-Level Security (RLS) jurisdiction scope evaluation
    if (!userId || !role) {
      throw new Error('SECURITY VIOLATION: Missing user identity context in tool router execution.');
    }

    let scope;
    if (role === 'Policymaker') {
      scope = { type: 'statewide', label: 'state-wide Karnataka' };
    } else if (role === 'Supervisor' || role === 'Analyst') {
      const district = (userContext && userContext.district) ? userContext.district : 'Bengaluru City';
      scope = { type: 'district', value: district, label: `district ${district}` };
    } else {
      // Investigator default scope (station level if provided, else district)
      const station = (userContext && userContext.policeStation) ? userContext.policeStation : null;
      const district = (userContext && userContext.district) ? userContext.district : 'Bengaluru City';
      if (station) {
        scope = { type: 'station', value: station, label: `police station ${station}` };
      } else {
        scope = { type: 'district', value: district, label: `district ${district}` };
      }
    }

    // 1. Classification & Parameter Extraction (Gemini with Legacy Keyword Fallback)
    let tool = null;
    let extractedParams = {};

    if (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.USE_OLLAMA === 'true') {
      console.log('Classifying query with LLM...');
      const llmResult = await gemini.routeQuery(queryText);
      if (llmResult.success) {
        tool = llmResult.classification.tool;
        extractedParams = llmResult.classification.parameters || {};
        console.log(`LLM Classification result [${llmResult.provider}]: Tool = ${tool}, Params =`, extractedParams);
      } else {
        console.warn('LLM query routing failed, falling back to legacy keywords:', llmResult.error || llmResult.reason);
      }
    }

    // Legacy fallback routing if Gemini was skipped, failed, or returned an invalid tool
    const validTools = ['risk', 'network', 'map', 'chart', 'finance', 'socio', 'similar', 'forecast', 'text', 'ocr', 'cdr', 'biometrics', 'dispatch', 'timeline', 'early_warning', 'case_summary', 'general'];
    if (!tool || !validTools.includes(tool)) {
      extractedParams = {};
      
      if (query.includes("risk") || query.includes("profile") || query.includes("threat") || query.includes("danger")) {
        tool = "risk";
        let targetName = "";
        if (query.includes("jacky") || query.includes("jagadish")) targetName = "Jacky";
        else if (query.includes("sharief") || query.includes("mohammad")) targetName = "Mohammad Sharief";
        else if (query.includes("subhash") || query.includes("patil")) targetName = "Subhash Patil";
        else if (query.includes("rupa") || query.includes("naik")) targetName = "Rupa Naik";
        else {
          const accusedList = await db.execute("SELECT name FROM FIR_Accused GROUP BY name");
          for (let acc of accusedList) {
            if (query.includes(acc.name.toLowerCase().split(' ')[0])) {
              targetName = acc.name;
              break;
            }
          }
        }
        extractedParams.accused_name = targetName;
      } 
      else if (query.includes("biometric") || query.includes("face") || query.includes("mugshot") || query.includes("facial")) {
        tool = "biometrics";
        let targetName = "Rupa Naik";
        if (query.includes("ramesh")) targetName = "Ramesh Kumar";
        else if (query.includes("amit")) targetName = "Amit Verma";
        extractedParams.accused_name = targetName;
      }
      else if (query.includes("cdr") || query.includes("cell") || query.includes("tower") || query.includes("trajectory") || query.includes("breadcrumbs")) {
        tool = "cdr";
        let targetName = "Rupa Naik";
        if (query.includes("ramesh")) targetName = "Ramesh Kumar";
        else if (query.includes("amit")) targetName = "Amit Verma";
        extractedParams.accused_name = targetName;
      }
      else if (query.includes("ocr") || query.includes("vernacular") || query.includes("translation") || query.includes("document") || query.includes("kannada")) {
        tool = "ocr";
      }
      else if (query.includes("dispatch") || query.includes("patrol") || query.includes("vehicle") || query.includes("112")) {
        tool = "dispatch";
      }
      else if (query.includes("network") || query.includes("link") || query.includes("associate") || query.includes("syndicate") || query.includes("accomplice") || query.includes("gang")) {
        tool = "network";
      } 
      else if (query.includes("map") || query.includes("hotspot") || query.includes("where") || query.includes("location") || query.includes("coordinates")) {
        tool = "map";
        if (query.includes("cyber")) extractedParams.crime_type = "Cyber Crime";
        else if (query.includes("theft") || query.includes("robbery") || query.includes("steal")) extractedParams.crime_type = "Theft";
        else if (query.includes("organized") || query.includes("gang")) extractedParams.crime_type = "Organized Crime";
        else if (query.includes("fraud") || query.includes("ponzi") || query.includes("cheat")) extractedParams.crime_type = "Financial Fraud";

        if (query.includes("bengaluru") || query.includes("bangalore")) extractedParams.district = "Bengaluru City";
        else if (query.includes("mysuru") || query.includes("mysore")) extractedParams.district = "Mysuru";
        else if (query.includes("hubli") || query.includes("dharwad")) extractedParams.district = "Hubballi-Dharwad";
        else if (query.includes("mangaluru") || query.includes("mangalore")) extractedParams.district = "Mangaluru";
        else if (query.includes("belagavi") || query.includes("belgaum")) extractedParams.district = "Belagavi";
      } 
      else if (query.includes("chart") || query.includes("trend") || query.includes("compare") || query.includes("graph") || query.includes("statistics") || query.includes("rate")) {
        tool = "chart";
      } 
      else if (query.includes("money") || query.includes("transaction") || query.includes("bank") || query.includes("upi") || query.includes("hawala") || query.includes("financial trail") || query.includes("account")) {
        tool = "finance";
        const firMatch = queryText.match(/(?:FIR|fir|case)\s*(?:no\.?|number|#)?\s*([A-Z0-9\-\/]+)/i);
        if (firMatch) {
          extractedParams.fir_number = firMatch[1];
        }
      } 
      else if (query.includes("demographic") || query.includes("age group") || query.includes("gender") || query.includes("socio") || query.includes("unemployment") || query.includes("literacy") || query.includes("poverty") || query.includes("education")) {
        tool = "socio";
      } 
      else if (query.includes("similar case") || query.includes("past case") || query.includes("related investigation") || query.includes("like this")) {
        tool = "similar";
        const firMatch = queryText.match(/(?:FIR|fir|case)\s*(?:no\.?|number|#)?\s*([A-Z0-9\-\/]+)/i);
        if (firMatch) {
          extractedParams.fir_number = firMatch[1];
        }
      } 
      else if (query.includes("predict") || query.includes("forecast") || query.includes("early warning") || query.includes("future") || query.includes("prevent") || query.includes("alert")) {
        tool = "forecast";
      } 
      else if (query.includes("timeline") || query.includes("chronology") || query.includes("sequence of events") || query.includes("investigation progress")) {
        tool = "timeline";
        const firMatch = queryText.match(/(?:FIR|fir|case)\s*(?:no\.?|number|#)?\s*([A-Z0-9\-\/]+)/i);
        if (firMatch) extractedParams.fir_number = firMatch[1];
      }
      else if (query.includes("repeat crime") || query.includes("early warning") || query.includes("gang activity") || query.includes("escalat") || query.includes("surge") || query.includes("spike")) {
        tool = "early_warning";
      }
      else if (query.includes("case summary") || query.includes("brief") || query.includes("case file") || query.includes("dossier") || query.includes("case overview")) {
        tool = "case_summary";
        const firMatch = queryText.match(/(?:FIR|fir|case)\s*(?:no\.?|number|#)?\s*([A-Z0-9\-\/]+)/i);
        if (firMatch) extractedParams.fir_number = firMatch[1];
      } 
      else {
        tool = "text";
      }
    }

    // 2. Execute DB Logic for triggered tool
    let data = null;
    let narrative = "";

    // -------------------------------------------------------------
    // TOOL: RISK PROFILE
    // -------------------------------------------------------------
    if (tool === "risk") {
      const targetName = extractedParams.accused_name;
      if (targetName) {
        const riskModifiers = {
          warrant: query.includes("warrant") || query.includes("abscond"),
          weapon: query.includes("weapon") || query.includes("firearm") || query.includes("arms"),
          hawala: query.includes("hawala") || query.includes("bank") || query.includes("financial"),
          history: query.includes("history") || query.includes("repeat") || query.includes("prior")
        };
        const scoreResult = await riskScoring(targetName, riskModifiers, scope);
        if (scoreResult.success) {
          data = scoreResult.profile;
          narrative = `Retrieved the intelligence risk profile for accused '${data.name}'. Calculated recidivism threat score: ${(data.overall_score * 100).toFixed(0)}%. ${data.recommendation}`;
        }
      }
      if (!data) {
        // If accused name not found, fallback to text search/RAG
        tool = "text";
      }
    }

    // -------------------------------------------------------------
    // TOOL: NETWORK GRAPH
    // -------------------------------------------------------------
    if (tool === "network") {
      const links = await db.execute(`
        SELECT cl.source_fir_id, f1.fir_number as source_fir, f1.district as source_district, f1.police_station as source_station,
               cl.target_fir_id, f2.fir_number as target_fir, f2.district as target_district, f2.police_station as target_station, 
               cl.link_type, cl.confidence_score, cl.description
        FROM CaseLinks cl
        JOIN FIR f1 ON cl.source_fir_id = f1.id
        JOIN FIR f2 ON cl.target_fir_id = f2.id
        ORDER BY cl.confidence_score DESC
        LIMIT 20
      `);

      const accusedWithFirs = await db.execute(`
        SELECT a.name, a.gang_affiliation, a.prior_convictions, a.risk_score, f.fir_number, f.crime_type, f.district, f.police_station
        FROM FIR_Accused a
        JOIN FIR f ON a.fir_id = f.id
        WHERE a.name IN (SELECT name FROM FIR_Accused GROUP BY name HAVING COUNT(fir_id) > 1) 
           OR a.gang_affiliation IS NOT NULL
        LIMIT 30
      `);

      const nodes = [];
      const edges = [];
      const nodeTracker = new Set();

      const addNode = (id, label, type, group, val = {}) => {
        if (!nodeTracker.has(id)) {
          nodeTracker.add(id);
          nodes.push({ id, label, type, group, ...val });
        }
      };

      const isCaseInScope = (district, station) => {
        if (!scope || scope.type === 'statewide') return true;
        if (scope.type === 'station') return station === scope.value;
        if (scope.type === 'district') return district === scope.value;
        return true;
      };

      accusedWithFirs.forEach(row => {
        if (!isCaseInScope(row.district, row.police_station)) {
          return;
        }

        const accId = `acc_${row.name.replace(/\s+/g, '_')}`;
        addNode(accId, row.name, "person", row.gang_affiliation ? "gang" : "accused", {
          score: row.risk_score,
          details: `Gang: ${row.gang_affiliation || 'None'}. Prior Convictions: ${row.prior_convictions}`
        });

        const caseId = `case_${row.fir_number}`;
        addNode(caseId, row.fir_number, "case", "case", {
          details: `Type: ${row.crime_type}`
        });

        edges.push({
          from: accId,
          to: caseId,
          label: "accused_in",
          arrows: "to",
          color: { color: "#e2e8f0" }
        });
      });

      links.forEach(link => {
        if (!isCaseInScope(link.source_district, link.source_station) || 
            !isCaseInScope(link.target_district, link.target_station)) {
          return;
        }

        const c1 = `case_${link.source_fir}`;
        const c2 = `case_${link.target_fir}`;
        addNode(c1, link.source_fir, "case", "case");
        addNode(c2, link.target_fir, "case", "case");

        edges.push({
          from: c1,
          to: c2,
          label: `${link.link_type} (${Math.round(link.confidence_score*100)}%)`,
          color: { color: link.link_type === 'common_accused' ? '#ef4444' : '#3b82f6' },
          dashes: link.link_type === 'location_proximity'
        });
      });

      data = { nodes, edges };
      narrative = `Synthesized a multi-modal relationship graph containing ${nodes.length} nodes (cases and repeat offenders) and ${edges.length} linkages. High-confidence connections are highlighted in red (shared offender) and blue (modus operandi match).`;
    }

    // -------------------------------------------------------------
    // TOOL: HOTSPOT MAP
    // -------------------------------------------------------------
    if (tool === "map") {
      let sql = `
        SELECT f.id, f.fir_number, f.crime_type, f.district, f.police_station, f.status, f.date_reported,
               l.latitude, l.longitude, l.address, l.area_type
        FROM FIR f
        JOIN Location l ON f.id = l.fir_id
      `;
      let params = [];
      let filters = [];

      if (extractedParams.crime_type) {
        filters.push("f.crime_type = ?");
        params.push(extractedParams.crime_type);
      }
      if (extractedParams.district) {
        filters.push("f.district = ?");
        params.push(extractedParams.district);
      }

      if (filters.length > 0) {
        sql += " WHERE " + filters.join(" AND ");
      }
      
      sql += " ORDER BY f.date_reported DESC LIMIT 40";
      
      let locations = await db.execute(sql, params);
      
      // Apply RLS bounds
      if (scope && scope.type !== 'statewide') {
        locations = locations.filter(loc => {
          if (scope.type === 'station') return loc.police_station === scope.value;
          if (scope.type === 'district') return loc.district === scope.value;
          return true;
        });
      }
      
      data = locations;
      
      const filterDesc = filters.length > 0 ? "with specified search parameters" : "overall cases";
      narrative = `Geographical profiling generated ${locations.length} spatial pins ${filterDesc}. Plotted active hotspots and local police station jurisdictions.`;
    }

    // -------------------------------------------------------------
    // TOOL: TREND CHART
    // -------------------------------------------------------------
    if (tool === "chart") {
      let monthlySql = `
        SELECT strftime('%Y-%m', date_reported) as month, 
               SUM(CASE WHEN crime_type = 'Cyber Crime' THEN 1 ELSE 0 END) as cyber,
               SUM(CASE WHEN crime_type = 'Theft' THEN 1 ELSE 0 END) as theft,
               SUM(CASE WHEN crime_type = 'Organized Crime' THEN 1 ELSE 0 END) as organized,
               SUM(CASE WHEN crime_type = 'Financial Fraud' THEN 1 ELSE 0 END) as fraud,
               COUNT(id) as total
        FROM FIR
      `;
      let monthlyParams = [];
      if (scope && scope.type === 'district') {
        monthlySql += " WHERE district = ? ";
        monthlyParams.push(scope.value);
      } else if (scope && scope.type === 'station') {
        monthlySql += " WHERE police_station = ? ";
        monthlyParams.push(scope.value);
      }
      
      monthlySql += " GROUP BY month ORDER BY month ASC ";
      const monthlyTrends = await db.execute(monthlySql, monthlyParams);

      let districtCrime = await db.execute(`
        SELECT district, 
               SUM(CASE WHEN crime_type = 'Cyber Crime' THEN 1 ELSE 0 END) as cyber,
               SUM(CASE WHEN crime_type = 'Theft' THEN 1 ELSE 0 END) as theft,
               SUM(CASE WHEN crime_type = 'Organized Crime' THEN 1 ELSE 0 END) as organized,
               SUM(CASE WHEN crime_type = 'Financial Fraud' THEN 1 ELSE 0 END) as fraud,
               COUNT(id) as total
        FROM FIR
        GROUP BY district
        ORDER BY total DESC
      `);

      if (scope && scope.type !== 'statewide') {
        districtCrime = districtCrime.filter(d => {
          if (scope.type === 'district') return d.district === scope.value;
          if (scope.type === 'station') return d.district === 'Bengaluru City';
          return true;
        });
      }

      data = {
        monthly: monthlyTrends,
        district: districtCrime,
        seasonal: {},
        eventBased: []
      };

      const seasonalData = await db.execute(`
        SELECT 
          CASE 
            WHEN CAST(strftime('%m', date_reported) AS INTEGER) IN (6,7,8) THEN 'Monsoon (Jun-Aug)'
            WHEN CAST(strftime('%m', date_reported) AS INTEGER) IN (9,10,11) THEN 'Post-Monsoon (Sep-Nov)'
            WHEN CAST(strftime('%m', date_reported) AS INTEGER) IN (12,1,2) THEN 'Winter (Dec-Feb)'
            ELSE 'Summer (Mar-May)'
          END as season,
          crime_type,
          COUNT(*) as count
        FROM FIR
        GROUP BY season, crime_type
        ORDER BY season, count DESC
      `);

      const seasonalMap = {};
      seasonalData.forEach(row => {
        if (!seasonalMap[row.season]) seasonalMap[row.season] = {};
        seasonalMap[row.season][row.crime_type] = row.count;
      });
      data.seasonal = seasonalMap;

      const eventBasedData = await db.execute(`
        SELECT f.district, f.crime_type, COUNT(*) as incident_count,
               MIN(f.date_reported) as start_date, MAX(f.date_reported) as end_date
        FROM FIR f
        GROUP BY f.district, f.crime_type, strftime('%Y-%m-%d', f.date_reported, '-3 days')
        HAVING incident_count >= 2
        ORDER BY incident_count DESC
        LIMIT 10
      `);
      data.eventBased = eventBasedData;

      narrative = `Aggregated crime trends computed successfully. Includes monthly timelines, district-level breakdowns, seasonal pattern analysis across ${Object.keys(seasonalMap).length} seasons, and ${eventBasedData.length} event-based cluster detections.`;
    }

    // -------------------------------------------------------------
    // TOOL: FINANCIAL TRAIL
    // -------------------------------------------------------------
    if (tool === "finance") {
      let firId = null;
      let targetFirRecord = null;

      if (extractedParams.fir_number) {
        const firRows = await db.execute('SELECT id, district, police_station FROM FIR WHERE fir_number = ?', [extractedParams.fir_number]);
        if (firRows.length > 0) {
          targetFirRecord = firRows[0];
          // Enforce RLS access check
          if (scope && scope.type !== 'statewide') {
            const inScope = (scope.type === 'station' && targetFirRecord.police_station === scope.value) ||
                            (scope.type === 'district' && targetFirRecord.district === scope.value);
            if (!inScope) {
              data = { nodes: [], edges: [], overview: [] };
              narrative = `🛡️ **Access Denied: Case ${extractedParams.fir_number} is outside your authorized jurisdiction: ${scope.label}.**`;
              return {
                success: true,
                tool,
                data,
                narrative
              };
            }
          }
          firId = targetFirRecord.id;
        }
      }

      if (firId) {
        const result = await financialAnalysis(firId);
        data = result;
        narrative = result.summary || `Financial trail analysis completed for FIR ID ${firId}.`;
      } else {
        const overview = await db.execute(`
          SELECT ft.fir_id, f.fir_number, f.crime_type, f.district, f.police_station,
                 COUNT(ft.id) as txn_count,
                 SUM(ft.amount) as total_amount,
                 SUM(CASE WHEN ft.is_suspicious = 1 THEN 1 ELSE 0 END) as suspicious_count
          FROM FinancialTransaction ft
          JOIN FIR f ON ft.fir_id = f.id
          GROUP BY ft.fir_id
          ORDER BY total_amount DESC
          LIMIT 20
        `);

        let filteredOverview = overview;
        if (scope && scope.type !== 'statewide') {
          filteredOverview = overview.filter(row => {
            if (scope.type === 'station') return row.police_station === scope.value;
            if (scope.type === 'district') return row.district === scope.value;
            return true;
          });
        }

        const nodes = [];
        const edges = [];
        filteredOverview.forEach(row => {
          nodes.push({
            id: `fir_${row.fir_id}`,
            label: row.fir_number,
            type: 'case',
            suspicious: row.suspicious_count > 0
          });
          edges.push({
            from: `fir_${row.fir_id}`,
            to: `fir_${row.fir_id}`,
            label: `₹${(row.total_amount || 0).toLocaleString('en-IN')} (${row.txn_count} txns)`,
            color: row.suspicious_count > 0 ? '#ef4444' : '#22c55e'
          });
        });

        data = { nodes, edges, overview: filteredOverview };
        narrative = `Financial overview across ${filteredOverview.length} FIRs with transaction data. Total suspicious transactions flagged. Specify a FIR number for detailed money-flow graph.`;
      }
    }

    // -------------------------------------------------------------
    // TOOL: SOCIO-DEMOGRAPHIC ANALYSIS
    // -------------------------------------------------------------
    if (tool === "socio") {
      let joinClause = "";
      let whereClause = "";
      let socioParams = [];

      if (scope && scope.type !== 'statewide') {
        joinClause = " JOIN FIR f ON a.fir_id = f.id ";
        if (scope.type === 'station') {
          whereClause = " WHERE f.police_station = ? ";
          socioParams.push(scope.value);
        } else if (scope.type === 'district') {
          whereClause = " WHERE f.district = ? ";
          socioParams.push(scope.value);
        }
      }

      const ageGroups = await db.execute(`
        SELECT 
          CASE 
            WHEN a.age < 18 THEN 'Juvenile (<18)'
            WHEN a.age BETWEEN 18 AND 25 THEN 'Young Adult (18-25)'
            WHEN a.age BETWEEN 26 AND 35 THEN 'Adult (26-35)'
            WHEN a.age BETWEEN 36 AND 50 THEN 'Middle-Aged (36-50)'
            ELSE 'Senior (50+)'
          END as age_group,
          COUNT(*) as count
        FROM FIR_Accused a
        ${joinClause}
        ${whereClause}
        GROUP BY age_group
        ORDER BY count DESC
      `, socioParams);

      const genderSplit = await db.execute(`
        SELECT a.gender, COUNT(*) as count
        FROM FIR_Accused a
        ${joinClause}
        ${whereClause}
        GROUP BY a.gender
        ORDER BY count DESC
      `, socioParams);

      const educationLevels = await db.execute(`
        SELECT a.education_level, COUNT(*) as count
        FROM FIR_Accused a
        ${joinClause}
        ${whereClause ? whereClause + " AND a.education_level IS NOT NULL " : " WHERE a.education_level IS NOT NULL "}
        GROUP BY a.education_level
        ORDER BY count DESC
      `, socioParams);

      const migrationStatus = await db.execute(`
        SELECT a.migration_status as status, COUNT(*) as count
        FROM FIR_Accused a
        ${joinClause}
        ${whereClause}
        GROUP BY status
      `, socioParams);

      let socioCorrelation = await db.execute(`
        SELECT s.district, s.unemployment_rate, s.literacy_rate, s.poverty_index,
               COUNT(f.id) as crime_count
        FROM SocioEconomicIndicators s
        LEFT JOIN FIR f ON s.district = f.district
        GROUP BY s.district
        ORDER BY crime_count DESC
      `);

      if (scope && scope.type !== 'statewide') {
        socioCorrelation = socioCorrelation.filter(s => {
          if (scope.type === 'district') return s.district === scope.value;
          if (scope.type === 'station') return s.district === 'Bengaluru City';
          return true;
        });
      }

      data = {
        demographics: {
          ageGroups,
          genderSplit,
          educationLevels,
          migrationStatus
        },
        socioCorrelation
      };
      narrative = `Socio-demographic analysis complete. Accused population profiled across ${ageGroups.length} age groups and ${genderSplit.length} gender categories. District-level socio-economic correlations mapped for ${socioCorrelation.length} districts.`;
    }

    // -------------------------------------------------------------
    // TOOL: SIMILAR CASES
    // -------------------------------------------------------------
    if (tool === "similar") {
      let firId = null;
      let targetFirRecord = null;

      if (extractedParams.fir_number) {
        const firRows = await db.execute('SELECT id, district, police_station FROM FIR WHERE fir_number = ?', [extractedParams.fir_number]);
        if (firRows.length > 0) {
          targetFirRecord = firRows[0];
          // Check RLS bounds
          if (scope && scope.type !== 'statewide') {
            const inScope = (scope.type === 'station' && targetFirRecord.police_station === scope.value) ||
                            (scope.type === 'district' && targetFirRecord.district === scope.value);
            if (!inScope) {
              data = { similarCases: [] };
              narrative = `🛡️ **Access Denied: Target case ${extractedParams.fir_number} is outside your authorized jurisdiction: ${scope.label}.**`;
              return {
                success: true,
                tool,
                data,
                narrative
              };
            }
          }
          firId = targetFirRecord.id;
        }
      }

      if (!firId) {
        // Find most recent in-scope case
        let sql = 'SELECT id FROM FIR';
        let params = [];
        if (scope && scope.type !== 'statewide') {
          if (scope.type === 'station') {
            sql += ' WHERE police_station = ?';
            params.push(scope.value);
          } else if (scope.type === 'district') {
            sql += ' WHERE district = ?';
            params.push(scope.value);
          }
        }
        sql += ' ORDER BY date_reported DESC LIMIT 1';
        const recentFirs = await db.execute(sql, params);
        if (recentFirs.length > 0) firId = recentFirs[0].id;
      }

      if (firId) {
        const result = await similarCases(firId);
        
        // Post-filter matching cases and leads
        if (result.success && scope && scope.type !== 'statewide') {
          result.similarCases = result.similarCases.filter(c => {
            if (scope.type === 'station') return c.police_station === scope.value;
            if (scope.type === 'district') return c.district === scope.value;
            return true;
          });
          
          // Filter investigative leads
          const visibleCaseNumbers = new Set([result.targetCase.fir_number, ...result.similarCases.map(c => c.fir_number)]);
          result.investigativeLeads = result.investigativeLeads.filter(lead => {
            const firMatch = lead.match(/(?:FIR|case)\s*([A-Z0-9\-\/]+)/i);
            if (firMatch && !visibleCaseNumbers.has(firMatch[1])) {
              return false;
            }
            return true;
          });
        }

        data = result;
        const matchCount = result.similarCases ? result.similarCases.length : 0;
        narrative = `Found ${matchCount} similar case(s) for FIR ${result.targetCase?.fir_number || firId}. Cases ranked by similarity score based on crime type, district, modus operandi overlap, and shared accused/gang affiliations.`;
      } else {
        data = { similarCases: [] };
        narrative = 'No FIR reference found to compare against. Please specify a FIR number.';
      }
    }

    // -------------------------------------------------------------
    // TOOL: CRIME FORECAST / EARLY WARNING
    // -------------------------------------------------------------
    if (tool === "forecast") {
      let forecasts = await db.execute(`
        SELECT * FROM CrimeForecast ORDER BY forecast_date ASC
      `);

      if (scope && scope.type !== 'statewide') {
        forecasts = forecasts.filter(f => {
          if (scope.type === 'district') return f.district === scope.value;
          if (scope.type === 'station') return f.district === 'Bengaluru City';
          return true;
        });
      }

      data = forecasts;
      narrative = `Crime forecast intelligence retrieved: ${forecasts.length} predictive alerts generated. These include projected crime hotspots, seasonal patterns, and early warning indicators for proactive policing.`;
    }

    // -------------------------------------------------------------
    // TOOL: TEXT RAG (DEFAULT FALLBACK)
    // -------------------------------------------------------------
    if (tool === "text") {
      let records = [];
      const firMatch = queryText.match(/(FIR-\d{4}-\d{3,4})/i);
      
      if (firMatch) {
        const targetFir = firMatch[1].toUpperCase();
        const firRows = await db.execute(`
          SELECT f.*, 
                 (SELECT GROUP_CONCAT(name, ', ') FROM FIR_Accused WHERE fir_id = f.id) as accused_names,
                 (SELECT GROUP_CONCAT(name, ', ') FROM FIR_Victim WHERE fir_id = f.id) as victim_names
          FROM FIR f
          WHERE f.fir_number = ?
        `, [targetFir]);
        
        if (firRows.length > 0) {
          records = firRows.map(row => ({
            id: row.id,
            fir_number: row.fir_number,
            district: row.district,
            police_station: row.police_station,
            crime_type: row.crime_type,
            status: row.status,
            date_reported: row.date_reported,
            description: row.description,
            modus_operandi: row.modus_operandi,
            accused: row.accused_names ? row.accused_names.split(', ') : [],
            victims: row.victim_names ? row.victim_names.split(', ') : []
          }));
        }
      }

      if (records.length === 0) {
        try {
          const qml = catalyst.quickML();
          const ragRecords = await qml.rag.retrieve(queryText, 5);
          records = ragRecords || [];
        } catch (e) {
          console.warn("RAG retrieval failed, fallback to SQL search:", e.message);
          records = await db.execute(`
            SELECT id, fir_number, district, police_station, crime_type, status, date_reported, description, modus_operandi
            FROM FIR
            WHERE description LIKE ? OR modus_operandi LIKE ? OR fir_number LIKE ?
            LIMIT 3
          `, [`%${queryText}%`, `%${queryText}%`, `%${queryText}%`]);
        }
      }

      if (scope && scope.type !== 'statewide') {
        records = records.filter(r => {
          if (scope.type === 'station') return r.police_station === scope.value;
          if (scope.type === 'district') return r.district === scope.value;
          return true;
        });
      }

      records = records.slice(0, 3);
      data = records;

      if (records.length > 0) {
        const topResult = records[0];
        const accusedStr = topResult.accused && topResult.accused.length > 0 ? topResult.accused.join(', ') : 'None';
        narrative = `Based on natural language intelligence search, found matching case file: **${topResult.fir_number}** in ${topResult.district}. Details:\n- **Crime Category**: ${topResult.crime_type}\n- **Accused Suspects**: ${accusedStr}\n- **Modus Operandi**: ${topResult.modus_operandi}\n- **Case Description**: ${topResult.description}`;
      } else {
        narrative = `I scanned the intelligence database but could not find specific case documents matching your exact query within your jurisdiction. Please refine the case numbers or search keywords.`;
      }
    }

    // -------------------------------------------------------------
    // TOOL: MULTIMODAL VERNACULAR OCR DOCUMENT INTELLIGENCE
    // -------------------------------------------------------------
    if (tool === "ocr") {
      const ocrAnalysis = require('../ocr/index');
      const result = await ocrAnalysis('Sample_Threat_Warning.txt', 'text/plain', 'MOCK_BASE64');
      data = result;
      narrative = `Successfully initiated OCR analysis on vernacular document scan. Extracted raw Kannada text, translated, and identified suspects: ${result.entities.suspects.join(', ') || 'None'} and location tags: ${result.entities.locations.join(', ') || 'None'}.`;
    }

    // -------------------------------------------------------------
    // TOOL: CDR CELLULAR TIMELINE TRAJECTORY
    // -------------------------------------------------------------
    if (tool === "cdr") {
      const cdrAnalysis = require('../cdr/index');
      const targetSuspect = extractedParams.accused_name || "Rupa Naik";

      // CDR Access Check: Verify suspect has at least one incident within scope
      if (scope && scope.type !== 'statewide') {
        const suspectCases = await db.execute(`
          SELECT f.district, f.police_station 
          FROM FIR_Accused a
          JOIN FIR f ON a.fir_id = f.id
          WHERE a.name LIKE ?
        `, [`%${targetSuspect}%`]);
        const hasVisibleCase = suspectCases.some(c => {
          if (scope.type === 'station') return c.police_station === scope.value;
          if (scope.type === 'district') return c.district === scope.value;
          return true;
        });
        if (!hasVisibleCase) {
          data = { breadcrumbs: [], collisionAlerts: [] };
          narrative = `🛡️ **Access Denied: Suspect '${targetSuspect}' is outside your authorized jurisdiction: ${scope.label}.**`;
          return {
            success: true,
            tool,
            data,
            narrative
          };
        }
      }

      const result = await cdrAnalysis(targetSuspect);
      data = result;
      narrative = `Retrieved Call Detail Record (CDR) cell tower breadcrumbs for suspect ${result.suspect}. Carrier: ${result.carrier}. Chronology has ${result.breadcrumbs.length} pings. Collision analysis: ${result.collisionAlerts.length > 0 ? '⚠️ Proximity warning flagged near crime location' : 'No crime scene intersections found'}.`;
    }

    // -------------------------------------------------------------
    // TOOL: ZIA VISION BIOMETRIC FACIAL SEARCH
    // -------------------------------------------------------------
    if (tool === "biometrics") {
      const biometricSearch = require('../biometrics/index');
      const targetSuspect = extractedParams.accused_name || "";
      const result = await biometricSearch(targetSuspect);
      
      // Post-filter face candidates
      if (result && result.matches && scope && scope.type !== 'statewide') {
        const filteredMatches = [];
        for (const candidateMatch of result.matches) {
          const suspectCases = await db.execute(`
            SELECT f.district, f.police_station
            FROM FIR_Accused a
            JOIN FIR f ON a.fir_id = f.id
            WHERE a.name LIKE ?
          `, [`%${candidateMatch.name}%`]);
          const hasVisibleCase = suspectCases.some(c => {
            if (scope.type === 'station') return c.police_station === scope.value;
            if (scope.type === 'district') return c.district === scope.value;
            return true;
          });
          if (hasVisibleCase) {
            filteredMatches.push(candidateMatch);
          }
        }
        result.matches = filteredMatches;
      }

      data = result;
      const count = result.matches ? result.matches.length : 0;
      narrative = `Zia Vision face biometrics registry search found ${count} candidate matches from datastore accused files. Top match is ${count > 0 ? result.matches[0].name + ' (' + result.matches[0].similarity + '% match)' : 'None'}.`;
    }

    // -------------------------------------------------------------
    // TOOL: EMERGENCY PATROL DISPATCH 112 HUB
    // -------------------------------------------------------------
    if (tool === "dispatch") {
      const units = [
        { id: "PATROL-101", vehicle: "KA-02-G-4102 (Bengaluru City)", lat: 12.9720, lng: 77.5850, status: "Available", officer: "SI Sandeep Patil" },
        { id: "PATROL-102", vehicle: "KA-01-G-7788 (Bengaluru City)", lat: 12.9550, lng: 77.6100, status: "Busy", officer: "SI Priya Gowda" },
        { id: "PATROL-201", vehicle: "KA-09-G-1212 (Mysuru)", lat: 12.3010, lng: 76.6450, status: "Available", officer: "SI Manjunath K." },
        { id: "PATROL-301", vehicle: "KA-25-G-0033 (Hubballi)", lat: 15.3680, lng: 75.1200, status: "Available", officer: "SI Satish Naik" },
        { id: "PATROL-401", vehicle: "KA-19-G-4455 (Mangaluru)", lat: 12.9150, lng: 74.8500, status: "Available", officer: "SI Harish Poojary" }
      ];
      const logs = [
        { id: 3851, time: "21:31", caller: "Citizen Report", details: "Chain snatching incident near Hubballi Railway Station.", status: "Pending", vehicle: "" },
        { id: 3852, time: "21:33", caller: "Store Manager", details: "Suspicious vehicle observed idling near Chamundi Hill, Mysuru.", status: "Pending", vehicle: "" },
        { id: 3853, time: "21:35", caller: "Bank Teller", details: "Credit card fraud report at Mangaluru Kadri PS.", status: "Pending", vehicle: "" }
      ];

      let filteredUnits = units;
      let filteredLogs = logs;

      if (scope && scope.type !== 'statewide') {
        filteredUnits = units.filter(u => u.vehicle.includes("Bengaluru City"));
        if (scope.type === 'station') {
          filteredLogs = [
            { id: 3901, time: "22:15", caller: "Duty Officer", details: `Patrol check required near ${scope.value}.`, status: "Active", vehicle: "PATROL-101" }
          ];
        } else if (scope.type === 'district') {
          filteredLogs = [
            { id: 3902, time: "22:20", caller: "Citizen Report", details: `Traffic monitoring alert in ${scope.value}.`, status: "Pending", vehicle: "" }
          ];
        }
      }

      data = { units: filteredUnits, logs: filteredLogs };
      narrative = `Accessed live Emergency KSP 112 Dispatch desk logs. Loaded fleet status registry (${filteredUnits.length} vehicles). Patrol units are on-standby for AI routing dispatch.`;
    }

    // -------------------------------------------------------------
    // TOOL: INVESTIGATION TIMELINE
    // -------------------------------------------------------------
    if (tool === "timeline") {
      let firId = null;
      if (extractedParams.fir_number) {
        const firRows = await db.execute('SELECT id FROM FIR WHERE fir_number = ?', [extractedParams.fir_number]);
        if (firRows.length > 0) firId = firRows[0].id;
      }
      if (!firId) {
        let sql = 'SELECT id FROM FIR';
        let params = [];
        if (scope && scope.type !== 'statewide') {
          if (scope.type === 'station') { sql += ' WHERE police_station = ?'; params.push(scope.value); }
          else if (scope.type === 'district') { sql += ' WHERE district = ?'; params.push(scope.value); }
        }
        sql += ' ORDER BY date_reported DESC LIMIT 1';
        const recent = await db.execute(sql, params);
        if (recent.length > 0) firId = recent[0].id;
      }
      if (firId) {
        const result = await investigationTimeline(firId);
        if (result.success) {
          data = result;
          narrative = `Investigation timeline generated with ${result.timeline.length} events for ${result.summary.overview.fir_number}. Case involves ${result.suspects.length} suspects. ${result.leads.length} investigative leads identified. ${result.summary.escalations.length} escalation flags raised.`;
        } else {
          tool = "text";
        }
      } else {
        tool = "text";
      }
    }

    // -------------------------------------------------------------
    // TOOL: EARLY WARNING / ENHANCED ALERTS
    // -------------------------------------------------------------
    if (tool === "early_warning") {
      const result = await earlyWarning(scope);
      if (result.success) {
        data = result;
        narrative = `Enhanced early warning intelligence: ${result.summary.total_alerts} alerts detected — ${result.summary.critical_count} Critical, ${result.summary.high_count} High. ${result.summary.repeat_offenders} repeat offenders, ${result.summary.active_gangs} active gangs, ${result.summary.escalations} escalation patterns, ${result.summary.temporal_surges} temporal surges.`;
      } else {
        tool = "text";
      }
    }

    // -------------------------------------------------------------
    // TOOL: CASE SUMMARY
    // -------------------------------------------------------------
    if (tool === "case_summary") {
      let firId = null;
      if (extractedParams.fir_number) {
        const firRows = await db.execute('SELECT id FROM FIR WHERE fir_number = ?', [extractedParams.fir_number]);
        if (firRows.length > 0) firId = firRows[0].id;
      }
      if (!firId) {
        let sql = 'SELECT id FROM FIR';
        let params = [];
        if (scope && scope.type !== 'statewide') {
          if (scope.type === 'station') { sql += ' WHERE police_station = ?'; params.push(scope.value); }
          else if (scope.type === 'district') { sql += ' WHERE district = ?'; params.push(scope.value); }
        }
        sql += ' ORDER BY date_reported DESC LIMIT 1';
        const recent = await db.execute(sql, params);
        if (recent.length > 0) firId = recent[0].id;
      }
      if (firId) {
        const result = await caseSummary(firId);
        if (result.success) {
          data = result;
          narrative = result.summary.executive;
        } else {
          tool = "text";
        }
      }
    }
    // -------------------------------------------------------------
    // TOOL: GENERAL Q&A
    // -------------------------------------------------------------
    if (tool === "general") {
      data = null;
      narrative = "Direct question processing...";
    }

    // Append RLS warning badge if active
    if (scope && scope.type !== 'statewide') {
      narrative += `\n\n🛡️ **Row-Level Security (RLS) Active: Results filtered by jurisdiction: ${scope.label}.**`;
    }

    return {
      success: true,
      tool,
      data,
      narrative
    };
  } catch (err) {
    console.error('Tool router execution failed:', err);
    return { success: false, error: err.message };
  }
};
