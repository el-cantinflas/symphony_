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
const { initializeSchema } = require('./DBManager');

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
      nodeIntegration: true,
      contextIsolation: false,
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

/**
 * TODO: Implement Windows Service functionality
 * - Service registration and lifecycle management
 * - Heartbeat logging
 * - API communication with retry logic
 * - Data processing and forwarding
 */