/**
 * Translation Module for KSP Portal
 * Phase 4: LLM-powered Kannada ↔ English translation with dictionary fallback
 */
const catalyst = require('../shared/catalyst-sdk').getInitializer();

// Try to import the LLM calling function from gemini.js
let callLLM = null;
try {
  const geminiModule = require('../shared/gemini');
  callLLM = geminiModule.callLLM || geminiModule.classifyWithLLM || null;
} catch (e) {
  // LLM module not available - will use dictionary fallback only
}

/**
 * Translate text between Kannada and English using LLM with dictionary fallback
 */
module.exports = async (text, fromLanguage, toLanguage) => {
  try {
    // Attempt 1: LLM-powered translation (highest quality)
    if (callLLM) {
      try {
        const direction = fromLanguage === 'kn' ? 'Kannada to English' : 'English to Kannada';
        const systemPrompt = `You are a precise translator for the Karnataka State Police. Translate the following text from ${direction}. 
Rules:
- Use formal police/legal terminology
- Preserve proper nouns (names, places) exactly as-is
- For legal terms, provide the official translation used in Karnataka courts
- Return ONLY the translated text, no explanations or notes`;

        const result = await callLLM(systemPrompt, text);
        if (result && typeof result === 'string' && result.trim().length > 0) {
          return {
            success: true,
            translation: result.trim(),
            method: 'llm',
            quality: 'high'
          };
        }
      } catch (llmErr) {
        console.log('LLM translation failed, falling back to dictionary:', llmErr.message);
      }
    }

    // Attempt 2: Catalyst Zia translation service
    try {
      const zia = catalyst.zia();
      const translation = await zia.translate(text, fromLanguage, toLanguage);
      return {
        success: true,
        translation,
        method: 'dictionary',
        quality: 'basic'
      };
    } catch (ziaErr) {
      return {
        success: true,
        translation: `[Translation pending: ${text}]`,
        method: 'passthrough',
        quality: 'none'
      };
    }

  } catch (err) {
    console.error('Translation execution failed:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
