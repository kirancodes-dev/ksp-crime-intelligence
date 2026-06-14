const http = require('http');
const https = require('https');

// Initialize environment variables
require('./dotenv').config();

const USE_OLLAMA = process.env.USE_OLLAMA === 'true';
const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma2:2b';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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

/**
 * Route schema for structured classification output
 */
const routingSchema = {
  type: 'object',
  properties: {
    tool: {
      type: 'string',
      description: 'The classified tool to query the database. Must be one of: risk, network, map, chart, finance, socio, similar, forecast, text.'
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
9. "text" - General queries, descriptions, modus operandi search, or text lookup.

Extract any specific parameters:
- "accused_name": Accused name.
- "district": District name. Must be exactly one of: Bengaluru City, Mysuru, Hubballi-Dharwad, Mangaluru, Belagavi.
- "crime_type": Crime type. Must be exactly one of: Cyber Crime, Theft, Organized Crime, Financial Fraud.
- "fir_number": FIR/Case number (e.g. FIR-2026-001).

You MUST respond strictly in valid JSON format matching this schema:
{
  "tool": "risk" | "network" | "map" | "chart" | "finance" | "socio" | "similar" | "forecast" | "text",
  "parameters": {
    "accused_name": "extracted_name_or_null",
    "district": "extracted_district_or_null",
    "crime_type": "extracted_crime_type_or_null",
    "fir_number": "extracted_fir_number_or_null"
  }
}
Do not include any other text, explanations, markdown formatting, or code blocks. Return ONLY the raw JSON object.`;

const narrativeSystemPrompt = `You are the AI Intelligence Assistant for the Karnataka State Police (KSP) Crime Intelligence Portal.
Your job is to synthesize a professional, formal narrative response based on the user's query, triggered database tool, and retrieved records.

Rules:
- Write in a highly professional, formal, and authoritative tone suitable for senior law enforcement officers.
- Never use casual language or emojis.
- Present highlights, summaries, or anomalies found in the data. Be specific with names, dates, FIR numbers, and amounts.
- Keep the response concise but informative (1 to 3 paragraphs).
- If the data is empty or indicates no records were found, politely state that no matching records exist in the KSP database.
- Maintain data accuracy: do not invent or hallucinate data that is not in the JSON.`;

/**
 * Route query to matching tool using selected LLM (Ollama or Gemini)
 */
async function routeQuery(queryText) {
  const isLlmConfigured = USE_OLLAMA || process.env.GEMINI_API_KEY;
  if (!isLlmConfigured) {
    return { success: false, reason: 'missing_llm_config' };
  }

  if (USE_OLLAMA) {
    const payload = {
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: routingSystemPrompt },
        { role: 'user', content: `User Query: "${queryText}"` }
      ],
      stream: false,
      format: 'json',
      options: { temperature: 0.1 }
    };
    try {
      const result = await makeOllamaRequest(payload);
      const content = result.message?.content;
      if (!content) throw new Error('Empty response from Ollama');
      
      const classification = parseJsonResponse(content);
      if (!classification || !classification.tool) {
        throw new Error('Invalid classification format: missing tool');
      }
      if (!classification.parameters) {
        classification.parameters = { accused_name: null, district: null, crime_type: null, fir_number: null };
      }
      return { success: true, classification };
    } catch (error) {
      return { success: false, error: error.message };
    }
  } else {
    const payload = {
      contents: [{ role: 'user', parts: [{ text: `User Query: "${queryText}"` }] }],
      systemInstruction: {
        parts: [{ text: routingSystemPrompt }]
      },
      generationConfig: { responseMimeType: 'application/json', responseSchema: routingSchema, temperature: 0.1 }
    };
    try {
      const result = await makeGeminiRequest(payload);
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini');
      
      const classification = parseJsonResponse(text);
      if (!classification || !classification.tool) {
        throw new Error('Invalid classification format: missing tool');
      }
      if (!classification.parameters) {
        classification.parameters = { accused_name: null, district: null, crime_type: null, fir_number: null };
      }
      return { success: true, classification };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Generate narrative response using selected LLM (Ollama or Gemini)
 */
async function generateNarrative(queryText, toolName, retrievedData) {
  const isLlmConfigured = USE_OLLAMA || process.env.GEMINI_API_KEY;
  if (!isLlmConfigured) {
    return { success: false, reason: 'missing_llm_config' };
  }

  const inputContext = `User Query: "${queryText}"\nTriggered Tool: ${toolName}\nDatabase Records: ${JSON.stringify(retrievedData, null, 2)}`;

  if (USE_OLLAMA) {
    const payload = {
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: narrativeSystemPrompt },
        { role: 'user', content: inputContext }
      ],
      stream: false,
      options: { temperature: 0.3 }
    };
    try {
      const result = await makeOllamaRequest(payload);
      const narrative = result.message?.content;
      if (!narrative) throw new Error('Empty response from Ollama');
      return { success: true, narrative: narrative.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  } else {
    const payload = {
      contents: [{ role: 'user', parts: [{ text: inputContext }] }],
      systemInstruction: {
        parts: [{ text: narrativeSystemPrompt }]
      },
      generationConfig: { temperature: 0.3 }
    };
    try {
      const result = await makeGeminiRequest(payload);
      const narrative = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!narrative) throw new Error('Empty response from Gemini');
      return { success: true, narrative: narrative.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = {
  routeQuery,
  generateNarrative
};
