const http = require('http');
const https = require('https');

// Initialize environment variables
require('./dotenv').config();

// --- Provider Configuration ---
const USE_DEEPSEEK = process.env.USE_DEEPSEEK === 'true';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const USE_GROQ = process.env.USE_GROQ === 'true';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const USE_OLLAMA = process.env.USE_OLLAMA === 'true';
const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma2:2b';

const USE_GLM = process.env.USE_GLM === 'true';
const GLM_API_KEY = process.env.GLM_API_KEY;
const GLM_API_BASE = process.env.GLM_API_BASE || 'https://api.z.ai/api/paas/v4';
const GLM_MODEL = process.env.GLM_MODEL || 'glm-5.2';
const GLM_REASONING_EFFORT = process.env.GLM_REASONING_EFFORT || 'max';
const GLM_ENABLE_THINKING = process.env.GLM_ENABLE_THINKING !== 'false';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Log active LLM provider on startup
const activeProvider = USE_DEEPSEEK && DEEPSEEK_API_KEY ? `DeepSeek (${DEEPSEEK_MODEL})` :
                       USE_GLM && (GLM_API_KEY || !GLM_API_BASE.includes('api.z.ai')) ? `GLM-5 (${GLM_MODEL})` :
                       USE_GROQ && GROQ_API_KEY ? 'Groq (Llama 3.3 70B)' :
                       process.env.GEMINI_API_KEY ? 'Google Gemini' :
                       USE_OLLAMA ? 'Ollama (local)' : 'Mock (no LLM)';
console.log(`🧠 LLM Provider: ${activeProvider}`);

/**
 * Safely parses JSON response from LLM, stripping markdown wrappers or extracting
 * the outermost JSON object if conversational padding is present.
 */
function parseJsonResponse(rawText) {
  if (!rawText) throw new Error('Response text is empty');
  
  let cleaned = rawText.trim();
  // Remove markdown code block wraps (e.g. ```json ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }
  
  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // If it fails, let's try to extract the first matching JSON object pattern { ... }
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerErr) {
        throw new Error(`Failed to parse extracted JSON block: ${innerErr.message}`);
      }
    }
    throw new Error(`Invalid JSON syntax in text: ${e.message}`);
  }
}

// ============================================================================
//  HTTP Request Helpers
// ============================================================================

/**
 * Helper to make POST requests to DeepSeek API (OpenAI-compatible)
 */
function makeDeepSeekRequest(payload) {
  return new Promise((resolve, reject) => {
    if (!DEEPSEEK_API_KEY) {
      return reject(new Error('DEEPSEEK_API_KEY is not defined in environment'));
    }

    const dataString = JSON.stringify(payload);
    const options = {
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(dataString)
      },
      timeout: 30000 // 30s timeout
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.setEncoding('utf-8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse DeepSeek response JSON'));
          }
        } else if (res.statusCode === 429) {
          reject(new Error('DEEPSEEK_RATE_LIMITED'));
        } else {
          try {
            const errorObj = JSON.parse(body);
            reject(new Error(errorObj.error?.message || `DeepSeek API returned status ${res.statusCode}`));
          } catch (e) {
            reject(new Error(`DeepSeek API returned status ${res.statusCode}: ${body}`));
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('DeepSeek request timed out'));
    });
    req.write(dataString);
    req.end();
  });
}

/**
 * Helper to make POST requests to Groq API (OpenAI-compatible)
 */
function makeGroqRequest(payload) {
  return new Promise((resolve, reject) => {
    if (!GROQ_API_KEY) {
      return reject(new Error('GROQ_API_KEY is not defined in environment'));
    }

    const dataString = JSON.stringify(payload);
    const options = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(dataString)
      },
      timeout: 30000 // 30s — Groq is usually sub-second
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.setEncoding('utf-8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse Groq response JSON'));
          }
        } else if (res.statusCode === 429) {
          reject(new Error('GROQ_RATE_LIMITED'));
        } else {
          try {
            const errorObj = JSON.parse(body);
            reject(new Error(errorObj.error?.message || `Groq API returned status ${res.statusCode}`));
          } catch (e) {
            reject(new Error(`Groq API returned status ${res.statusCode}: ${body}`));
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Groq request timed out'));
    });
    req.write(dataString);
    req.end();
  });
}

/**
 * Helper to make POST requests to Ollama API
 */
