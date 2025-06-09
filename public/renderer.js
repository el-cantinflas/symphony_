// renderer.js - Frontend JavaScript for the Electron UI

/**
 * This file handles all the UI interactions for the Electron application.
 * It communicates with the main process via the exposed API.
 */

// DOM Elements
const apiUrlInput = document.getElementById('api-url');
const webhookUrlInput = document.getElementById('webhook-url');
const bearerTokenInput = document.getElementById('bearer-token');
const testOrderwiseButton = document.getElementById('test-orderwise');
const testPayloadButton = document.getElementById('test-payload');
const syncNowButton = document.getElementById('sync-now');
const saveConfigButton = document.getElementById('save-config');
const logsContainer = document.getElementById('logs');
const logFilterInput = document.getElementById('log-filter');
const logLevelFilter = document.getElementById('log-level-filter');

/**
 * Add a log entry to the UI
 * @param {string} message - The log message
 * @param {string} type - The type of log (info, success, error)
 */
function addLogEntry(message, type = 'info') {
   const entry = document.createElement('div');
   entry.className = `log-entry ${type}`;
   entry.dataset.logType = type;
   
   const timestamp = new Date().toLocaleString();
   entry.innerHTML = `<span class="timestamp">${timestamp}</span> - <span class="${type}">${message}</span>`;
   
   logsContainer.appendChild(entry);
   logsContainer.scrollTop = logsContainer.scrollHeight;

   // Apply filters to the new log entry
   filterLogs();
}

/**
 * Load configuration from the database
 */
async function loadConfig() {
    try {
        const config = await window.api.getConfig();
        if (config) {
            apiUrlInput.value = config.baseUrl || '';
            webhookUrlInput.value = config.externalWebhookUrl || '';
            bearerTokenInput.value = config.bearerToken || '';
            addLogEntry('Configuration loaded', 'success');
        }
    } catch (error) {
        addLogEntry(`Error loading configuration: ${error.message}`, 'error');
    }
}

/**
 * Save configuration to the database
 */
async function saveConfig() {
    try {
        const config = {
            baseUrl: apiUrlInput.value,
            externalWebhookUrl: webhookUrlInput.value,
            bearerToken: bearerTokenInput.value
        };
        
        const updatedConfig = await window.api.saveConfig(config);
        
        // Reload the form with the potentially validated/defaulted values from the backend
        if (updatedConfig) {
            apiUrlInput.value = updatedConfig.baseUrl || '';
            webhookUrlInput.value = updatedConfig.externalWebhookUrl || '';
            bearerTokenInput.value = updatedConfig.bearerToken || '';
            addLogEntry('Configuration saved and reloaded successfully', 'success');
        } else {
            addLogEntry('Configuration saved, but failed to retrieve updated values.', 'warning');
        }
    } catch (error) {
        addLogEntry(`Error saving configuration: ${error.message}`, 'error');
    }
}

/**
 * Test connection to Orderwise API
 */
async function testOrderwise() {
    try {
        addLogEntry('Testing Orderwise API connection...', 'info');
        const result = await window.api.testOrderwise();
        addLogEntry(`Orderwise API test: ${result.success ? 'Success' : 'Failed'}`, result.success ? 'success' : 'error');
        if (result.message) {
            addLogEntry(result.message, result.success ? 'info' : 'error');
        }
    } catch (error) {
        addLogEntry(`Orderwise API test error: ${error.message}`, 'error');
    }
}

/**
 * Send test payload to external webhook
 */
async function sendTestPayload() {
    try {
        addLogEntry('Sending test payload to webhook...', 'info');
        const result = await window.api.sendTestPayload();
        addLogEntry(`Webhook test: ${result.success ? 'Success' : 'Failed'}`, result.success ? 'success' : 'error');
        if (result.message) {
            addLogEntry(result.message, result.success ? 'info' : 'error');
        }
    } catch (error) {
        addLogEntry(`Webhook test error: ${error.message}`, 'error');
    }
}

/**
 * Trigger a sync operation
 */
async function syncNow() {
    try {
        addLogEntry('Starting sync operation...', 'info');
        const result = await window.api.syncNow();
        addLogEntry(`Sync operation: ${result.success ? 'Success' : 'Failed'}`, result.success ? 'success' : 'error');
        if (result.message) {
            addLogEntry(result.message, result.success ? 'info' : 'error');
        }
    } catch (error) {
        addLogEntry(`Sync operation error: ${error.message}`, 'error');
    }
}

/**
 * Load recent logs from the database
 */
async function loadLogs() {
    try {
        const logs = await window.api.getLogs(10); // Get the 10 most recent logs
        
        // Clear existing logs
        logsContainer.innerHTML = '';
        
        // Add logs to the UI
        logs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            
            const timestamp = new Date(log.timestamp).toLocaleString();
            const data = JSON.parse(log.data || '{}');
            const message = data.message || log.event;
            const type = data.status === 'error' ? 'error' : 
                         data.status === 'success' ? 'success' : 'info';
            
            entry.innerHTML = `<span class="timestamp">${timestamp}</span> - <span class="${type}">${message}</span>`;
            
            logsContainer.appendChild(entry);
        });
        
        logsContainer.scrollTop = logsContainer.scrollHeight;
        filterLogs(); // Apply filters after loading logs
    } catch (error) {
        addLogEntry(`Error loading logs: ${error.message}`, 'error');
    }
}

/**
 * Filter logs based on text and level
 */
function filterLogs() {
   const filterText = logFilterInput.value.toLowerCase();
   const filterLevel = logLevelFilter.value;

   const logEntries = logsContainer.getElementsByClassName('log-entry');

   for (const entry of logEntries) {
       const logMessage = entry.textContent.toLowerCase();
       const logLevel = entry.dataset.logType;

       const textMatch = logMessage.includes(filterText);
       const levelMatch = filterLevel === 'all' || logLevel === filterLevel;

       if (textMatch && levelMatch) {
           entry.style.display = '';
       } else {
           entry.style.display = 'none';
       }
   }
}

// Event Listeners
/**
 * Initialize the application
 */
function initializeApp() {
    if (window.api) {
        // Load initial data
        loadConfig();
        loadLogs();
        
        // Register event listeners
        saveConfigButton.addEventListener('click', saveConfig);
        testOrderwiseButton.addEventListener('click', testOrderwise);
        testPayloadButton.addEventListener('click', sendTestPayload);
        syncNowButton.addEventListener('click', syncNow);
        logFilterInput.addEventListener('input', filterLogs);
        logLevelFilter.addEventListener('change', filterLogs);
        
        // Listen for log updates from the main process
        window.api.onLogUpdate((log) => {
            const data = JSON.parse(log.data || '{}');
            const message = data.message || log.event;
            const type = data.status === 'error' ? 'error' :
                         data.status === 'success' ? 'success' : 'info';
            
            addLogEntry(message, type);
        });
        
        addLogEntry('Application initialized', 'success');
    } else {
        console.warn('API not ready, retrying...');
        setTimeout(initializeApp, 100);
    }
}

// Start the initialization process
initializeApp();