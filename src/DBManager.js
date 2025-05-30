// DBManager.js
const sqlite3 = require('better-sqlite3');
const path = require('path');

// Define the path to the SQLite database file
const dbPath = path.join(__dirname, '..', 'Database', 'database.sqlite');

// Create a new database connection
const db = sqlite3(dbPath, { verbose: console.log });

// Function to initialize the database schema
function initializeSchema() {
    // Create config table
    db.exec(`CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create logs table
    db.exec(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT,
        data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

// Function to add a log entry
function addLogEntry(event, data = null) {
    try {
        const stmt = db.prepare('INSERT INTO logs (event, data) VALUES (?, ?)');
        const result = stmt.run(event, data ? JSON.stringify(data) : null);
        return result.lastInsertRowid;
    } catch (error) {
        console.error('Failed to add log entry:', error);
        // In a real service, consider a fallback logging mechanism if DB fails
        return null;
    }
}

// Function to get a configuration value
function getConfigValue(key, defaultValue = null) {
    try {
        const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
        const row = stmt.get(key);
        return row ? row.value : defaultValue;
    } catch (error) {
        console.error(`Failed to get config value for key "${key}":`, error);
        return defaultValue;
    }
}

// Function to set a configuration value
function setConfigValue(key, value) {
    try {
        const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
        stmt.run(key, value);
        console.log(`Config value set for key "${key}"`);
        return true;
    } catch (error) {
        console.error(`Failed to set config value for key "${key}":`, error);
        return false;
    }
}

// Export the db instance and functions for use in other modules
module.exports = {
    db, // Exporting the db instance itself
    initializeSchema,
    addLogEntry,
    getConfigValue,
    setConfigValue,
};

// Initialize the schema when this module is loaded
initializeSchema();