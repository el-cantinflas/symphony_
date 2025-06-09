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
const { getConfigValue, setConfigValue, getRecentLogs, addLogEntry, LOG_LEVELS } = require('./DBManager');
const ApiClient = require('./ApiClient');
const { initializeSchema, getRecentLogs: getRecentLogsFromDB } = require('./DBManager');

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
  const apiUrl = await getConfigValue('api.orderwise.baseUrl');
  const webhookUrl = await getConfigValue('api.webhook.url');
  const bearerToken = await getConfigValue('api.orderwise.bearerToken');
  return { apiUrl, webhookUrl, bearerToken };
});

ipcMain.handle('save-config', async (event, config) => {
  await setConfigValue('api.orderwise.baseUrl', config.apiUrl);
  await setConfigValue('api.webhook.url', config.webhookUrl);
  await setConfigValue('api.orderwise.bearerToken', config.bearerToken);
});

ipcMain.handle('get-logs', async (event, limit) => {
  return getRecentLogsFromDB(limit);
});

ipcMain.handle('test-orderwise', async () => {
  try {
    const apiClient = new ApiClient();
    await apiClient.checkConnection();
    return { success: true, message: 'Connection successful.' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('send-test-payload', async () => {
  // This is a placeholder. In a real scenario, you would send a test payload
  // to the configured webhook URL.
  const webhookUrl = await getConfigValue('api.webhook.url');
  if (!webhookUrl) {
    return { success: false, message: 'Webhook URL not configured.' };
  }
  
  try {
    const apiClient = new ApiClient(webhookUrl);
    const response = await apiClient.post('/test', { message: 'This is a test payload.' });
    return { success: true, message: `Test payload sent successfully. Status: ${response.status}` };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('sync-now', async () => {
  // This is a placeholder for the actual sync logic.
  addLogEntry('Manual sync triggered', 'Sync process started.', LOG_LEVELS.INFO);
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