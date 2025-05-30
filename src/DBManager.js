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

// Export the db instance and functions for use in other modules
module.exports = {
    db, // Exporting the db instance itself
    initializeSchema,
    addLogEntry,
};

// Initialize the schema when this module is loaded
initializeSchema();