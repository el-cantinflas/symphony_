// DBManager.js
const sqlite3 = require('better-sqlite3');
const path = require('path');

// Define the path to the SQLite database file
const dbPath = path.join(__dirname, '..', 'Database', 'database.sqlite');

// Create a new database connection
const db = sqlite3(dbPath, { verbose: console.log });

// Define Log Levels
const LOG_LEVELS = {
    DEBUG: { name: 'DEBUG', severity: 0 },
    INFO: { name: 'INFO', severity: 1 },
    WARNING: { name: 'WARNING', severity: 2 },
    ERROR: { name: 'ERROR', severity: 3 },
    CRITICAL: { name: 'CRITICAL', severity: 4 },
};

// Function to initialize the database schema
function initializeSchema() {
    // Create config table
    db.exec(`CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create logs table
    // Attempt to add the 'level' column if it doesn't exist, to handle existing databases
    try {
        db.exec('ALTER TABLE logs ADD COLUMN level TEXT');
        console.log("Added 'level' column to 'logs' table.");
    } catch (error) {
        // Ignore error if column already exists (specific error codes depend on SQLite version/driver)
        if (!error.message.includes('duplicate column name') && !error.message.includes('already exists')) {
            console.warn("Could not add 'level' column, it might already exist or another error occurred:", error.message);
        }
    }
    
    db.exec(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT DEFAULT '${LOG_LEVELS.INFO.name}',
        event TEXT,
        data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Add indexes for potentially faster querying
    db.exec('CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs (timestamp)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_logs_level ON logs (level)');

    // Set default log level if not already set
    const currentLogLevel = getConfigValue('currentLogLevel');
    if (currentLogLevel === null) {
        setConfigValue('currentLogLevel', LOG_LEVELS.INFO.name);
    }
}

// Function to add a log entry
function addLogEntry(level, event, data = null) {
    const configuredLogLevelName = getConfigValue('currentLogLevel', LOG_LEVELS.INFO.name);
    const configuredLevel = Object.values(LOG_LEVELS).find(l => l.name === configuredLogLevelName) || LOG_LEVELS.INFO;
    const entryLevel = Object.values(LOG_LEVELS).find(l => l.name === level) || LOG_LEVELS.INFO;

    if (entryLevel.severity < configuredLevel.severity) {
        return null; // Skip logging if entry level is below configured level
    }

    try {
        const stmt = db.prepare('INSERT INTO logs (level, event, data) VALUES (?, ?, ?)');
        const result = stmt.run(level, event, data ? JSON.stringify(data) : null);
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
    LOG_LEVELS, // Exporting LOG_LEVELS for use in other modules
    initializeSchema,
    addLogEntry,
    getConfigValue,
    setConfigValue,
};

// Initialize the schema when this module is loaded
initializeSchema();