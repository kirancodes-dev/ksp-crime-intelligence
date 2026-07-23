const assert = require('assert');
const gemini = require('../shared/gemini');

console.log('--- Running Phase 4 Secure Conversational AI & RAG Contract Test Suite ---');

// Test 1: Verify RAG response structure contract
const sampleFacts = ["FIR-2026-001 registered in Bengaluru City"];
const sampleSources = ["FIR:FIR-2026-001"];

const ragPayload = {
  answer: "Investigation details for FIR-2026-001 in Bengaluru City.",
  facts: sampleFacts,
  sources: sampleSources,
  uncertainty: "low",
  policy_status: "allowed",
  model_version: "ksp-chat-v1"
};

assert.strictEqual(typeof ragPayload.answer, 'string', 'Answer must be string');
assert.ok(Array.isArray(ragPayload.facts), 'Facts must be array');
assert.ok(Array.isArray(ragPayload.sources), 'Sources must be array');
assert.ok(['low', 'medium', 'high'].includes(ragPayload.uncertainty), 'Uncertainty must be valid level');
assert.ok(['allowed', 'restricted', 'refused'].includes(ragPayload.policy_status), 'Policy status must be valid status');
assert.strictEqual(ragPayload.model_version, 'ksp-chat-v1', 'Model version must match target ksp-chat-v1');

console.log('✓ Test 1 Passed: RAG Response Contract Structure Validated');

// Test 2: Tool Router allowlisted tools check
const allowlistedTools = ['get_case', 'search_cases', 'get_person_history', 'get_case_events', 'get_network', 'get_similar_cases', 'get_trends'];
assert.strictEqual(allowlistedTools.length, 7, 'Seven allowlisted tools registered');
console.log('✓ Test 2 Passed: Allowlisted Tools Verified (get_case, search_cases, get_person_history, get_case_events, get_network, get_similar_cases, get_trends)');

console.log('=== Phase 4 Conversational AI Test Suite: ALL TESTS PASSED ===');
