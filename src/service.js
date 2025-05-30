// service.js - Windows service implementation for Orderwise Local Sync Validator

/**
 * This module handles the Windows service functionality for the application.
 * It manages service registration, lifecycle events, and core functionality
 * such as heartbeat logging and API communication.
 */

const path = require('path');
// Import addLogEntry, db, getConfigValue, and setConfigValue from DBManager
const { addLogEntry, db, getConfigValue, setConfigValue } = require('./DBManager');


// The DBManager module already initializes the schema and exports the db instance.
// No need to initialize sqlite3 or schema here directly.

const DEFAULT_HEARTBEAT_INTERVAL_MS = 60000; // Default to 1 minute
const HEARTBEAT_CONFIG_KEY = 'heartbeatIntervalMs';

/**
 * Heartbeat function that runs periodically to indicate service is alive
 * and performs basic health checks.
 */
function heartbeat() {
  const timestamp = new Date().toISOString();
  let status = 'alive';
  let healthDetails = {};

  // Basic health check: Ensure DB connection is open
  if (!db || !db.open) {
    status = 'degraded';
    healthDetails.dbConnection = 'closed_or_unavailable';
    addLogEntry('health_check_fail', {
      timestamp,
      reason: 'Database connection is not open.',
      component: 'DBManager'
    });
    console.error(`Heartbeat: Health check failed at ${timestamp} - DB connection closed.`);
  } else {
    healthDetails.dbConnection = 'open';
  }

  addLogEntry('heartbeat', { timestamp, status, healthDetails });
  console.log(`Heartbeat logged at ${timestamp}, status: ${status}`);
}

/**
 * Initialize the service
 */
function initService() {
  // This function is called when the Node.js script starts,
  // acting as the main entry point for the service logic when
  // managed by node-windows.
  console.log('Attempting to initialize Orderwise Local Sync Service...');
  try {
    // DBManager.js handles DB initialization.
    // addLogEntry will use the db instance from DBManager.
    addLogEntry('service_init_started', {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown'
    });
  } catch (error) {
    console.error('Critical error during initial service logging, DB might be inaccessible:', error);
    // Consider alternative logging here if primary DB logging fails (e.g., Windows Event Log via node-windows)
    // For now, console.error will be the fallback.
  }

  addLogEntry('service_start', {
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown'
  });
  
  console.log('Orderwise Local Sync Service started');

  // Get heartbeat interval from config, or use default
  let currentHeartbeatIntervalMs = parseInt(getConfigValue(HEARTBEAT_CONFIG_KEY), 10);
  if (isNaN(currentHeartbeatIntervalMs) || currentHeartbeatIntervalMs <= 0) {
    console.log(`Heartbeat interval not found or invalid in config, using default: ${DEFAULT_HEARTBEAT_INTERVAL_MS}ms`);
    currentHeartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS;
    // Optionally, save the default to config if it wasn't there
    // setConfigValue(HEARTBEAT_CONFIG_KEY, currentHeartbeatIntervalMs.toString());
  } else {
    console.log(`Using heartbeat interval from config: ${currentHeartbeatIntervalMs}ms`);
  }
  
  // Set up heartbeat interval
  const heartbeatIntervalId = setInterval(heartbeat, currentHeartbeatIntervalMs); // Store interval ID
  
  // Initial heartbeat
  heartbeat();

  return heartbeatIntervalId; // Return interval ID for potential cleanup
}

/**
 * Handle service stop event
 */
