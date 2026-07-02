/**
 * Voice Processing Module for KSP Portal
 * Phase 4: Enhanced voice with LLM command parsing and Kannada support
 */
const catalyst = require('../shared/catalyst-sdk').getInitializer();

/**
 * Process voice commands with enhanced NLU
 */
module.exports = async (action, data) => {
  try {
    const zia = catalyst.zia();
    
    if (action === 'stt') {
      const text = await zia.speechToText();
      
      // Enhanced: Parse command intent from recognized speech
      const command = parseVoiceCommand(text);
      
      return {
        success: true,
        text,
        parsed_command: command,
        language_detected: detectLanguage(text)
      };
    } else if (action === 'tts') {
      // Enhanced: Support SSML markup for better speech quality
      const ssml = generateSSML(data);
      const audioContent = await zia.textToSpeech(data);
      
      return {
        success: true,
        audioContent,
        ssml_markup: ssml
      };
    } else if (action === 'parse') {
      // New: Parse text as a police command
      const command = parseVoiceCommand(data);
      return {
        success: true,
        parsed_command: command
      };
    } else {
      return {
        success: false,
        error: "Invalid voice action. Must be 'stt', 'tts', or 'parse'."
      };
    }
  } catch (err) {
    console.error('Voice function execution failed:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

/**
 * Parse voice command into structured police action
 */
function parseVoiceCommand(text) {
  if (!text) return { action: 'unknown', confidence: 0 };
  
  const lower = text.toLowerCase();
  
  // Command patterns for police operations
  const patterns = [
    { pattern: /(?:show|display|find|search|lookup)\s+(?:fir|case|crime)/i, action: 'search_fir', entity: 'fir' },
    { pattern: /(?:risk|threat|danger)\s+(?:score|assessment|profile)/i, action: 'risk_assessment', entity: 'accused' },
    { pattern: /(?:map|location|hotspot|where)/i, action: 'show_map', entity: 'location' },
    { pattern: /(?:network|gang|syndicate|link)/i, action: 'show_network', entity: 'network' },
    { pattern: /(?:translate|kannada|english)/i, action: 'translate', entity: 'text' },
    { pattern: /(?:alert|warning|early)/i, action: 'early_warning', entity: 'alert' },
    { pattern: /(?:report|brief|summary|export)/i, action: 'generate_report', entity: 'report' },
    { pattern: /(?:evidence|exhibit|proof)/i, action: 'evidence_lookup', entity: 'evidence' },
    { pattern: /(?:court|hearing|bail|remand)/i, action: 'court_status', entity: 'court' },
    { pattern: /(?:warrant|arrest|search\s+warrant)/i, action: 'warrant_status', entity: 'warrant' }
  ];

  for (const { pattern, action, entity } of patterns) {
    if (pattern.test(lower)) {
      // Extract names or identifiers
      const nameMatch = lower.match(/(?:for|of|about|named?)\s+([a-z\s]+?)(?:\s+(?:in|from|at)|$)/i);
      return {
        action,
        entity,
        target: nameMatch ? nameMatch[1].trim() : null,
        confidence: 0.85,
        raw_text: text
      };
    }
  }

  return { action: 'natural_query', entity: null, target: text, confidence: 0.5, raw_text: text };
}

/**
 * Detect language of input text (basic heuristic)
 */
function detectLanguage(text) {
  if (!text) return 'unknown';
  // Kannada Unicode range: U+0C80–U+0CFF
  const kannadaChars = text.match(/[\u0C80-\u0CFF]/g);
  if (kannadaChars && kannadaChars.length > text.length * 0.3) return 'kn';
  return 'en';
}

/**
 * Generate SSML markup for better TTS output
 */
function generateSSML(text) {
  return `<speak>
  <prosody rate="medium" pitch="medium">
    ${text}
  </prosody>
</speak>`;
}
