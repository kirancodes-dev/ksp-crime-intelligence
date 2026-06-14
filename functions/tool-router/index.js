const catalyst = require('../shared/catalyst-sdk').getInitializer();
const riskScoring = require('../risk-scoring/index');
const financialAnalysis = require('../financial-analysis/index');
const similarCases = require('../similar-cases/index');
const gemini = require('../shared/gemini');

module.exports = async (queryText) => {
  try {
    const db = catalyst.datastore();
    const query = queryText.toLowerCase();

    // 1. Classification & Parameter Extraction (Gemini with Legacy Keyword Fallback)
    let tool = null;
    let extractedParams = {};

    if (process.env.GEMINI_API_KEY || process.env.USE_OLLAMA === 'true') {
      console.log('Classifying query with LLM...');
      const geminiResult = await gemini.routeQuery(queryText);
      if (geminiResult.success) {
        tool = geminiResult.classification.tool;
        extractedParams = geminiResult.classification.parameters || {};
        console.log(`LLM Classification result: Tool = ${tool}, Params =`, extractedParams);
      } else {
        console.warn('LLM query routing failed, falling back to legacy keywords:', geminiResult.error || geminiResult.reason);
      }
    }

    // Legacy fallback routing if Gemini was skipped, failed, or returned an invalid tool
    const validTools = ['risk', 'network', 'map', 'chart', 'finance', 'socio', 'similar', 'forecast', 'text'];
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
          const accusedList = await db.execute("SELECT name FROM Accused GROUP BY name");
          for (let acc of accusedList) {
            if (query.includes(acc.name.toLowerCase().split(' ')[0])) {
              targetName = acc.name;
              break;
            }
          }
        }
        extractedParams.accused_name = targetName;
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
        const scoreResult = await riskScoring(targetName, riskModifiers);
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
        SELECT cl.source_fir_id, f1.fir_number as source_fir, cl.target_fir_id, f2.fir_number as target_fir, 
               cl.link_type, cl.confidence_score, cl.description
        FROM CaseLinks cl
        JOIN FIR f1 ON cl.source_fir_id = f1.id
        JOIN FIR f2 ON cl.target_fir_id = f2.id
        ORDER BY cl.confidence_score DESC
        LIMIT 20
      `);

      const accusedWithFirs = await db.execute(`
        SELECT a.name, a.gang_affiliation, a.prior_convictions, a.risk_score, f.fir_number, f.crime_type
        FROM Accused a
        JOIN FIR f ON a.fir_id = f.id
        WHERE a.name IN (SELECT name FROM Accused GROUP BY name HAVING COUNT(fir_id) > 1) 
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

      accusedWithFirs.forEach(row => {
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
        SELECT f.id, f.fir_number, f.crime_type, f.district, f.status, f.date_reported,
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
      
      const locations = await db.execute(sql, params);
      data = locations;
      
      const filterDesc = filters.length > 0 ? "with specified search parameters" : "overall cases";
      narrative = `Geographical profiling generated ${locations.length} spatial pins ${filterDesc}. Plotted active hotspots and local police station jurisdictions.`;
    }

    // -------------------------------------------------------------
    // TOOL: TREND CHART
    // -------------------------------------------------------------
    if (tool === "chart") {
      const monthlyTrends = await db.execute(`
        SELECT strftime('%Y-%m', date_reported) as month, 
               SUM(CASE WHEN crime_type = 'Cyber Crime' THEN 1 ELSE 0 END) as cyber,
               SUM(CASE WHEN crime_type = 'Theft' THEN 1 ELSE 0 END) as theft,
               SUM(CASE WHEN crime_type = 'Organized Crime' THEN 1 ELSE 0 END) as organized,
               SUM(CASE WHEN crime_type = 'Financial Fraud' THEN 1 ELSE 0 END) as fraud,
               COUNT(id) as total
        FROM FIR
        GROUP BY month
        ORDER BY month ASC
      `);

      const districtCrime = await db.execute(`
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

      data = {
        monthly: monthlyTrends,
        district: districtCrime
      };
      narrative = `Aggregated crime trends computed successfully. Trend chart provides comparative timelines over the last 120 days along with district-level volume breakdowns.`;
    }

    // -------------------------------------------------------------
    // TOOL: FINANCIAL TRAIL
    // -------------------------------------------------------------
    if (tool === "finance") {
      let firId = null;

      if (extractedParams.fir_number) {
        const firRows = await db.execute('SELECT id FROM FIR WHERE fir_number = ?', [extractedParams.fir_number]);
        if (firRows.length > 0) firId = firRows[0].id;
      }

      if (firId) {
        const result = await financialAnalysis(firId);
        data = result;
        narrative = result.summary || `Financial trail analysis completed for FIR ID ${firId}.`;
      } else {
        const overview = await db.execute(`
          SELECT ft.fir_id, f.fir_number, f.crime_type,
                 COUNT(ft.id) as txn_count,
                 SUM(ft.amount) as total_amount,
                 SUM(CASE WHEN ft.is_suspicious = 1 THEN 1 ELSE 0 END) as suspicious_count
          FROM FinancialTransaction ft
          JOIN FIR f ON ft.fir_id = f.id
          GROUP BY ft.fir_id
          ORDER BY total_amount DESC
          LIMIT 20
        `);

        const nodes = [];
        const edges = [];
        overview.forEach(row => {
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

        data = { nodes, edges, overview };
        narrative = `Financial overview across ${overview.length} FIRs with transaction data. Total suspicious transactions flagged. Specify a FIR number for detailed money-flow graph.`;
      }
    }

    // -------------------------------------------------------------
    // TOOL: SOCIO-DEMOGRAPHIC ANALYSIS
    // -------------------------------------------------------------
    if (tool === "socio") {
      const ageGroups = await db.execute(`
        SELECT 
          CASE 
            WHEN age < 18 THEN 'Juvenile (<18)'
            WHEN age BETWEEN 18 AND 25 THEN 'Young Adult (18-25)'
            WHEN age BETWEEN 26 AND 35 THEN 'Adult (26-35)'
            WHEN age BETWEEN 36 AND 50 THEN 'Middle-Aged (36-50)'
            ELSE 'Senior (50+)'
          END as age_group,
          COUNT(*) as count
        FROM Accused
        GROUP BY age_group
        ORDER BY count DESC
      `);

      const genderSplit = await db.execute(`
        SELECT gender, COUNT(*) as count
        FROM Accused
        GROUP BY gender
        ORDER BY count DESC
      `);

      const educationLevels = await db.execute(`
        SELECT education_level, COUNT(*) as count
        FROM Accused
        WHERE education_level IS NOT NULL
        GROUP BY education_level
        ORDER BY count DESC
      `);

      const migrationStatus = await db.execute(`
        SELECT is_migrant, COUNT(*) as count
        FROM Accused
        WHERE is_migrant IS NOT NULL
        GROUP BY is_migrant
      `);

      const socioCorrelation = await db.execute(`
        SELECT s.district, s.unemployment_rate, s.literacy_rate, s.poverty_index,
               COUNT(f.id) as crime_count
        FROM SocioEconomicIndicators s
        LEFT JOIN FIR f ON s.district = f.district
        GROUP BY s.district
        ORDER BY crime_count DESC
      `);

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

      if (extractedParams.fir_number) {
        const firRows = await db.execute('SELECT id FROM FIR WHERE fir_number = ?', [extractedParams.fir_number]);
        if (firRows.length > 0) firId = firRows[0].id;
      }

      if (!firId) {
        const recentFirs = await db.execute('SELECT id FROM FIR ORDER BY date_reported DESC LIMIT 1');
        if (recentFirs.length > 0) firId = recentFirs[0].id;
      }

      if (firId) {
        const result = await similarCases(firId);
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
      const forecasts = await db.execute(`
        SELECT * FROM CrimeForecast ORDER BY forecast_date ASC
      `);

      data = forecasts;
      narrative = `Crime forecast intelligence retrieved: ${forecasts.length} predictive alerts generated. These include projected crime hotspots, seasonal patterns, and early warning indicators for proactive policing.`;
    }

    // -------------------------------------------------------------
    // TOOL: TEXT RAG (DEFAULT FALLBACK)
    // -------------------------------------------------------------
    if (tool === "text") {
      const qml = catalyst.quickML();
      const records = await qml.rag.retrieve(queryText, 3);
      data = records;

      if (records.length > 0) {
        const topResult = records[0];
        narrative = `Based on natural language intelligence search (RAG retrieval), found matching case file: **${topResult.fir_number}** in ${topResult.district}. Details:\n- **Crime Category**: ${topResult.crime_type}\n- **Modus Operandi**: ${topResult.modus_operandi}\n- **Case Description**: ${topResult.description}`;
      } else {
        narrative = `I scanned the intelligence database but could not find specific case documents matching your exact query. Please refine the case numbers or search keywords (e.g., district name, crime type, or accused moniker).`;
      }
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
