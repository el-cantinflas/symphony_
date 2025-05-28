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

// Export the initializeSchema function for use in other modules
module.exports = {
    initializeSchema,
};

// Initialize the schema when this module is loaded
initializeSchema();