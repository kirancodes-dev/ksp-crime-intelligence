const assert = require('assert');
const { createDatastoreAdapter, SqliteDatastoreAdapter, CatalystDatastoreAdapter } = require('../shared/datastore-adapters');

console.log('--- Running Phase 3 Datastore Adapter Test Suite ---');

// Test 1: Dev environment returns SqliteDatastoreAdapter
delete process.env.NODE_ENV;
delete process.env.CATALYST_ENV;

const devAdapter = createDatastoreAdapter();
assert.ok(devAdapter instanceof SqliteDatastoreAdapter, 'Dev mode must return SqliteDatastoreAdapter');
console.log('✓ Test 1 Passed: Development mode selects SqliteDatastoreAdapter');

// Test 2: Production mode without Catalyst SDK fails closed
process.env.NODE_ENV = 'production';
assert.throws(() => {
  createDatastoreAdapter(null);
}, /FATAL DATABASE SECURITY ERROR/, 'Production mode without Catalyst SDK must throw error');
console.log('✓ Test 2 Passed: Production mode fails closed when SQLite is attempted');

// Test 3: Production mode with Catalyst SDK initializes CatalystDatastoreAdapter
const mockCatalystSdk = {
  zcql: () => ({ executeZCQLQuery: async () => [] }),
  datastore: () => ({ table: () => ({}) })
};

const prodAdapter = createDatastoreAdapter(mockCatalystSdk);
assert.ok(prodAdapter instanceof CatalystDatastoreAdapter, 'Production mode with SDK must initialize CatalystDatastoreAdapter');
console.log('✓ Test 3 Passed: Production mode initializes CatalystDatastoreAdapter');

// Reset environment
delete process.env.NODE_ENV;

console.log('=== Phase 3 Datastore Adapter Test Suite: ALL TESTS PASSED ===');
