// service.js - Windows service implementation for Orderwise Local Sync Validator

/**
 * This module handles the Windows service functionality for the application.
 * It manages service registration, lifecycle events, and core functionality
 * such as heartbeat logging and API communication.
 */

const path = require('path');
const sqlite3 = require('better-sqlite3');
const { initializeSchema } = require('./DBManager');

// Initialize database
initializeSchema();

// Path to the SQLite database file
const dbPath = path.join(__dirname, '..', 'Database', 'database.sqlite');
const db = sqlite3(dbPath, { verbose: console.log });

/**
 * Log an event to the database
 * @param {string} event - The event name or type
 * @param {object} data - Data associated with the event
 */
function logEvent(event, data = {}) {
  try {
    const stmt = db.prepare('INSERT INTO logs (event, data) VALUES (?, ?)');
    stmt.run(event, JSON.stringify(data));
    console.log(`Logged event: ${event}`);
  } catch (error) {
    console.error('Error logging event:', error);
  }
}

/**
 * Heartbeat function that runs periodically to indicate service is alive
 */
function heartbeat() {
  const timestamp = new Date().toISOString();
  logEvent('heartbeat', { timestamp, status: 'alive' });
  console.log(`Heartbeat logged at ${timestamp}`);
}

/**
 * Initialize the service
 */
function initService() {
  logEvent('service_start', { 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown'
  });
  
  console.log('Orderwise Local Sync Service started');
  
  // Set up heartbeat interval (every minute)
  setInterval(heartbeat, 60000);
  
  // Initial heartbeat
  heartbeat();
}

/**
 * Handle service stop event
 */
function stopService() {
  logEvent('service_stop', { timestamp: new Date().toISOString() });
  console.log('Orderwise Local Sync Service stopped');
  
  // Close database connection
  db.close();
  
  // Allow process to exit
  process.exit(0);
}

// Register process event handlers
process.on('SIGTERM', stopService);
process.on('SIGINT', stopService);

// Start the service
initService();

module.exports = {
  logEvent,
  heartbeat,
  initService,
  stopService
};

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
  logEvent('service_installed', { name: svc.name });
  svc.start();
  console.log('Service started.');
});

svc.on('alreadyinstalled', function() {
  console.log('This service is already installed.');
  logEvent('service_already_installed', { name: svc.name });
});

svc.on('invalidinstallation', function() {
  console.log('This service is not installed.');
  logEvent('service_invalid_installation', { name: svc.name });
});

svc.on('uninstall', function() {
  console.log('Service uninstalled.');
  logEvent('service_uninstalled', { name: svc.name });
  console.log('The service exists: ', svc.exists);
});

svc.on('start', function() {
  console.log(svc.name + ' started!');
  logEvent('service_handler_started', { name: svc.name });
  // The initService() is already called at the bottom of the script,
  // so it will run when the service starts the script.
});

svc.on('stop', function() {
  console.log(svc.name + ' stopped!');
  logEvent('service_handler_stopped', { name: svc.name });
  // The stopService() is handled by SIGTERM/SIGINT,
  // node-windows should send these signals.
});

svc.on('error', function(err) {
  console.error('Service error:', err);
  logEvent('service_error', { name: svc.name, error: err.message });
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