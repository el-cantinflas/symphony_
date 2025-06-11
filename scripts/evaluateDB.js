// scripts/evaluateDB.js
const { addLogEntry, getLogs, LOG_LEVELS, db } = require('../src/DBManager');
const assert = require('assert');

async function clearTestLogs() {
  return new Promise((resolve, reject) => {
    try {
      const result = db.prepare("DELETE FROM logs WHERE event LIKE 'DBTest%'").run();
      console.log(`Cleared ${result.changes} DB test logs.`);
      resolve(result.changes);
    } catch (err) {
      console.error('Failed to clear test logs:', err);
      reject(err);
    }
  });
}

async function runDBEvaluations() {
  console.log('\n--- Starting Database Evaluations ---');

  try {
    await clearTestLogs();

    // Test 1: Add and retrieve a simple log entry
    console.log('Test 1: Adding and retrieving a simple log...');
    const testEvent1 = 'DBTest-Simple';
    const testData1 = { info: 'This is a simple test' };
    await addLogEntry(LOG_LEVELS.INFO.name, testEvent1, testData1);

    const logs1 = await getLogs({ event: testEvent1 });
    assert.strictEqual(logs1.length, 1, 'Test 1: Should find exactly one log entry.');
    assert.strictEqual(logs1[0].level, LOG_LEVELS.INFO.name, 'Test 1: Log level should be INFO.');
    assert.strictEqual(logs1[0].event, testEvent1, `Test 1: Event name should be ${testEvent1}.`);
    assert.deepStrictEqual(logs1[0].data, testData1, 'Test 1: Log data should match.');
    console.log('Test 1: Passed.');

    // Test 2: Add and retrieve a log with a different level
    console.log('\nTest 2: Adding and retrieving a WARNING log...');
    const testEvent2 = 'DBTest-Warning';
    const testData2 = { warning: 'This is a warning message' };
    await addLogEntry(LOG_LEVELS.WARNING.name, testEvent2, testData2);

    const logs2 = await getLogs({ level: LOG_LEVELS.WARNING.name, event: testEvent2 });
    assert.strictEqual(logs2.length, 1, 'Test 2: Should find exactly one warning log entry.');
    assert.strictEqual(logs2[0].level, LOG_LEVELS.WARNING.name, 'Test 2: Log level should be WARNING.');
    assert.deepStrictEqual(logs2[0].data, testData2, 'Test 2: Log data should match.');
    console.log('Test 2: Passed.');

    // Test 3: Ensure getLogs filtering works
    console.log('\nTest 3: Verifying log filtering...');
    const otherLogs = await getLogs({ event: 'NonExistentEvent' });
    assert.strictEqual(otherLogs.length, 0, 'Test 3: Should find no logs for a non-existent event.');
    console.log('Test 3: Passed.');

    console.log('\nDatabase Evaluations Finished Successfully.');
  } catch (error) {
    console.error('\nDatabase Evaluations Failed:', error);
    throw error; // Re-throw to fail the main test runner
  }
}

runDBEvaluations().catch(err => {
    console.error("A critical error occurred during DB evaluations.", err);
    process.exit(1);
});