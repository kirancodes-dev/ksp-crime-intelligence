/**
 * Enhanced RAG (Retrieval-Augmented Generation) Module
 * Phase 4: FTS5 keyword search + concept vector weighted rank fusion
 */
const catalyst = require('../shared/catalyst-sdk').getInitializer();

/**
 * Enhanced RAG query combining FTS5 full-text search with concept vector scoring
 * @param {string} query — User's natural language query
 * @param {string} userId — Requesting officer
 * @param {string} role — Officer role for RLS
 * @returns {Object} Ranked results from multiple retrieval strategies
 */
async function enhancedRAGQuery(query, userId, role) {
  const db = catalyst.datastore();
  const results = [];

  // Strategy 1: FTS5 full-text search (high recall)
  try {
    const ftsResults = await db.execute(`
      SELECT f.id, f.fir_number, f.district, f.crime_type, f.description, f.modus_operandi,
             f.status, f.date_reported
      FROM FIR f
      WHERE f.description LIKE ? OR f.modus_operandi LIKE ? OR f.crime_type LIKE ?
      LIMIT 20
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);

    ftsResults.forEach((r, i) => {
      results.push({
        ...r,
        retrieval_method: 'keyword',
        keyword_rank: i + 1,
        keyword_score: 1.0 - (i * 0.05)
      });
    });
  } catch (err) {
    console.error('FTS search failed:', err.message);
  }

  // Strategy 2: Concept vector scoring (high precision)
  try {
    const zia = catalyst.zia();
    const ragResults = await zia.quickML().rag.retrieve(query, 10);
    
    if (ragResults && ragResults.length > 0) {
      for (const rr of ragResults) {
        const existing = results.find(r => r.fir_number === rr.fir_number);
        if (existing) {
          // Boost score for items found by both strategies
          existing.concept_score = rr.similarity || 0.8;
          existing.retrieval_method = 'hybrid';
        } else {
          results.push({
            ...rr,
            retrieval_method: 'concept',
            concept_score: rr.similarity || 0.7,
            keyword_score: 0
          });
        }
      }
    }
  } catch (err) {
    console.error('Concept vector search failed:', err.message);
  }

  // Weighted rank fusion
  const KEYWORD_WEIGHT = 0.4;
  const CONCEPT_WEIGHT = 0.6;

  results.forEach(r => {
    const ks = r.keyword_score || 0;
    const cs = r.concept_score || 0;
    r.fusion_score = (ks * KEYWORD_WEIGHT) + (cs * CONCEPT_WEIGHT);
    
    // Bonus for hybrid results (found by both strategies)
    if (r.retrieval_method === 'hybrid') {
      r.fusion_score *= 1.2; // 20% boost
    }
  });

  // Sort by fusion score descending
  results.sort((a, b) => b.fusion_score - a.fusion_score);

  return {
    success: true,
    query,
    results: results.slice(0, 15),
    total: results.length,
    strategies_used: ['keyword', 'concept', 'fusion']
  };
}

module.exports = { enhancedRAGQuery };
