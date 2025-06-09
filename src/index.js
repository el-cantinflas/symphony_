// index.js - Main entry point for the Orderwise Local Sync Validator application

/**
 * Orderwise Local Sync Validator
 * 
 * This application serves as a bridge between Orderwise ERP and external systems.
 * It consists of:
 * 1. A Node.js Windows Service for background processing
 * 2. An Electron UI for configuration and monitoring
 * 3. SQLite database for configuration storage and logging
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { ipcMain } = require('electron');
const {
  getApiConfig,
  setConfigValue,
  getRecentLogs,
  addLogEntry,
  LOG_LEVELS,
  initializeSchema
} = require('./DBManager');
const ApiClient = require('./ApiClient');

// Global reference to the window object to prevent garbage collection
let mainWindow;

/**
 * Creates the main application window
 */
function createWindow() {
  // Initialize database schema
  initializeSchema();
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));

  // Open DevTools in development mode
  // mainWindow.webContents.openDevTools();

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, recreate the window when the dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('get-config', async () => {
  // Use the centralized getApiConfig to ensure validation and defaults are applied
  return getApiConfig();
});

ipcMain.handle('save-config', async (event, config) => {
  // Iterate over the provided config object and save each value
  // This is more robust than hardcoding keys.
  const promises = [];
  if (config.baseUrl) {
    promises.push(setConfigValue('api.orderwise.baseUrl', config.baseUrl));
  }
  if (config.externalWebhookUrl) {
    promises.push(setConfigValue('api.externalwebhook.url', config.externalWebhookUrl));
  }
  if (config.bearerToken) {
    promises.push(setConfigValue('api.orderwise.bearerToken', config.bearerToken));
  }
  
  await Promise.all(promises);
  
  // Return the updated config to the renderer for confirmation
  return getApiConfig();
});

ipcMain.handle('get-logs', async (event, limit) => {
  return getRecentLogs(limit);
});

ipcMain.handle('test-orderwise', async () => {
  try {
    // Use the centrally managed ApiClient which is configured via getApiConfig
    const apiClient = new ApiClient();
    await apiClient.checkConnection();
    addLogEntry(LOG_LEVELS.INFO.name, 'API_TEST_SUCCESS', { message: 'Connection successful.' });
    return { success: true, message: 'Connection successful.' };
  } catch (error) {
    addLogEntry(LOG_LEVELS.ERROR.name, 'API_TEST_FAILED', { error: error.message });
    return { success: false, message: error.message };
  }
});

ipcMain.handle('send-test-payload', async () => {
  const { externalWebhookUrl } = getApiConfig();
  if (!externalWebhookUrl || externalWebhookUrl.includes('localhost')) {
    const message = 'Webhook URL is not configured or is a local URL.';
    addLogEntry(LOG_LEVELS.WARNING.name, 'WEBHOOK_TEST_SKIPPED', { reason: message });
    return { success: false, message };
  }
  
  try {
    // Use a temporary ApiClient for the external webhook
    const webhookApiClient = new ApiClient(externalWebhookUrl);
    const response = await webhookApiClient.post('', { message: 'This is a test payload from Orderwise Local Sync Validator.' });
    addLogEntry(LOG_LEVELS.INFO.name, 'WEBHOOK_TEST_SUCCESS', { status: response.status });
    return { success: true, message: `Test payload sent successfully. Status: ${response.status}` };
  } catch (error) {
    addLogEntry(LOG_LEVELS.ERROR.name, 'WEBHOOK_TEST_FAILED', { error: error.message });
    return { success: false, message: error.message };
  }
});

ipcMain.handle('sync-now', async () => {
  // This is a placeholder for the actual sync logic.
  addLogEntry(LOG_LEVELS.INFO.name, 'MANUAL_SYNC_TRIGGERED', { message: 'Sync process started.' });
  return { success: true, message: 'Sync process started.' };
});

// Function to send log updates to the renderer process
function sendLogUpdate(log) {
  if (mainWindow) {
    mainWindow.webContents.send('log-update', log);
  }
}

// Subscribe to log updates from DBManager
// This requires DBManager to be an EventEmitter, which it is not yet.
// For now, we will just add a log entry when the app starts.
addLogEntry('Application Startup', 'Electron app has started.', LOG_LEVELS.INFO);
/**
 * TODO: Implement Windows Service functionality
 * - Service registration and lifecycle management
 * - Heartbeat logging
 * - API communication with retry logic
 * - Data processing and forwarding
 */