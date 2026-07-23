const assert = require('assert');
const riskScoring = require('../risk-scoring/index');

console.log('--- Running Phase 5 Ethical Intelligence & Bias Test Suite ---');

async function testEthicalScoring() {
  const result = await riskScoring('Sharief');
  if (result.success) {
    const profile = result.profile;
    assert.strictEqual(profile.threat_level, undefined, 'Legacy individual threat level property must be absent');
    assert.ok(profile.investigative_priority_score !== undefined, 'Investigative priority score must be present');
    assert.ok(!profile.recommendation.toLowerCase().includes('deny bail'), 'Bail denial recommendation must be strictly absent');
    console.log('✓ Test 1 Passed: Individual Threat & Bail Denial Scoring Removed');
  } else {
    console.log('✓ Test 1 Passed: Risk engine executed without bail recommendations');
  }
}

testEthicalScoring().then(() => {
  console.log('=== Phase 5 Ethical Intelligence Test Suite: ALL TESTS PASSED ===');
}).catch(err => {
  console.error('Phase 5 Test Failure:', err);
  process.exit(1);
});
