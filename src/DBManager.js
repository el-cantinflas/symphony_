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
    SUCCESS: { name: 'SUCCESS', severity: 1 }, // Added for consistency
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

    // Set default API configuration values if not already set
    const apiConfigDefaults = {
        'api.orderwise.baseUrl': 'http://localhost:3001/api/orderwise',
        'api.orderwise.bearerToken': 'YOUR_ORDERWISE_BEARER_TOKEN',
        'api.externalwebhook.url': 'http://localhost:3002/webhook',
        'api.client.timeoutMs': '10000',
        'api.retry.maxAttempts': '3',
        'api.retry.delayFactorMs': '1000'
    };

    for (const [key, value] of Object.entries(apiConfigDefaults)) {
        if (getConfigValue(key) === null) {
            setConfigValue(key, value);
        }
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

// Function to delete a configuration value
function deleteConfigValue(key) {
    try {
        const stmt = db.prepare('DELETE FROM config WHERE key = ?');
        const result = stmt.run(key);
        if (result.changes > 0) {
            console.log(`Config value deleted for key "${key}"`);
            addLogEntry(LOG_LEVELS.INFO.name, 'CONFIG_DELETE_SUCCESS', { key });
        } else {
            console.log(`No config value found to delete for key "${key}"`);
            addLogEntry(LOG_LEVELS.WARNING.name, 'CONFIG_DELETE_NOT_FOUND', { key });
        }
        return result.changes > 0;
    } catch (error) {
        console.error(`Failed to delete config value for key "${key}":`, error);
        addLogEntry(LOG_LEVELS.ERROR.name, 'CONFIG_DELETE_FAILED', { key, error: error.message });
        return false;
    }
}

// Function to get all relevant API configurations with validation and defaults
function getApiConfig() {
    const defaults = {
        baseUrl: 'http://localhost:3001/api/orderwise',
        bearerToken: 'YOUR_ORDERWISE_BEARER_TOKEN', // Sensitive: consider encryption at rest in future
        externalWebhookUrl: 'http://localhost:3002/webhook',
        clientTimeoutMs: 10000,
        retryMaxAttempts: 3,
        retryDelayFactorMs: 1000,
    };

    const config = {
        baseUrl: getConfigValue('api.orderwise.baseUrl', defaults.baseUrl),
        bearerToken: getConfigValue('api.orderwise.bearerToken', defaults.bearerToken),
        externalWebhookUrl: getConfigValue('api.externalwebhook.url', defaults.externalWebhookUrl),
        clientTimeoutMs: parseInt(getConfigValue('api.client.timeoutMs', defaults.clientTimeoutMs.toString()), 10),
        retryMaxAttempts: parseInt(getConfigValue('api.retry.maxAttempts', defaults.retryMaxAttempts.toString()), 10),
        retryDelayFactorMs: parseInt(getConfigValue('api.retry.delayFactorMs', defaults.retryDelayFactorMs.toString()), 10),
    };

    // Basic Validations
    if (isNaN(config.clientTimeoutMs) || config.clientTimeoutMs <= 0) {
        addLogEntry(LOG_LEVELS.WARNING.name, 'CONFIG_VALIDATION_INVALID', { key: 'api.client.timeoutMs', value: config.clientTimeoutMs, usingDefault: defaults.clientTimeoutMs });
        config.clientTimeoutMs = defaults.clientTimeoutMs;
    }
    if (isNaN(config.retryMaxAttempts) || config.retryMaxAttempts < 0) {
        addLogEntry(LOG_LEVELS.WARNING.name, 'CONFIG_VALIDATION_INVALID', { key: 'api.retry.maxAttempts', value: config.retryMaxAttempts, usingDefault: defaults.retryMaxAttempts });
        config.retryMaxAttempts = defaults.retryMaxAttempts;
    }
    if (isNaN(config.retryDelayFactorMs) || config.retryDelayFactorMs <= 0) {
        addLogEntry(LOG_LEVELS.WARNING.name, 'CONFIG_VALIDATION_INVALID', { key: 'api.retry.delayFactorMs', value: config.retryDelayFactorMs, usingDefault: defaults.retryDelayFactorMs });
        config.retryDelayFactorMs = defaults.retryDelayFactorMs;
    }

    try {
        new URL(config.baseUrl);
    } catch (e) {
        addLogEntry(LOG_LEVELS.WARNING.name, 'CONFIG_VALIDATION_INVALID_URL', { key: 'api.orderwise.baseUrl', value: config.baseUrl, usingDefault: defaults.baseUrl });
        config.baseUrl = defaults.baseUrl;
    }

    try {
        new URL(config.externalWebhookUrl);
    } catch (e) {
        addLogEntry(LOG_LEVELS.WARNING.name, 'CONFIG_VALIDATION_INVALID_URL', { key: 'api.externalwebhook.url', value: config.externalWebhookUrl, usingDefault: defaults.externalWebhookUrl });
        config.externalWebhookUrl = defaults.externalWebhookUrl;
    }
    
    if (!config.bearerToken || config.bearerToken === 'YOUR_ORDERWISE_BEARER_TOKEN') {
         addLogEntry(LOG_LEVELS.WARNING.name, 'CONFIG_VALIDATION_DEFAULT_TOKEN', { key: 'api.orderwise.bearerToken' });
    }

    return config;
}

// Function to get recent log entries
function getRecentLogs(limit = 20) {
    try {
        const stmt = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?');
        return stmt.all(limit);
    } catch (error) {
        console.error('Failed to get recent logs:', error);
        return [];
    }
}

// Function to get logs with flexible filtering
function getLogs({ level, event, searchTerm, limit = 50, offset = 0 } = {}) {
    try {
        let query = 'SELECT * FROM logs';
        const conditions = [];
        const params = [];

        if (level) {
            conditions.push('level = ?');
            params.push(level);
        }
        if (event) {
            conditions.push('event = ?');
            params.push(event);
        }
        if (searchTerm) {
            conditions.push("data LIKE ?");
            params.push(`%${searchTerm}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const stmt = db.prepare(query);
        const logs = stmt.all(...params);
        
        // Safely parse the JSON data field
        return logs.map(log => {
            try {
                return { ...log, data: JSON.parse(log.data) };
            } catch (e) {
                // If data is not valid JSON, return it as is
                return log;
            }
        });

    } catch (error) {
        console.error('Failed to get logs:', error);
        return [];
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
    deleteConfigValue,
    getApiConfig,
    getRecentLogs,
    getLogs,
};

// Initialize the schema when this module is loaded
initializeSchema();