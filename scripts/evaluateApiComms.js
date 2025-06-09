// scripts/evaluateApiComms.js
const apiClient = require('../src/ApiClient');
const { setConfigValue, getConfigValue, LOG_LEVELS, db } = require('../src/DBManager');
const assert = require('assert');

// Helper function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to clear logs (or specific types of logs)
async function clearApiLogs() {
  return new Promise((resolve, reject) => {
    try {
      // It's safer to be specific about events to avoid deleting unrelated logs.
      const result = db.prepare("DELETE FROM logs WHERE event LIKE 'ApiClient%' OR event = 'ApiClientRetry'").run();
      console.log(`Cleared ${result.changes} API-related logs.`);
      resolve(result.changes);
    } catch (err) {
      console.error('Failed to clear API logs:', err);
      reject(err);
    }
  });
}

async function getLogs(event, urlPattern, limit = 10) {
  return new Promise((resolve, reject) => {
    try {
      const query = `
        SELECT * FROM logs 
        WHERE event = ? AND data LIKE ?
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      // Using % for LIKE pattern matching for URL
      const logs = db.prepare(query).all(event, `%${urlPattern}%`, limit);
      resolve(logs.map(log => ({ ...log, data: JSON.parse(log.data || '{}') })));
    } catch (dbError) {
      console.error('Failed to fetch logs:', dbError);
      reject(dbError);
    }
  });
}

async function runEvaluations() {
  console.log('Starting API Communication Evaluations...');
  const originalLogLevel = getConfigValue('currentLogLevel');
  setConfigValue('currentLogLevel', LOG_LEVELS.DEBUG.name);
  console.log(`Log level set to: ${LOG_LEVELS.DEBUG.name}`);

  // --- Test Case 1: Successful GET Request ---
  console.log('\n--- Test Case 1: Successful GET Request ---');
  const successGetUrl = '/mock/test/orderwise-success';
  try {
    await clearApiLogs();
    const response = await apiClient.get(successGetUrl);
    assert.strictEqual(response.status, 200, 'Test Case 1: Status should be 200');
    assert.strictEqual(response.data.success, true, 'Test Case 1: Response data.success should be true');
    console.log('Test Case 1: GET request successful.');

    await delay(200); // Allow time for logs to be written

    const requestSentLogs = await getLogs('ApiClientRequestSent', successGetUrl, 1);
    assert.strictEqual(requestSentLogs.length, 1, 'Test Case 1: Should find 1 ApiClientRequestSent log');
    assert.strictEqual(requestSentLogs[0].data.method.toUpperCase(), 'GET', 'Test Case 1: Logged method should be GET');
    assert.ok(requestSentLogs[0].data.url.includes(successGetUrl), `Test Case 1: Logged URL should contain ${successGetUrl}`);

    const responseReceivedLogs = await getLogs('ApiClientResponseReceived', successGetUrl, 1);
    assert.strictEqual(responseReceivedLogs.length, 1, 'Test Case 1: Should find 1 ApiClientResponseReceived log');
    assert.strictEqual(responseReceivedLogs[0].data.status, 200, 'Test Case 1: Logged response status should be 200');
    assert.strictEqual(responseReceivedLogs[0].data.request.method.toUpperCase(), 'GET', 'Test Case 1: Logged request method in response log should be GET');
    assert.ok(responseReceivedLogs[0].data.request.url.includes(successGetUrl), `Test Case 1: Logged request URL in response log should contain ${successGetUrl}`);
    
    console.log('Test Case 1: Log verification successful.');

  } catch (error) {
    console.error('Test Case 1 Failed:', error);
    assert.fail(`Test Case 1 threw an error: ${error.message}`);
  }

  // --- Test Case 2: Successful POST Request ---
  console.log('\n--- Test Case 2: Successful POST Request ---');
  // This URL needs to be absolute because it's for a different "service"
  // and shouldn't use the apiClient's baseURL.
  const successPostUrl = 'http://localhost:3001/mock/test/webhook-receive';
  const postPayload = { message: 'Hello from test case 2', value: 123 };
  try {
    await clearApiLogs();
    // For this specific test case, we call with an absolute URL
    // to bypass the default apiClient.defaults.baseURL
    const response = await apiClient.post(successPostUrl, postPayload);
    assert.strictEqual(response.status, 200, 'Test Case 2: Status should be 200');
    assert.strictEqual(response.data.success, true, 'Test Case 2: Response data.success should be true');
    assert.deepStrictEqual(response.data.dataReceived, postPayload, 'Test Case 2: Response data.dataReceived should match payload');
    console.log('Test Case 2: POST request successful.');

    await delay(200);

    const requestSentLogsPost = await getLogs('ApiClientRequestSent', '/mock/test/webhook-receive', 1); // Query by path part
    assert.strictEqual(requestSentLogsPost.length, 1, 'Test Case 2: Should find 1 ApiClientRequestSent log');
    assert.strictEqual(requestSentLogsPost[0].data.method.toUpperCase(), 'POST', 'Test Case 2: Logged method should be POST');
    assert.ok(requestSentLogsPost[0].data.url.includes(successPostUrl), `Test Case 2: Logged URL should be absolute and contain ${successPostUrl}`);
    assert.deepStrictEqual(requestSentLogsPost[0].data.data, postPayload, 'Test Case 2: Logged request data should match payload');

    const responseReceivedLogsPost = await getLogs('ApiClientResponseReceived', '/mock/test/webhook-receive', 1); // Query by path part
    assert.strictEqual(responseReceivedLogsPost.length, 1, 'Test Case 2: Should find 1 ApiClientResponseReceived log');
    assert.strictEqual(responseReceivedLogsPost[0].data.status, 200, 'Test Case 2: Logged response status should be 200');
    assert.deepStrictEqual(responseReceivedLogsPost[0].data.data.dataReceived, postPayload, 'Test Case 2: Logged response data.dataReceived should match payload');
    
    console.log('Test Case 2: Log verification successful.');

  } catch (error) {
    console.error('Test Case 2 Failed:', error);
    assert.fail(`Test Case 2 threw an error: ${error.message}`);
  }

  // --- Test Case 3: GET Request - Retries then Succeeds ---
  console.log('\n--- Test Case 3: GET Request - Retries then Succeeds ---');
  const retrySuccessUrl = '/mock/test/retry-then-success';
  try {
    await clearApiLogs();
    // Ensure mock server counter is reset (it should reset itself after success, but good to be aware)
    // For a more robust test, we might need a way to explicitly reset mock server state via an endpoint.
    
    const response = await apiClient.get(retrySuccessUrl);
    assert.strictEqual(response.status, 200, 'Test Case 3: Status should be 200');
    assert.strictEqual(response.data.success, true, 'Test Case 3: Response data.success should be true');
    assert.strictEqual(response.data.attempt, 3, 'Test Case 3: Should succeed on 3rd attempt'); // Mock server is set for 2 failures
    console.log('Test Case 3: GET request (retry-then-success) successful.');

    await delay(200);

    const retryLogs = await getLogs('ApiClientRetry', retrySuccessUrl, 5); // Get enough to see retries
    assert.strictEqual(retryLogs.length, 2, 'Test Case 3: Should find 2 ApiClientRetry logs');
    assert.strictEqual(retryLogs[1].data.attempt, 1, 'Test Case 3: First retry attempt should be 1');
    assert.strictEqual(retryLogs[1].data.responseStatus, 500, 'Test Case 3: First retry should be due to 500');
    assert.strictEqual(retryLogs[0].data.attempt, 2, 'Test Case 3: Second retry attempt should be 2');
    assert.strictEqual(retryLogs[0].data.responseStatus, 500, 'Test Case 3: Second retry should be due to 500');

    const finalResponseLog = await getLogs('ApiClientResponseReceived', retrySuccessUrl, 1);
    assert.strictEqual(finalResponseLog.length, 1, 'Test Case 3: Should find 1 final ApiClientResponseReceived log');
    assert.strictEqual(finalResponseLog[0].data.status, 200, 'Test Case 3: Final logged response status should be 200');

    console.log('Test Case 3: Log verification successful.');
  } catch (error) {
    console.error('Test Case 3 Failed:', error);
    assert.fail(`Test Case 3 threw an error: ${error.message}`);
  }

  // --- Test Case 4: GET Request - Retries then Fails ---
  console.log('\n--- Test Case 4: GET Request - Retries then Fails ---');
  const alwaysFailUrl = '/mock/test/always-fail';
  const maxRetries = getConfigValue('api.retry.maxAttempts', '3'); // Get from config for accuracy
  try {
    await clearApiLogs();
    await apiClient.get(alwaysFailUrl);
    assert.fail('Test Case 4: Expected request to fail but it succeeded.');
  } catch (error) {
    assert.ok(error.isAxiosError, 'Test Case 4: Error should be an Axios error');
    assert.strictEqual(error.response.status, 503, 'Test Case 4: Final error response status should be 503');
    console.log('Test Case 4: GET request (always-fail) correctly failed.');

    await delay(200);
    
    // Fetch retry logs in ASCENDING order to simplify assertion
    const retryFailedLogsQuery = `
      SELECT * FROM logs
      WHERE event = 'ApiClientRetry' AND data LIKE ?
      ORDER BY timestamp ASC
      LIMIT ?
    `;
    const retryFailedLogs = db.prepare(retryFailedLogsQuery).all(`%${alwaysFailUrl}%`, 5).map(log => ({ ...log, data: JSON.parse(log.data || '{}') }));

    // Number of retries is maxRetries (e.g., if maxRetries is 3, there are 3 retry attempts)
    assert.strictEqual(retryFailedLogs.length, parseInt(maxRetries, 10), `Test Case 4: Should find ${maxRetries} ApiClientRetry logs`);
    retryFailedLogs.forEach((log, index) => {
        assert.strictEqual(log.data.attempt, index + 1, `Test Case 4: Retry log attempt ${index + 1} should be correct`);
        assert.strictEqual(log.data.responseStatus, 503, `Test Case 4: Retry log ${index + 1} response status should be 503`);
    });

    const requestFailedLog = await getLogs('ApiClientRequestFailed', alwaysFailUrl, 1);
    assert.strictEqual(requestFailedLog.length, 1, 'Test Case 4: Should find 1 ApiClientRequestFailed log');
    assert.strictEqual(requestFailedLog[0].data.responseStatus, 503, 'Test Case 4: Logged failure status should be 503');
    assert.ok(requestFailedLog[0].data.url.includes(alwaysFailUrl), `Test Case 4: Logged failure URL should contain ${alwaysFailUrl}`);
    
    console.log('Test Case 4: Log verification successful.');
  }

  // --- Test Case 5: POST Request - Client Error (4xx) ---
  console.log('\n--- Test Case 5: POST Request - Client Error (4xx) ---');
  const clientErrorUrl = '/mock/test/client-error';
  const clientErrorPayload = { data: 'some data' }; // This payload is fine, mock server will simulate error
  const clientErrorPayloadMissing = {}; // This payload will cause a 400 from mock server due to missing 'data'
  try {
    await clearApiLogs();
    await apiClient.post(clientErrorUrl, clientErrorPayloadMissing); // Intentionally send bad payload
    assert.fail('Test Case 5: Expected request to fail with 400 but it succeeded or failed differently.');
  } catch (error) {
    assert.ok(error.isAxiosError, 'Test Case 5: Error should be an Axios error');
    assert.strictEqual(error.response.status, 400, 'Test Case 5: Error response status should be 400');
    assert.ok(error.response.data.message.includes('Missing "data"'), 'Test Case 5: Error message should indicate missing data');
    console.log('Test Case 5: POST request correctly failed with 400.');

    await delay(200);

    const requestSentClientError = await getLogs('ApiClientRequestSent', clientErrorUrl, 1);
    assert.strictEqual(requestSentClientError.length, 1, 'Test Case 5: Should find 1 ApiClientRequestSent log for client error');
    assert.deepStrictEqual(requestSentClientError[0].data.data, clientErrorPayloadMissing, 'Test Case 5: Logged request data for client error should match');

    const requestFailedClientErrorLog = await getLogs('ApiClientRequestFailed', clientErrorUrl, 1);
    assert.strictEqual(requestFailedClientErrorLog.length, 1, 'Test Case 5: Should find 1 ApiClientRequestFailed log for client error');
    assert.strictEqual(requestFailedClientErrorLog[0].data.responseStatus, 400, 'Test Case 5: Logged failure status for client error should be 400');
    assert.ok(requestFailedClientErrorLog[0].data.responseData.message.includes('Missing "data"'), 'Test Case 5: Logged failure data should indicate missing data');

    // Verify no retry logs for 4xx errors
    const retryLogsClientError = await getLogs('ApiClientRetry', clientErrorUrl, 1);
    assert.strictEqual(retryLogsClientError.length, 0, 'Test Case 5: Should find 0 ApiClientRetry logs for 4xx errors');

    console.log('Test Case 5: Log verification successful.');
  }


  // Restore original log level
  setConfigValue('currentLogLevel', originalLogLevel || LOG_LEVELS.INFO.name);
  console.log(`\nLog level restored to: ${originalLogLevel || LOG_LEVELS.INFO.name}`);
  console.log('\nAPI Communication Evaluations Finished.');
}

runEvaluations().catch(error => {
  console.error('Critical error during evaluations:', error);
  // Ensure log level is restored even on critical failure
  const originalLogLevel = getConfigValue('currentLogLevel'); // Re-fetch in case it was changed
  setConfigValue('currentLogLevel', originalLogLevel || LOG_LEVELS.INFO.name); 
});