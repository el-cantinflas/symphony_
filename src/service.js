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