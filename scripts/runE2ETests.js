// scripts/runE2ETests.js
const { fork } = require('child_process');
const path = require('path');

const mockApiServerPath = path.resolve(__dirname, '../src/mockApiServer.js');
const evaluateApiCommsPath = path.resolve(__dirname, './evaluateApiComms.js');
const evaluateDBPath = path.resolve(__dirname, './evaluateDB.js');

let mockApiServer;

function startMockApiServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting mock API server...');
    mockApiServer = fork(mockApiServerPath, [], { silent: true });

    mockApiServer.on('message', (msg) => {
      if (msg.status === 'listening') {
        console.log(`Mock API server listening on port ${msg.port}`);
        resolve();
      }
    });

    mockApiServer.on('error', (err) => {
      console.error('Failed to start mock API server:', err);
      reject(err);
    });

    mockApiServer.stderr.on('data', (data) => {
      console.error(`Mock API Server STDERR: ${data}`);
    });
  });
}

function stopMockApiServer() {
  console.log('Stopping mock API server...');
  if (mockApiServer) {
    mockApiServer.kill();
  }
}

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`\nRunning script: ${path.basename(scriptPath)}...`);
    const child = fork(scriptPath, [], { stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`Script ${path.basename(scriptPath)} finished successfully.`);
        resolve();
      } else {
        console.error(`Script ${path.basename(scriptPath)} exited with code ${code}`);
        reject(new Error(`Script exited with code ${code}`));
      }
    });
  });
}

async function runAllTests() {
  try {
    await startMockApiServer();
    await runScript(evaluateApiCommsPath);
    await runScript(evaluateDBPath);
    // Add more test scripts here
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('\nE2E tests failed:', error.message);
    process.exit(1);
  } finally {
    stopMockApiServer();
  }
}

runAllTests();