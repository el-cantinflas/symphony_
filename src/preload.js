// preload.js - Bridge between Electron's renderer process and main process

/**
 * This file is loaded before the renderer process starts in Electron.
 * It provides a secure way to expose Node.js functionality to the renderer process.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Database operations
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    getConfig: () => ipcRenderer.invoke('get-config'),
    getLogs: (limit) => ipcRenderer.invoke('get-logs', limit),
    
    // API operations
    testOrderwise: () => ipcRenderer.invoke('test-orderwise'),
    sendTestPayload: () => ipcRenderer.invoke('send-test-payload'),
    syncNow: () => ipcRenderer.invoke('sync-now'),
    
    // Event listeners
    onLogUpdate: (callback) => {
      ipcRenderer.on('log-update', (event, ...args) => callback(...args));
      return () => {
        ipcRenderer.removeAllListeners('log-update');
      };
    }
  }
);

// Log that preload script has loaded
console.log('Preload script loaded');