function makeOllamaRequest(payload) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(payload);
    const options = {
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      },
      timeout: 60000 // 60s timeout
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf-8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse Ollama response JSON'));
          }
        } else {
          reject(new Error(`Ollama API returned status code ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Ollama request timed out'));
    });
    req.write(dataString);
    req.end();
  });
}

/**
 * Helper to make POST requests to Gemini API
 */
function makeGeminiRequest(payload) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return reject(new Error('GEMINI_API_KEY is not defined in environment'));
    }

    const url = `${GEMINI_API_URL}?key=${apiKey}`;
    const dataString = JSON.stringify(payload);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      },
      timeout: 10000 // 10s timeout
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.setEncoding('utf-8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse Gemini response JSON'));
          }
        } else {
          try {
            const errorObj = JSON.parse(body);
            reject(new Error(errorObj.error?.message || `Gemini API returned status code ${res.statusCode}`));
          } catch (e) {
            reject(new Error(`Gemini API returned status code ${res.statusCode}: ${body}`));
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini request timed out'));
    });
    req.write(dataString);
    req.end();
  });
}

// ============================================================================
//  Prompts & Schema
// ============================================================================

/**
 * Route schema for structured classification output
 */
const routingSchema = {
  type: 'object',
  properties: {
    tool: {
      type: 'string',
      description: 'The classified tool to query the database. Must be one of: risk, network, map, chart, finance, socio, similar, forecast, text, ocr, cdr, biometrics, dispatch, timeline, early_warning, case_summary, general.'
    },
    parameters: {
      type: 'object',
      properties: {
        accused_name: { type: 'string', description: 'Name of any accused person mentioned.' },
        district: { type: 'string', description: 'District name. One of: Bengaluru City, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi.' },
        crime_type: { type: 'string', description: 'Category of crime. One of: Cyber Crime, Theft, Organized Crime, Financial Fraud.' },
        fir_number: { type: 'string', description: 'Specific case or FIR ID if mentioned, e.g. FIR-2026-003.' }
      }
    }
  },
  required: ['tool']
};

const routingSystemPrompt = `You are the query router and entity extractor for the Karnataka State Police (KSP) Crime Intelligence Portal.
Analyze the user's natural language query and classify it into one of the following tools:
1. "risk" - Recidivism risk profile of a specific accused person.
2. "network" - Syndicate links, accomplice networks, or offender connections.
3. "map" - Geographical coordinates or crime hotspots.
4. "chart" - Monthly trends, comparisons, or crime statistics.
5. "finance" - Financial transaction trails, money flow, bank accounts, or hawala channels.
6. "socio" - Socio-demographic analysis, age groups, literacy rate, unemployment, or poverty.
7. "similar" - Similar past cases matching target case.
8. "forecast" - Early warnings or predicted hotspots.
9. "text" - Search descriptions, modus operandi search, or text lookup.
10. "ocr" - Vernacular document OCR scanning, translation, or entity analysis.
11. "cdr" - Call Detail Record cell tower trajectory timeline or spatial collision analysis.
12. "biometrics" - Facial recognition, mugshot similarity searches, or biometric matching.
13. "dispatch" - Emergency 112 dispatch logs, patrol status, or vehicle routing.
14. "timeline" - Investigation timeline, chronology of events, case progress, or sequence of events for a specific case.
15. "early_warning" - Repeat crime alerts, gang activity detection, crime escalation patterns, temporal crime surges, or enhanced early warning intelligence.
16. "case_summary" - Case summary, case brief, case dossier, automated case report, or case file overview.
17. "general" - General questions, criminology definitions, explanations, standard Q&A, or general knowledge queries unrelated to a specific database record search.

Extract any specific parameters:
- "accused_name": Accused name.
- "district": District name. Must be exactly one of: Bengaluru City, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi.
- "crime_type": Crime type. Must be exactly one of: Cyber Crime, Theft, Organized Crime, Financial Fraud.
- "fir_number": FIR/Case number (e.g. FIR-2026-001).

You MUST respond strictly in valid JSON format matching this schema:
{
  "tool": "risk" | "network" | "map" | "chart" | "finance" | "socio" | "similar" | "forecast" | "text" | "ocr" | "cdr" | "biometrics" | "dispatch" | "timeline" | "early_warning" | "case_summary" | "general",
  "parameters": {
    "accused_name": "extracted_name_or_null",
    "district": "extracted_district_or_null",
    "crime_type": "extracted_crime_type_or_null",
    "fir_number": "extracted_fir_number_or_null"
  }
}
Do not include any other text, explanations, markdown formatting, or code blocks. Return ONLY the raw JSON object.`;

const narrativeSystemPrompt = `You are the AI Intelligence Assistant for the Karnataka State Police (KSP) Crime Intelligence Portal.

Your task: Given a user query, the tool used, and the database records returned, write a brief intelligence briefing.

STRICT RULES:
- Write 2-4 sentences MAXIMUM. Be extremely concise.
- Start with a direct answer to the user's question.
- If the user query is a general, informational, or analytical question (e.g., asking for definitions, explanations, criminology concepts, or how a score is calculated), answer it directly using your internal knowledge.
- If the tool is 'general', answer the question directly. No database records are provided.
- If the provided database data is unrelated to the user's general question, ignore the unrelated data and answer the question directly.
- For specific data lookups (e.g., searching for specific suspects, cases, or transactions), rely strictly on the provided data and mention specific numbers, names, FIR numbers, or amounts.
- Use formal law enforcement tone. No casual language.
- Do NOT describe the data structure or JSON format.
- If it is a database record search query and no matching data is found, say "No matching records found in the KSP database for this query."`;

// ============================================================================
//  Provider-specific LLM call functions
// ============================================================================

/**
 * Call DeepSeek API (OpenAI-compatible chat completions)
 */
async function callDeepSeek(systemPrompt, userMessage, jsonMode = false) {
  const payload = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: jsonMode ? 0.1 : 0.2,
    max_tokens: jsonMode ? 300 : 500,
    stream: false
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const result = await makeDeepSeekRequest(payload);
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from DeepSeek');
  return content.trim();
}

/**
 * Call Groq API (OpenAI-compatible chat completions)
 */
async function callGroq(systemPrompt, userMessage, jsonMode = false) {
  const payload = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: jsonMode ? 0.1 : 0.2,
    max_tokens: jsonMode ? 300 : 500,
    stream: false
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const result = await makeGroqRequest(payload);
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Groq');
  return content.trim();
}

/**
 * Call Ollama API (local)
 */
async function callOllama(systemPrompt, userMessage, jsonMode = false) {
  const payload = {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    stream: false,
    options: { temperature: jsonMode ? 0.1 : 0.2, num_predict: jsonMode ? 300 : 200, num_ctx: 2048 }
  };

  if (jsonMode) {
    payload.format = 'json';
  }

  const result = await makeOllamaRequest(payload);
  const content = result.message?.content;
  if (!content) throw new Error('Empty response from Ollama');
  return content.trim();
}

/**
 * Call Gemini API
 */
async function callGemini(systemPrompt, userMessage, jsonMode = false) {
  const payload = {
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature: jsonMode ? 0.1 : 0.3 }
  };

  if (jsonMode) {
    payload.generationConfig.responseMimeType = 'application/json';
    payload.generationConfig.responseSchema = routingSchema;
  }

  const result = await makeGeminiRequest(payload);
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text.trim();
}

/**
 * Helper to make POST requests to GLM-5 API (OpenAI-compatible)
 */
function makeGLMRequest(payload) {
  return new Promise((resolve, reject) => {
    if (!GLM_API_KEY && GLM_API_BASE.includes('api.z.ai')) {
      return reject(new Error('GLM_API_KEY is not defined in environment'));
    }

    const { URL } = require('url');
    const dataString = JSON.stringify(payload);
    const targetUrl = new URL(`${GLM_API_BASE}/chat/completions`);
    const isHttps = targetUrl.protocol === 'https:';
    const reqLib = isHttps ? https : http;

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(dataString)
    };

    if (GLM_API_KEY) {
      headers['Authorization'] = `Bearer ${GLM_API_KEY}`;
    }

    const options = {
      method: 'POST',
      headers: headers,
      timeout: 60000 // 60s timeout
    };

    const req = reqLib.request(targetUrl, options, (res) => {
      let body = '';
      res.setEncoding('utf-8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse GLM response JSON'));
          }
        } else {
          try {
            const errorObj = JSON.parse(body);
            reject(new Error(errorObj.error?.message || `GLM API returned status ${res.statusCode}`));
          } catch (e) {
            reject(new Error(`GLM API returned status ${res.statusCode}: ${body}`));
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('GLM request timed out'));
    });
    req.write(dataString);
    req.end();
  });
}

/**
 * Helper to stream GLM response chunk-by-chunk
 */
function makeGLMStreamRequest(payload, onToken) {
  return new Promise((resolve, reject) => {
    if (!GLM_API_KEY && GLM_API_BASE.includes('api.z.ai')) {
      return reject(new Error('GLM_API_KEY is not defined in environment'));
    }

    const { URL } = require('url');
    const dataString = JSON.stringify({ ...payload, stream: true });
    const targetUrl = new URL(`${GLM_API_BASE}/chat/completions`);
    const isHttps = targetUrl.protocol === 'https:';
    const reqLib = isHttps ? https : http;

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(dataString)
    };

    if (GLM_API_KEY) {
      headers['Authorization'] = `Bearer ${GLM_API_KEY}`;
    }

    const options = {
      method: 'POST',
      headers: headers,
      timeout: 60000
    };

    const req = reqLib.request(targetUrl, options, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          reject(new Error(`GLM API returned status ${res.statusCode}: ${body}`));
        });
        return;
      }

      res.setEncoding('utf-8');
      let buffer = '';

      res.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Save partial line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                onToken(content);
              }
            } catch (e) {
              // Ignore parsing errors on partial streams
            }
          }
        }
      });

      res.on('end', () => {
        if (buffer && buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              onToken(content);
            }
          } catch (e) {}
        }
        resolve();
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('GLM request timed out'));
    });
    req.write(dataString);
    req.end();
  });
}

/**
 * Call GLM API
 */
async function callGLM(systemPrompt, userMessage, jsonMode = false) {
  const payload = {
    model: GLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: jsonMode ? 0.1 : 0.2,
    max_tokens: jsonMode ? 300 : 500
  };

  // Add thinking control params if thinking is disabled or reasoning effort is custom
  if (!GLM_ENABLE_THINKING) {
    payload.enable_thinking = false;
  } else if (GLM_REASONING_EFFORT === 'high') {
    payload.reasoning_effort = 'high';
  }

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const result = await makeGLMRequest(payload);
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from GLM');
  return content.trim();
}


// ============================================================================
//  Unified LLM call with automatic fallback chain
// ============================================================================

/**
 * Calls the best available LLM with automatic fallback.
 * Priority: Groq → Gemini → Ollama
 * Returns: { success, content, provider }
 */
async function callLLM(systemPrompt, userMessage, jsonMode = false) {
  const providers = [];

  // Build the provider chain in priority order
  if (USE_DEEPSEEK && DEEPSEEK_API_KEY) {
    providers.push({ name: 'deepseek', fn: () => callDeepSeek(systemPrompt, userMessage, jsonMode) });
  }
  if (USE_GLM && (GLM_API_KEY || !GLM_API_BASE.includes('api.z.ai'))) {
    providers.push({ name: 'glm', fn: () => callGLM(systemPrompt, userMessage, jsonMode) });
  }
  if (USE_GROQ && GROQ_API_KEY) {
    providers.push({ name: 'groq', fn: () => callGroq(systemPrompt, userMessage, jsonMode) });
  }
  if (process.env.GEMINI_API_KEY) {
    providers.push({ name: 'gemini', fn: () => callGemini(systemPrompt, userMessage, jsonMode) });
  }
  if (USE_OLLAMA) {
    providers.push({ name: 'ollama', fn: () => callOllama(systemPrompt, userMessage, jsonMode) });
  }

  if (providers.length === 0) {
    return { success: false, reason: 'missing_llm_config' };
  }

  for (const provider of providers) {
    try {
      const content = await provider.fn();
      return { success: true, content, provider: provider.name };
    } catch (error) {
      console.warn(`⚠️  ${provider.name} failed: ${error.message}`);
      // If rate-limited or failed, try next provider
      continue;
    }
  }

  return { success: false, error: 'All LLM providers failed' };
}

// ============================================================================
//  Public API: routeQuery & generateNarrative
// ============================================================================

/**
 * Route query to matching tool using the best available LLM
 */
async function routeQuery(queryText) {
  const userMessage = `User Query: "${queryText}"`;
  const result = await callLLM(routingSystemPrompt, userMessage, true);

  if (!result.success) {
    return { success: false, reason: result.reason || result.error };
  }

  try {
    const classification = parseJsonResponse(result.content);
    if (!classification || !classification.tool) {
      throw new Error('Invalid classification format: missing tool');
    }
    if (!classification.parameters) {
      classification.parameters = { accused_name: null, district: null, crime_type: null, fir_number: null };
    }
    return { success: true, classification, provider: result.provider };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Summarize retrieved data to reduce token count for LLMs
 */
function summarizeData(toolName, data) {
  if (!data) return 'No data';
  
  if (toolName === 'map' && Array.isArray(data)) {
    if (data.length === 0) return 'No location records found';
    const districts = {};
    data.forEach(d => { districts[d.district] = (districts[d.district] || 0) + 1; });
    const types = {};
    data.forEach(d => { types[d.crime_type] = (types[d.crime_type] || 0) + 1; });
    return `${data.length} crime locations. Districts: ${JSON.stringify(districts)}. Crime types: ${JSON.stringify(types)}. Sample: ${data[0].fir_number} at ${data[0].address}`;
  }
  
  if (toolName === 'network' && data && data.nodes) {
    return `Network: ${data.nodes.length} nodes, ${data.edges?.length || 0} edges. Nodes: ${data.nodes.slice(0,5).map(n => n.label + '(' + n.type + ')').join(', ')}`;
  }
  
  if (toolName === 'chart' && data && data.monthly) {
    return `Trends: ${data.monthly.length} months. Districts: ${data.district?.length || 0}. Seasonal: ${Object.keys(data.seasonal || {}).join(', ')}`;
  }
  
  if (toolName === 'risk' && data && data.name) {
    return `Suspect: ${data.name}, Score: ${(data.overall_score*100).toFixed(0)}%, Threat: ${data.threat_level}. Factors: ${data.factors?.map(f=>f.factor).join(', ')}. Incidents: ${data.incidents?.length || 0}`;
  }
  
  if (toolName === 'finance' && data) {
    if (data.nodes) return `Financial: ${data.nodes.length} accounts, ${data.edges?.length || 0} transfers. Total: Rs ${data.totalAmount?.toLocaleString('en-IN') || 0}. Suspicious: ${data.suspiciousCount || 0}`;
    if (data.overview) return `Financial overview: ${data.overview.length} FIRs with transactions`;
  }
  
  if (toolName === 'socio' && data && data.demographics) {
    return `Demographics: ${data.demographics.ageGroups?.length || 0} age groups, ${data.genderSplit?.length || 0} genders. Socio correlation: ${data.socioCorrelation?.length || 0} districts`;
  }
  
  if (toolName === 'similar' && data && data.similarCases) {
    return `Target: ${data.targetCase?.fir_number}. ${data.similarCases.length} similar cases found. Leads: ${data.investigativeLeads?.length || 0}`;
  }
  
  if (toolName === 'forecast' && Array.isArray(data)) {
    return `${data.length} forecasts. ${data.filter(f=>f.risk_level==='Critical').length} Critical, ${data.filter(f=>f.risk_level==='High').length} High risk predictions`;
  }
  
  if (toolName === 'timeline' && data && data.timeline) {
    return `Timeline: ${data.timeline.length} events for ${data.summary?.overview?.fir_number}. Leads: ${data.summary?.leads?.length || 0}. Escalations: ${data.summary?.escalations?.length || 0}`;
  }
  
  if (toolName === 'early_warning' && data && data.alerts) {
    return `Early Warning: ${data.summary?.total_alerts || 0} alerts. Critical: ${data.summary?.critical_count || 0}. Repeat offenders: ${data.summary?.repeat_offenders || 0}. Gangs: ${data.summary?.active_gangs || 0}`;
  }
  
  if (toolName === 'case_summary' && data && data.summary) {
    return `Case: ${data.summary.overview?.fir_number}. ${data.summary.executive?.substring(0, 200)}`;
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) return 'Empty result set';
    return `Array of ${data.length} records. First: ${JSON.stringify(data[0]).substring(0, 300)}`;
  }
  if (typeof data === 'object') {
    return JSON.stringify(data).substring(0, 800);
  }
  return String(data).substring(0, 500);
}

/**
 * Generate narrative response using the best available LLM
 */
/**
 * Generate narrative response using the best available LLM
 */
async function generateNarrative(queryText, toolName, retrievedData) {
  const summarized = summarizeData(toolName, retrievedData);
  const inputContext = `Query: "${queryText}"\nTool: ${toolName}\nData: ${summarized}`;

  const result = await callLLM(narrativeSystemPrompt, inputContext, false);

  if (!result.success) {
    return { success: false, reason: result.reason || result.error };
  }

  return { success: true, narrative: result.content, provider: result.provider };
}

/**
 * Helper to stream DeepSeek response chunk-by-chunk
 */
function makeDeepSeekStreamRequest(payload, onToken) {
  return new Promise((resolve, reject) => {
    if (!DEEPSEEK_API_KEY) {
      return reject(new Error('DEEPSEEK_API_KEY is not defined in environment'));
    }

    const dataString = JSON.stringify({ ...payload, stream: true });
    const options = {
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(dataString)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          reject(new Error(`DeepSeek API returned status ${res.statusCode}: ${body}`));
        });
        return;
      }

      res.setEncoding('utf-8');
      let buffer = '';

      res.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Save partial line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                onToken(content);
              }
            } catch (e) {
              // Ignore parsing errors on partial streams
            }
          }
        }
      });

      res.on('end', () => {
        if (buffer && buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              onToken(content);
            }
          } catch (e) {}
        }
        resolve();
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('DeepSeek request timed out'));
    });
    req.write(dataString);
    req.end();
  });
}

/**
 * Helper to stream Groq response chunk-by-chunk
 */
function makeGroqStreamRequest(payload, onToken) {
  return new Promise((resolve, reject) => {
    if (!GROQ_API_KEY) {
      return reject(new Error('GROQ_API_KEY is not defined in environment'));
    }

    const dataString = JSON.stringify({ ...payload, stream: true });
    const options = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(dataString)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          reject(new Error(`Groq API returned status ${res.statusCode}: ${body}`));
        });
        return;
      }

      res.setEncoding('utf-8');
      let buffer = '';

      res.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Save partial line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                onToken(content);
              }
            } catch (e) {
              // Ignore parsing errors on partial streams
            }
          }
        }
      });

      res.on('end', () => {
        if (buffer && buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              onToken(content);
            }
          } catch (e) {}
        }
        resolve();
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Groq request timed out'));
    });
    req.write(dataString);
    req.end();
  });
}

/**
 * Stream narrative response chunk-by-chunk with fallbacks
 */
async function generateNarrativeStream(queryText, toolName, retrievedData, onToken, onMeta) {
  const summarized = summarizeData(toolName, retrievedData);
  const inputContext = `Query: "${queryText}"\nTool: ${toolName}\nData: ${summarized}`;

  if (USE_DEEPSEEK && DEEPSEEK_API_KEY) {
    try {
      const payload = {
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: narrativeSystemPrompt },
          { role: 'user', content: inputContext }
        ],
        temperature: 0.2,
        max_tokens: 500
      };
      
      onMeta({ provider: 'deepseek' });
      await makeDeepSeekStreamRequest(payload, onToken);
      return { success: true, provider: 'deepseek' };
    } catch (error) {
      console.warn(`⚠️ DeepSeek streaming failed: ${error.message}. Trying fallbacks...`);
    }
  }

  if (USE_GLM && (GLM_API_KEY || !GLM_API_BASE.includes('api.z.ai'))) {
    try {
      const payload = {
        model: GLM_MODEL,
        messages: [
          { role: 'system', content: narrativeSystemPrompt },
          { role: 'user', content: inputContext }
        ],
        temperature: 0.2,
        max_tokens: 500
      };
      if (!GLM_ENABLE_THINKING) {
        payload.enable_thinking = false;
      } else if (GLM_REASONING_EFFORT === 'high') {
        payload.reasoning_effort = 'high';
      }
      onMeta({ provider: 'glm' });
      await makeGLMStreamRequest(payload, onToken);
      return { success: true, provider: 'glm' };
    } catch (error) {
      console.warn(`⚠️ GLM streaming failed: ${error.message}. Trying fallbacks...`);
    }
  }

  if (USE_GROQ && GROQ_API_KEY) {
    try {
      const payload = {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: narrativeSystemPrompt },
          { role: 'user', content: inputContext }
        ],
        temperature: 0.2,
        max_tokens: 500
      };
      
      onMeta({ provider: 'groq' });
      await makeGroqStreamRequest(payload, onToken);
      return { success: true, provider: 'groq' };
    } catch (error) {
      console.warn(`⚠️ Groq streaming failed: ${error.message}. Trying fallbacks...`);
    }
  }

  // Fallback to non-streaming with simulated typing speed
  const fallbackResult = await callLLM(narrativeSystemPrompt, inputContext, false);
  if (fallbackResult.success) {
    onMeta({ provider: fallbackResult.provider });
    const content = fallbackResult.content;
    const words = content.split(/(\s+)/);
    for (const word of words) {
      onToken(word);
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    return { success: true, provider: fallbackResult.provider };
  }

  // Final mock fallback
  onMeta({ provider: 'mock' });
  const mockText = `No dynamic narrative available. Sourced data from KSP database for ${toolName}.`;
  const mockWords = mockText.split(/(\s+)/);
  for (const word of mockWords) {
    onToken(word);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  return { success: true, provider: 'mock' };
}

async function generateLegalRecommendation(caseNarrative) {
  const systemPrompt = `You are the AI Legal Advisor for the Karnataka State Police.
Your task is to analyze the brief facts / narrative of a crime, identify the key criminal elements, and map them to the corresponding sections of the Bharatiya Nyaya Sanhita (BNS), 2023.

For context, here are some common BNS and IPC section mappings:
- Murder: IPC 302 -> BNS 103 (Punishment: Death or life imprisonment, Cognizable: Yes, Bailable: No)
- Culpable Homicide: IPC 304 -> BNS 105 (Punishment: Life imprisonment or 10 years, Cognizable: Yes, Bailable: No)
- Attempt to Murder: IPC 307 -> BNS 109 (Punishment: Life imprisonment, Cognizable: Yes, Bailable: No)
- Hurt / Grievous Hurt: IPC 323/324/325 -> BNS 115/117 (Punishment: Up to 7 years, Cognizable: Yes, Bailable: Yes/No depending on severity)
- Rape: IPC 376 -> BNS 64 (Punizable: Life imprisonment, Cognizable: Yes, Bailable: No)
- Assault on Woman (Modesty): IPC 354 -> BNS 74 (Punishment: 5 years, Cognizable: Yes, Bailable: No)
- Theft: IPC 379 -> BNS 303 (Punishment: 3 years, Cognizable: Yes, Bailable: Yes)
- Theft in Dwelling House: IPC 380 -> BNS 305 (Punishment: 7 years, Cognizable: Yes, Bailable: No)
- Extortion: IPC 384 -> BNS 308 (Punishment: 7 years, Cognizable: Yes, Bailable: Yes/No depending on severity)
- Robbery: IPC 392 -> BNS 309 (Punishment: 10 years, Cognizable: Yes, Bailable: No)
- Dacoity: IPC 395 -> BNS 310 (Punishment: Life imprisonment, Cognizable: Yes, Bailable: No)
- Cheating: IPC 420 -> BNS 318 (Punishment: 7 years, Cognizable: Yes, Bailable: No)
- Criminal Breach of Trust: IPC 406 -> BNS 316 (Punishment: 3 years, Cognizable: Yes, Bailable: Yes)
- Criminal Trespass / House Trespass: IPC 447/448 -> BNS 329 (Cognizable: Yes, Bailable: Yes)
- Cruelty by Husband/Relatives: IPC 498A -> BNS 85 (Punishment: 3 years, Cognizable: Yes, Bailable: No)
- Dowry Death: IPC 304B -> BNS 80 (Punishment: Life/7 years, Cognizable: Yes, Bailable: No)

Based on the narrative provided, suggest the most applicable BNS sections.
You MUST respond with a JSON object in this format (do not include any markdown wrappers, or if you do, wrap it strictly in a valid JSON block):
{
  "analysis": "A brief analysis of the criminal elements found in the facts.",
  "recommendations": [
    {
      "bns_section": "303",
      "ipc_section": "379",
      "crime_type": "Theft",
      "reasoning": "Explain why this section applies based on facts.",
      "severity": "High",
      "max_punishment": "3 years",
      "is_cognizable": 1,
      "is_bailable": 1
    }
  ],
  "overall_severity": "Critical",
  "next_steps": "Investigator action items."
}
`;

  const userMessage = `Case Narrative: "${caseNarrative}"`;
  
  // Try live LLM call first
  const result = await callLLM(systemPrompt, userMessage, true);
  if (result.success) {
    try {
      const recommendation = parseJsonResponse(result.content);
      return { success: true, data: recommendation, provider: result.provider };
    } catch (err) {
      console.warn("AI Legal Advisor JSON parse failed. Falling back to rule-based parser.");
    }
  }

  // Rule-based Fallback Parser
  const text = caseNarrative.toLowerCase();
  const recommendations = [];
  let overallSeverity = 'Medium';
  let analysis = 'Analyzed via Karnataka State Police Local Rule-Based NLP engine. Identified elements matching key BNS 2023 acts.';
  let nextSteps = '1. Secure scene and gather witnesses.\n2. Obtain local CCTV recordings.\n3. Log details in evidence registry.';

  if (text.includes('kill') || text.includes('murder') || text.includes('dead') || text.includes('death')) {
    recommendations.push({
      bns_section: '103',
      ipc_section: '302',
      crime_type: 'Murder',
      reasoning: 'Facts indicate elements of culpable homicide amounting to murder.',
      severity: 'Critical',
      max_punishment: 'Death or Life Imprisonment',
      is_cognizable: 1,
      is_bailable: 0
    });
    overallSeverity = 'Critical';
    nextSteps = '1. Cordon crime scene immediately.\n2. Dispatch forensic units and request autopsy report.\n3. Secure statement from first responder.';
  }

  if (text.includes('attempt') && (text.includes('murder') || text.includes('kill'))) {
    recommendations.push({
      bns_section: '109',
      ipc_section: '307',
      crime_type: 'Attempt to Murder',
      reasoning: 'Act done with intention to cause death, which failed.',
      severity: 'High',
      max_punishment: 'Life Imprisonment',
      is_cognizable: 1,
      is_bailable: 0
    });
    overallSeverity = 'High';
  }

  if (text.includes('cheat') || text.includes('phish') || text.includes('sms') || text.includes('fraud') || text.includes('scam') || text.includes('net-banking')) {
    recommendations.push({
      bns_section: '318',
      ipc_section: '420',
      crime_type: 'Cheating',
      reasoning: 'Deceptive inducement to deliver property or transfer funds online.',
      severity: 'High',
      max_punishment: '7 years',
      is_cognizable: 1,
      is_bailable: 0
    });
    overallSeverity = 'High';
    nextSteps = '1. Issue notice to Bank node to freeze suspect accounts.\n2. Trace IP headers and phone subscriber registration logs.\n3. Retrieve server access trail logs.';
  }

  if (text.includes('theft') || text.includes('snatch') || text.includes('steal') || text.includes('gold') || text.includes('jewelry') || text.includes('chain')) {
    recommendations.push({
      bns_section: '303',
      ipc_section: '379',
      crime_type: 'Theft',
      reasoning: 'Dishonest removal of moveable property from possession of owner.',
      severity: 'Medium',
      max_punishment: '3 years',
      is_cognizable: 1,
      is_bailable: 1
    });
    
    if (text.includes('house') || text.includes('door') || text.includes('lock') || text.includes('break')) {
      recommendations.push({
        bns_section: '305',
        ipc_section: '380',
        crime_type: 'Theft in dwelling house',
        reasoning: 'Theft committed inside a residential building or dwelling.',
        severity: 'High',
        max_punishment: '7 years',
        is_cognizable: 1,
        is_bailable: 0
      });
      overallSeverity = 'High';
    }
  }

  if (text.includes('assault') || text.includes('beat') || text.includes('hit') || text.includes('rod') || text.includes('attack')) {
    recommendations.push({
      bns_section: '115',
      ipc_section: '323',
      crime_type: 'Voluntarily causing hurt',
      reasoning: 'Physical battery causing bodily pain or injury.',
      severity: 'Medium',
      max_punishment: '1 year',
      is_cognizable: 1,
      is_bailable: 1
    });
    
    if (text.includes('fracture') || text.includes('severe') || text.includes('iron') || text.includes('weapon')) {
      recommendations.push({
        bns_section: '117',
        ipc_section: '325',
        crime_type: 'Voluntarily causing grievous hurt',
        reasoning: 'Battery resulting in bone fracture or severe physical incapacitation.',
        severity: 'High',
        max_punishment: '7 years',
        is_cognizable: 1,
        is_bailable: 0
      });
      overallSeverity = 'High';
    }
  }

  // Default if no keywords matched
  if (recommendations.length === 0) {
    recommendations.push({
      bns_section: '296',
      ipc_section: '290',
      crime_type: 'Public Nuisance',
      reasoning: 'General disturbance of public order or generic offense facts.',
      severity: 'Low',
      max_punishment: 'Fine',
      is_cognizable: 0,
      is_bailable: 1
    });
    overallSeverity = 'Low';
  }

  return {
    success: true,
    data: {
      analysis,
      recommendations,
      overall_severity: overallSeverity,
      next_steps: nextSteps
    },
    provider: 'local-rules'
  };
}

module.exports = {
  routeQuery,
  generateNarrative,
  generateNarrativeStream,
  generateLegalRecommendation
};
