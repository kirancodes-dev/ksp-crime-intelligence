const catalyst = require('../shared/catalyst-sdk').getInitializer();
const toolRouter = require('../tool-router/index');
const translate = require('../translate/index');
const auditLogging = require('../audit-log/index');
const gemini = require('../shared/gemini');

// Map of tool names to the tables they access
const TOOL_TABLE_MAP = {
  risk: ['Accused', 'FIR'],
  network: ['CaseLinks', 'Accused', 'FIR'],
  map: ['FIR', 'Location'],
  chart: ['FIR'],
  finance: ['FinancialTransaction', 'FIR'],
  socio: ['Accused', 'SocioEconomicIndicators', 'FIR'],
  similar: ['FIR', 'Accused'],
  forecast: ['CrimeForecast'],
  text: ['FIR'],
  ocr: ['FIR', 'Accused'],
  cdr: ['FIR', 'Accused'],
  biometrics: ['Accused', 'FIR'],
  dispatch: ['FIR', 'Location'],
  general: []
};

module.exports = async (queryText, userId, role, ipAddress, sessionId, onStream = null) => {
  try {
    const db = catalyst.datastore();
    let language = "en";
    let workingQuery = queryText.trim();
    let originalQuery = queryText;

    // 1. Detect Kannada language (simple script check)
    // Kannada unicode range is 0C80 - 0CFF
    const kannadaRegex = /[\u0C80-\u0CFF]/;
    if (kannadaRegex.test(workingQuery)) {
      language = "kn";
      // Translate to English first so toolRouter can parse keywords
      const transResult = await translate(workingQuery, "kn", "en");
      if (transResult.success) {
        workingQuery = transResult.translation;
      }
    }

    // 2. Load session context if sessionId is provided
    let sessionContext = null;
    if (sessionId) {
      try {
        const sessions = await db.execute(
          'SELECT * FROM ConversationSession WHERE session_id = ? LIMIT 1',
          [sessionId]
        );
        if (sessions.length > 0) {
          sessionContext = sessions[0];
        }
      } catch (e) {
        // ConversationSession table may not exist yet — proceed without context
        console.warn('Session lookup skipped:', e.message);
      }
    }

    // 3. Resolve contextual references using session context
    if (sessionContext) {
      workingQuery = resolveContextualReferences(workingQuery, sessionContext);
    }

    // 4. Route query to matching tool
    const routeResult = await toolRouter(workingQuery, userId, role);
    if (!routeResult.success) {
      throw new Error(routeResult.error || "Failed routing query");
    }

    let finalNarrative = routeResult.narrative;
    let llmMode = "mock";
    const evidenceSources = buildEvidenceSources(routeResult.tool, routeResult.data);

    // If streaming mode is active
    if (onStream) {
      // Send metadata immediately
      onStream({
        type: 'metadata',
        tool: routeResult.tool,
        data: routeResult.data,
        evidenceSources
      });

      let accumulatedNarrative = '';
      let detectedProvider = 'mock';

      if (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.USE_OLLAMA === 'true') {
        const streamResult = await gemini.generateNarrativeStream(
          workingQuery,
          routeResult.tool,
          routeResult.data,
          (token) => {
            accumulatedNarrative += token;
            onStream({ type: 'token', content: token });
          },
          (meta) => {
            detectedProvider = meta.provider;
            onStream({ type: 'meta', provider: meta.provider });
          }
        );
        if (streamResult.success) {
          llmMode = detectedProvider;
        } else {
          llmMode = 'fallback';
        }
      } else {
        // Fallback simulation
        const words = routeResult.narrative.split(/(\s+)/);
        for (const word of words) {
          accumulatedNarrative += word;
          onStream({ type: 'token', content: word });
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }

      // Kannada translate back at the end of streaming
      if (language === "kn") {
        const transBack = await translate(accumulatedNarrative, "en", "kn");
        if (transBack.success) {
          finalNarrative = transBack.translation;
          onStream({ type: 'translation', content: transBack.translation });
        } else {
          finalNarrative = accumulatedNarrative;
        }
      } else {
        finalNarrative = accumulatedNarrative;
      }
    } else {
      // Synchronous mode
      if (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.USE_OLLAMA === 'true') {
        const llmResult = await gemini.generateNarrative(workingQuery, routeResult.tool, routeResult.data);
        if (llmResult.success) {
          finalNarrative = llmResult.narrative;
          llmMode = llmResult.provider || "live";
        } else {
          console.warn('LLM narrative generation failed, falling back to mock:', llmResult.error || llmResult.reason);
          llmMode = "fallback";
        }
      }

      // If query was in Kannada, translate response back
      if (language === "kn") {
        const transBack = await translate(finalNarrative, "en", "kn");
        if (transBack.success) {
          finalNarrative = transBack.translation;
        }
      }
    }

    // 6. Record interaction in the Audit Log
    const auditAction = `Chat query: ${routeResult.tool.toUpperCase()} data returned`;
    await auditLogging(userId, role, originalQuery, auditAction, ipAddress);

    // 7. Update session context for future queries
    if (sessionId) {
      try {
        const extractedDistrict = extractDistrict(workingQuery);
        const extractedCrimeType = extractCrimeType(workingQuery);
        const extractedAccusedName = extractAccusedName(workingQuery);

        if (sessionContext) {
          // Update existing session
          await db.run(
            `UPDATE ConversationSession SET 
              last_query = ?, last_tool = ?, last_district = ?, 
              last_crime_type = ?, last_accused_name = ?, updated_at = datetime('now')
            WHERE session_id = ?`,
            [
              workingQuery,
              routeResult.tool,
              extractedDistrict || sessionContext.last_district,
              extractedCrimeType || sessionContext.last_crime_type,
              extractedAccusedName || sessionContext.last_accused_name,
              sessionId
            ]
          );
        } else {
          // Create new session
          await db.run(
            `INSERT INTO ConversationSession 
              (session_id, user_id, last_query, last_tool, last_district, last_crime_type, last_accused_name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
              sessionId,
              userId,
              workingQuery,
              routeResult.tool,
              extractedDistrict,
              extractedCrimeType,
              extractedAccusedName
            ]
          );
        }
      } catch (e) {
        // Session save is non-critical — log and continue
        console.warn('Session save skipped:', e.message);
      }
    }

    return {
      success: true,
      originalQuery,
      queryParsed: workingQuery,
      language,
      tool: routeResult.tool,
      data: routeResult.data,
      narrative: finalNarrative,
      sessionId: sessionId || null,
      evidenceSources,
      llmMode
    };
  } catch (err) {
    console.error('Chat handler execution failed:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

/**
 * Resolve contextual references in the query using prior session state.
 * Prepends context so the tool-router can correctly classify the query.
 */
function resolveContextualReferences(query, session) {
  const lower = query.toLowerCase();
  let augmented = query;

  // "that district" / "same area" → inject last district
  if ((lower.includes('that district') || lower.includes('same area') || lower.includes('same district')) && session.last_district) {
    augmented = augmented.replace(/that district|same area|same district/gi, session.last_district);
  }

  // "those accused" / "same accused" → inject last accused name
  if ((lower.includes('those accused') || lower.includes('same accused') || lower.includes('that accused')) && session.last_accused_name) {
    augmented = augmented.replace(/those accused|same accused|that accused/gi, session.last_accused_name);
  }

  // "this case" → inject last query context
  if (lower.includes('this case') && session.last_query) {
    augmented += ` (referring to: ${session.last_query})`;
  }

  // "compare" → bring in prior district and crime type for comparison context
  if (lower.includes('compare') && session.last_district) {
    augmented += ` (previous context: district ${session.last_district}, crime type ${session.last_crime_type || 'unknown'})`;
  }

  return augmented;
}

/**
 * Build evidence sources array describing data provenance for the response.
 */
function buildEvidenceSources(toolName, data) {
  if (toolName === 'general') {
    return [{
      tool: 'general',
      tablesAccessed: [],
      confidence: 'high',
      description: 'Sourced from AI Knowledge Base (General Q&A)'
    }];
  }
  const tables = TOOL_TABLE_MAP[toolName] || ['FIR'];
  const hasData = data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0);

  return [{
    tool: toolName,
    tablesAccessed: tables,
    confidence: hasData ? 'high' : 'low',
    description: `Data sourced from ${tables.join(', ')} via ${toolName} analysis engine`
  }];
}

/**
 * Extract district name from query text.
 */
function extractDistrict(query) {
  const lower = query.toLowerCase();
  const districts = {
    'bengaluru': 'Bengaluru City', 'bangalore': 'Bengaluru City',
    'mysuru': 'Mysuru', 'mysore': 'Mysuru',
    'hubli': 'Hubballi-Dharwad', 'dharwad': 'Hubballi-Dharwad',
    'mangaluru': 'Mangaluru', 'mangalore': 'Mangaluru',
    'belagavi': 'Belagavi', 'belgaum': 'Belagavi'
  };
  for (const [keyword, district] of Object.entries(districts)) {
    if (lower.includes(keyword)) return district;
  }
  return null;
}

/**
 * Extract crime type from query text.
 */
function extractCrimeType(query) {
  const lower = query.toLowerCase();
  if (lower.includes('cyber')) return 'Cyber Crime';
  if (lower.includes('theft') || lower.includes('robbery')) return 'Theft';
  if (lower.includes('organized')) return 'Organized Crime';
  if (lower.includes('fraud') || lower.includes('financial')) return 'Financial Fraud';
  return null;
}

/**
 * Extract accused name from query text.
 */
function extractAccusedName(query) {
  const lower = query.toLowerCase();
  const knownNames = {
    'jacky': 'Jacky', 'jagadish': 'Jacky',
    'sharief': 'Mohammad Sharief', 'mohammad': 'Mohammad Sharief',
    'subhash': 'Subhash Patil', 'patil': 'Subhash Patil',
    'rupa': 'Rupa Naik', 'naik': 'Rupa Naik'
  };
  for (const [keyword, name] of Object.entries(knownNames)) {
    if (lower.includes(keyword)) return name;
  }
  return null;
}