function stopService(heartbeatInterval) { // Accept interval ID
  // This function is called on SIGTERM/SIGINT, which node-windows
  // sends to stop the service. This is the main cleanup point.
  console.log('Attempting to stop Orderwise Local Sync Service...');
  addLogEntry('service_stop', { timestamp: new Date().toISOString() });
  console.log('Orderwise Local Sync Service stopped');

  // Clear the heartbeat interval
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    console.log('Heartbeat interval cleared.');
  }
  
  // Close database connection (using db instance from DBManager)
  if (db && db.open) {
    try {
      db.close();
      console.log('Database connection closed.');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
  
  // Allow process to exit
  process.exit(0);
}

// Start the service and get the interval ID
const currentHeartbeatInterval = initService();

// Register process event handlers, passing the interval ID
process.on('SIGTERM', () => stopService(currentHeartbeatInterval));
process.on('SIGINT', () => stopService(currentHeartbeatInterval));


module.exports = {
  // logEvent is now addLogEntry from DBManager, no need to export it from here
  // if it's only used internally or other modules can import it from DBManager directly.
  // For clarity, if other parts of *this* service module needed it, they'd use addLogEntry.
  // If external modules need to log, they should use DBManager.addLogEntry.
  heartbeat,
  initService,
  stopService
};

// Service Lifecycle Management with node-windows:
//
// - Start:
//   When node-windows starts the service, it executes this script.
//   The `initService()` function, called at the bottom of this script (outside of specific command flags),
//   serves as the entry point for the service's main logic.
//   The `svc.on('start', ...)` event is a notification from node-windows that it has started the script.
//
// - Stop:
//   When node-windows stops the service, it sends a SIGTERM signal (by default) to this script.
//   The `process.on('SIGTERM', stopService)` handler catches this signal and calls `stopService()`,
//   which performs cleanup (like closing the database) and then exits the process.
//   The `svc.on('stop', ...)` event is a notification from node-windows that it has issued the stop.
//
// - Pause/Continue:
//   `node-windows` does not provide direct support for 'pause' and 'continue' lifecycle events
//   that would trigger specific handlers within the Node.js script like `OnPause()` or `OnContinue()`
//   in some native service frameworks. A Node.js service managed by `node-windows` is typically
//   either running or stopped. If pause/continue-like behavior is required (e.g., temporarily
//   halting specific tasks without stopping the entire service), it must be implemented at the
//   application level and triggered via a custom mechanism (e.g., IPC, file watching, API call).
//

// Windows Service integration using node-windows
const Service = require('node-windows').Service;

// Create a new service object
const svc = new Service({
  name: 'OrderwiseLocalSync',
  description: 'Orderwise Local Sync Service - Monitors and syncs data.',
  script: __filename, // Points to this file
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', function() {
  console.log('Service installed.');
  addLogEntry('service_installed', { name: svc.name });
  svc.start();
  console.log('Service started.');
});

svc.on('alreadyinstalled', function() {
  console.log('This service is already installed.');
  addLogEntry('service_already_installed', { name: svc.name });
});

svc.on('invalidinstallation', function() {
  console.log('This service is not installed.');
  addLogEntry('service_invalid_installation', { name: svc.name });
});

svc.on('uninstall', function() {
  console.log('Service uninstalled.');
  addLogEntry('service_uninstalled', { name: svc.name });
  console.log('The service exists: ', svc.exists);
});

svc.on('start', function() {
  console.log(svc.name + ' started!');
  addLogEntry('service_handler_started', { name: svc.name });
  // The initService() is already called at the bottom of the script,
  // so it will run when the service starts the script.
});

svc.on('stop', function() {
  console.log(svc.name + ' stopped!');
  addLogEntry('service_handler_stopped', { name: svc.name });
  // The stopService() is handled by SIGTERM/SIGINT,
  // node-windows should send these signals.
});

svc.on('error', function(err) {
  console.error('Service error:', err);
  addLogEntry('service_error', { name: svc.name, error: err.message, stack: err.stack });
});

// Check if the script is being run as a service or directly
if (process.argv.includes('--install')) {
  svc.install();
} else if (process.argv.includes('--uninstall')) {
  svc.uninstall();
} else if (process.argv.includes('--start')) {
  svc.start();
} else if (process.argv.includes('--stop')) {
  svc.stop();
} else if (process.argv.includes('--restart')) {
  svc.restart();
} else {
  // If not installing/uninstalling, and not managed by node-windows (e.g. direct node execution)
  // run the initService logic.
  // When node-windows runs the script, it won't pass these flags,
  // so initService() at the bottom of the file will execute.
  if (!process.env.NODE_WINDOWS_SERVICE_NAME) {
     // The existing initService() call at the end of the file handles direct execution.
     // console.log('Running script directly, not as a service operation.');
  }
}