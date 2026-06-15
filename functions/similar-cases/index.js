const catalyst = require('../shared/catalyst-sdk').getInitializer();

module.exports = async (firId) => {
  try {
    const db = catalyst.datastore();

    // 1. Get the target FIR details
    const targetResults = await db.execute('SELECT * FROM FIR WHERE id = ?', [firId]);
    if (targetResults.length === 0) {
      return { success: false, error: `FIR with ID ${firId} not found.` };
    }
    const targetFir = targetResults[0];

    // Get accused for the target FIR
    const targetAccused = await db.execute('SELECT * FROM Accused WHERE fir_id = ?', [firId]);
    const targetAccusedNames = targetAccused.map(a => a.name);
    const targetGangs = targetAccused
      .map(a => a.gang_affiliation)
      .filter(g => g && g !== 'None' && g !== 'null');

    // Extract MO keywords from the target case
    const targetMoKeywords = extractKeywords(targetFir.modus_operandi || '');

    // 2. Find cases with the same crime_type (excluding self)
    const candidates = await db.execute(
      'SELECT * FROM FIR WHERE id != ? ORDER BY date_reported DESC',
      [firId]
    );

    // 3. Score similarity for each candidate
    const scoredCases = [];

    for (const candidate of candidates) {
      let score = 0;
      const sharedAttributes = [];
      const investigativeLeads = [];

      // Same crime type: +0.3
      if (candidate.crime_type === targetFir.crime_type) {
        score += 0.3;
        sharedAttributes.push(`Same crime type: ${candidate.crime_type}`);
      }

      // Same district: +0.2
      if (candidate.district === targetFir.district) {
        score += 0.2;
        sharedAttributes.push(`Same district: ${candidate.district}`);
      }

      // MO keyword overlap: +0.3 (proportional)
      const candidateMoKeywords = extractKeywords(candidate.modus_operandi || '');
      const moOverlap = targetMoKeywords.filter(kw => candidateMoKeywords.includes(kw));
      if (moOverlap.length > 0 && targetMoKeywords.length > 0) {
        const moScore = 0.3 * (moOverlap.length / targetMoKeywords.length);
        score += moScore;
        sharedAttributes.push(`Shared MO keywords: ${moOverlap.join(', ')}`);
      }

      // Shared accused / gang affiliation: +0.2
      const candidateAccused = await db.execute('SELECT * FROM Accused WHERE fir_id = ?', [candidate.id]);
      const candidateAccusedNames = candidateAccused.map(a => a.name);
      const candidateGangs = candidateAccused
        .map(a => a.gang_affiliation)
        .filter(g => g && g !== 'None' && g !== 'null');

      const sharedAccused = targetAccusedNames.filter(n => candidateAccusedNames.includes(n));
      const sharedGangs = targetGangs.filter(g => candidateGangs.includes(g));

      if (sharedAccused.length > 0) {
        score += 0.15;
        sharedAttributes.push(`Shared accused: ${sharedAccused.join(', ')}`);
        sharedAccused.forEach(name => {
          investigativeLeads.push(`Check accused '${name}' who appeared in both case ${targetFir.fir_number} and ${candidate.fir_number}`);
        });
      }

      if (sharedGangs.length > 0) {
        score += 0.05;
        sharedAttributes.push(`Shared gang affiliation: ${sharedGangs.join(', ')}`);
        sharedGangs.forEach(gang => {
          investigativeLeads.push(`Investigate gang '${gang}' connections between case ${targetFir.fir_number} and ${candidate.fir_number}`);
        });
      }

      // Only include cases with some degree of similarity
      if (score > 0) {
        scoredCases.push({
          fir_id: candidate.id,
          fir_number: candidate.fir_number,
          crime_type: candidate.crime_type,
          district: candidate.district,
          police_station: candidate.police_station,
          similarity_score: Math.min(score, 1.0),
          status: candidate.status,
          date_reported: candidate.date_reported,
          shared_attributes: sharedAttributes,
          investigative_leads: investigativeLeads
        });
      }
    }

    // 4. Sort by similarity score descending and return top 5
    scoredCases.sort((a, b) => b.similarity_score - a.similarity_score);
    const topMatches = scoredCases.slice(0, 5);

    // Aggregate all investigative leads from top matches
    const allLeads = topMatches.flatMap(c => c.investigative_leads);

    return {
      success: true,
      targetCase: {
        fir_id: targetFir.id,
        fir_number: targetFir.fir_number,
        crime_type: targetFir.crime_type,
        district: targetFir.district,
        police_station: targetFir.police_station,
        modus_operandi: targetFir.modus_operandi
      },
      similarCases: topMatches,
      investigativeLeads: [...new Set(allLeads)]
    };
  } catch (err) {
    console.error('Similar cases analysis failed:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Extract meaningful keywords from modus operandi text.
 * Filters out common stop words and returns lowercase tokens.
 */
function extractKeywords(text) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'this', 'that', 'these',
    'those', 'it', 'its', 'they', 'them', 'their', 'he', 'she', 'his',
    'her', 'we', 'our', 'you', 'your', 'using', 'used', 'through', 'via',
    'into', 'then', 'than', 'also', 'not', 'no', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'over'
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}
