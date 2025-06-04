// scripts/testApiLogging.js
const apiClient = require('../src/ApiClient');
const { setConfigValue, LOG_LEVELS, db } = require('../src/DBManager');

async function testApiLogging() {
  console.log('Setting log level to DEBUG...');
  setConfigValue('currentLogLevel', LOG_LEVELS.DEBUG.name);
  console.log(`Log level set to: ${LOG_LEVELS.DEBUG.name}`);

  const testUrl = '/mock/orderwise/v1/items'; // Ensure this endpoint exists in your mockApiServer.js
  const testPayload = { testParam: 'hello' };

  console.log(`\nMaking a GET request to: http://localhost:3001${testUrl} with params ${JSON.stringify(testPayload)}`);

  try {
    // Make a GET request (axios uses 'params' for GET request query parameters)
    await apiClient.get(testUrl, { params: testPayload });
    console.log('\nTest GET request completed.');
  } catch (error) {
    console.error('\nTest GET request failed:', error.message);
    // Even if it fails, logs should have been generated for the attempt
  }

  console.log('\nFetching log entries for API communication...');
  try {
    const logs = db.prepare(`
      SELECT * FROM logs 
      WHERE event = 'ApiClientRequestSent' OR event = 'ApiClientResponseReceived' OR event = 'ApiClientRequestFailed'
      ORDER BY timestamp DESC 
      LIMIT 5 
    `).all(); // Fetch a few recent relevant logs

    if (logs.length > 0) {
      console.log('\nRecent API Communication Logs:');
      logs.forEach(log => {
        console.log('------------------------------------');
        console.log(`ID: ${log.id}`);
        console.log(`Timestamp: ${log.timestamp}`);
        console.log(`Level: ${log.level}`);
        console.log(`Event: ${log.event}`);
        // Parse and pretty-print JSON data if it exists
        try {
            const jsonData = JSON.parse(log.data);
            console.log('Data:', JSON.stringify(jsonData, null, 2));
        } catch (e) {
            console.log('Data:', log.data); // Print as is if not valid JSON
        }
      });
      console.log('------------------------------------');
    } else {
      console.log('No relevant API communication logs found. Ensure mock server is running and API calls are made.');
    }
  } catch (dbError) {
    console.error('Failed to fetch logs from database:', dbError);
  }
}

testApiLogging().catch(console.error);