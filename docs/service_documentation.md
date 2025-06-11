# Orderwise Local Sync Service Documentation

This document provides comprehensive information for installing, configuring, managing, and troubleshooting the Orderwise Local Sync Service.

## Table of Contents
1. [Introduction](#introduction)
2. [Installation Procedures](#installation-procedures)
    - [Prerequisites](#prerequisites)
    - [Using SC.exe](#using-svexe)
    - [Using Installer Package (if applicable)](#using-installer-package-if-applicable)
3. [Configuration Guide](#configuration-guide)
    - [Configuration File/Table Overview](#configuration-filetable-overview)
    - [Available Configuration Options](#available-configuration-options)
        - [`heartbeatIntervalMs`](#heartbeatintervalms)
        - [`currentLogLevel`](#currentloglevel)
        - [Other API/Webhook URLs (To be detailed in Task 3)](#other-apiwebhook-urls-to-be-detailed-in-task-3)
    - [Configuration Examples](#configuration-examples)
4. [Administration Guide](#administration-guide)
    - [Starting the Service](#starting-the-service)
    - [Stopping the Service](#stopping-the-service)
    - [Restarting the Service](#restarting-the-service)
    - [Monitoring Service Status](#monitoring-service-status)
    - [Log Management](#log-management)
        - [Log Levels](#log-levels)
        - [Accessing Logs](#accessing-logs)
5. [Troubleshooting Guide](#troubleshooting-guide)
    - [Common Issues](#common-issues)
        - [Service Fails to Start](#service-fails-to-start)
        - [Database Connection Errors](#database-connection-errors)
        - [Incorrect Logging Behavior](#incorrect-logging-behavior)
    - [Gathering Diagnostic Information](#gathering-diagnostic-information)
6. [Security Best Practices](#security-best-practices)
    - [Service Account Permissions](#service-account-permissions)
    - [Database Security](#database-security)
    - [API Key Management (if applicable)](#api-key-management-if-applicable)
7. [Common Usage Scenarios](#common-usage-scenarios)
    - [Initial Setup and Verification](#initial-setup-and-verification)
    - [Changing Log Verbosity](#changing-log-verbosity)
    - [Updating Heartbeat Interval](#updating-heartbeat-interval)

---

## 1. Introduction

The Orderwise Local Sync Service is a Node.js application designed to run as a background Windows service. Its primary functions include [Details to be filled based on overall project goals - e.g., synchronizing data with Orderwise, processing webhooks, etc.]. It utilizes SQLite for local data storage, configuration management, and logging.

---

## 2. Installation Procedures

### Prerequisites
- Node.js (Version specified in `package.json`)
- Windows Operating System (Specify supported versions, e.g., Windows 10, Windows Server 2016 and newer)
- Administrative privileges for service installation.

### Using SC.exe
The `sc.exe` command-line utility can be used to install and manage Windows services.

**To Install the Service:**
1. Open Command Prompt or PowerShell as Administrator.
2. Navigate to the project's root directory.
3. Execute the following command:
   ```bash
   sc create "OrderwiseLocalSync" binPath= "node <path_to_project_root>\\src\\service.js" DisplayName= "Orderwise Local Sync Service" start= auto
   ```
   * Replace `<path_to_project_root>` with the absolute path to the project's root directory (e.g., `C:\\Projects\\OrderwiseLocalSync`).
   * `DisplayName`: The name that will appear in the Windows Services list.
   * `start= auto`: Configures the service to start automatically with Windows. Use `demand` for manual start.

**To Delete the Service:**
1. Open Command Prompt or PowerShell as Administrator.
2. Execute:
   ```bash
   sc delete "OrderwiseLocalSync"
   ```

### Using Installer Package (if applicable)
(This section will be updated if an MSI installer or similar package is created as per Task 5.)

---

## 3. Configuration Guide

The service's behavior is primarily configured via the `config` table in the SQLite database (`Database/database.sqlite`).

### Configuration File/Table Overview
- **Database Location:** `[Project Root]/Database/database.sqlite`
- **Table Name:** `config`
- **Columns:**
    - `key` (TEXT, PRIMARY KEY): The name of the configuration parameter.
    - `value` (TEXT): The value of the configuration parameter.
    - `updated_at` (DATETIME): Timestamp of the last update.

### Available Configuration Options

#### `heartbeatIntervalMs`
- **Description:** The interval, in milliseconds, at which the service performs its heartbeat check and logs a heartbeat event.
- **Default Value:** `60000` (1 minute) - as initially set up or if not present in the config table.
- **Example Value:** `300000` (for a 5-minute interval)
- **Managed in:** [`src/service.js`](src/service.js) (reads from DB), [`src/DBManager.js`](src/DBManager.js) (initial schema/data if any).

#### `currentLogLevel`
- **Description:** Determines the minimum severity level of log messages that will be recorded in the `logs` table.
- **Available Levels (from `LOG_LEVELS` in [`src/DBManager.js`](src/DBManager.js)):**
    - `DEBUG`
    - `INFO`
    - `WARNING`
    - `ERROR`
    - `CRITICAL`
- **Default Value:** `INFO` (if not present in the config table or if the value is invalid).
- **Example Value:** `DEBUG` (to log all messages including debug information)
- **Managed in:** [`src/DBManager.js`](src/DBManager.js) (defines levels, reads from DB), [`src/service.js`](src/service.js) (passes level to `addLogEntry`).

#### Other API/Webhook URLs (To be detailed in Task 3)
(This section will be updated as part of Task 3, which involves API communication.)

### Configuration Examples
To change a configuration value, you can directly modify the SQLite database using a SQLite browser or programmatically.

**Example: Changing `heartbeatIntervalMs` to 2 minutes using a SQLite tool:**
```sql
UPDATE config SET value = '120000' WHERE key = 'heartbeatIntervalMs';
```

**Example: Changing `currentLogLevel` to `WARNING`:**
```sql
UPDATE config SET value = 'WARNING' WHERE key = 'currentLogLevel';
```
*(Ensure the service is restarted after changing configuration values for them to take effect, unless dynamic reloading is implemented.)*

---

## 4. Administration Guide

### Starting the Service
- **Via Windows Services Panel:**
    1. Open "Services" (services.msc).
    2. Locate "Orderwise Local Sync Service".
    3. Right-click and select "Start".
- **Via Command Line (as Administrator):**
    ```bash
    sc start "OrderwiseLocalSync"
    ```
    or
    ```bash
    net start "OrderwiseLocalSync"
    ```

### Stopping the Service
- **Via Windows Services Panel:**
    1. Open "Services".
    2. Locate "Orderwise Local Sync Service".
    3. Right-click and select "Stop".
- **Via Command Line (as Administrator):**
    ```bash
    sc stop "OrderwiseLocalSync"
    ```
    or
    ```bash
    net stop "OrderwiseLocalSync"
    ```
The `node-windows` library handles script termination signals. Ensure all asynchronous operations (like `setInterval` for heartbeat) are properly cleared in the `svc.on('stop', ...)` handler in [`src/service.js`](src/service.js).

### Restarting the Service
- **Via Windows Services Panel:**
    1. Open "Services".
    2. Locate "Orderwise Local Sync Service".
    3. Right-click and select "Restart".
- **Via Command Line (as Administrator):**
    ```bash
    sc stop "OrderwiseLocalSync"
    sc start "OrderwiseLocalSync"
    ```

### Monitoring Service Status
- **Via Windows Services Panel:** Check the "Status" column for "Orderwise Local Sync Service".
- **Via Command Line (as Administrator):**
    ```bash
    sc query "OrderwiseLocalSync"
    ```
This will show the current state (e.g., RUNNING, STOPPED).

### Log Management

#### Log Levels
The service uses the following hierarchical log levels (defined in `LOG_LEVELS` in [`src/DBManager.js`](src/DBManager.js)):
- `CRITICAL`: Critical errors that might lead to service termination.
- `ERROR`: Errors that occurred but the service might still be operational.
- `WARNING`: Potential issues or unusual events.
- `INFO`: General operational information (default level).
- `DEBUG`: Detailed information useful for debugging.

The `currentLogLevel` configuration in the database determines the minimum level of logs recorded. For example, if set to `INFO`, only `INFO`, `WARNING`, `ERROR`, and `CRITICAL` messages will be logged.

#### Accessing Logs
Logs are stored in the `logs` table in the SQLite database (`Database/database.sqlite`).
- **Table Name:** `logs`
- **Columns:**
    - `id` (INTEGER, PRIMARY KEY AUTOINCREMENT)
    - `timestamp` (DATETIME, DEFAULT CURRENT_TIMESTAMP)
    - `level` (TEXT) - Stores the log level (e.g., 'INFO', 'ERROR')
    - `event` (TEXT) - A short description or type of the event.
    - `data` (TEXT) - Detailed information or JSON payload related to the event.

You can query this table using any SQLite browser or tool.
**Example: Viewing the last 10 error or critical messages:**
```sql
SELECT * FROM logs WHERE level IN ('ERROR', 'CRITICAL') ORDER BY timestamp DESC LIMIT 10;
```

---

## 5. Troubleshooting Guide

### Common Issues

#### Service Fails to Start
- **Symptom:** Service status remains "Stopped" or an error appears in the System Event Log.
- **Possible Causes & Solutions:**
    - **Incorrect Node.js path or script path in `binPath`:** Verify the path specified during `sc create`.
    - **Node.js not installed or not in PATH for the service account:** Ensure Node.js is correctly installed.
    - **Errors in `service.js` on startup:** Check the application's own logs (if it gets far enough to write them) or use `node-windows` event logging if configured. The `try...catch` around `DBManager.init()` in [`src/service.js`](src/service.js) attempts to log early errors.
    - **Permissions issues:** The account running the service might not have permissions to access project files or the database directory. See [Service Account Permissions](#service-account-permissions).
    - **Port conflicts (if applicable):** If the service tries to listen on a port already in use.

#### Database Connection Errors
- **Symptom:** Logs indicate failure to connect to or write to `Database/database.sqlite`.
- **Possible Causes & Solutions:**
    - **Database file/directory permissions:** The service account needs read/write access to the `Database` directory and `database.sqlite` file.
    - **Corrupted database file:** Try restoring from a backup or, if no critical data, deleting and letting the service recreate it (if schema creation is robust).
    - **Incorrect database path hardcoded or configured:** Ensure paths are correct, especially if relative paths are used and the service's working directory is unexpected. [`src/DBManager.js`](src/DBManager.js) uses a path relative to its own location.

#### Incorrect Logging Behavior
- **Symptom:** Logs are missing, or too verbose/not verbose enough.
- **Possible Causes & Solutions:**
    - **`currentLogLevel` misconfigured:** Check the value in the `config` table. Ensure it's one of the valid `LOG_LEVELS`.
    - **Issues in `addLogEntry` logic:** Review [`src/DBManager.js`](src/DBManager.js) if logs are not being written as expected despite correct configuration.
    - **Disk full:** Ensure there's enough disk space for the database to grow.

### Gathering Diagnostic Information
- **Windows Event Viewer:** Check `Application` and `System` logs for errors related to "OrderwiseLocalSync" or `node.js`.
- **Service Logs:** Query the `logs` table in `Database/database.sqlite`. Set `currentLogLevel` to `DEBUG` temporarily to get more detailed information.
- **`node-windows` logs:** If `node-windows` itself logs errors (e.g., during install/uninstall events), these might go to the Windows Event Log.

---

## 6. Security Best Practices

### Service Account Permissions
- **Principle of Least Privilege:** The Windows account under which the service runs should have only the necessary permissions.
    - **Read/Execute** access to Node.js installation directory.
    - **Read** access to the project's `src` directory and other script files.
    - **Read/Write/Create/Delete** access to the `Database` directory and the `database.sqlite` file within it.
    - **Network access** if the service needs to communicate externally (e.g., for API calls in Task 3).
- Avoid running the service under highly privileged accounts like `LocalSystem` if not strictly necessary. Consider a dedicated local user or a Group Managed Service Account (gMSA).

### Database Security
- **Physical Security:** Protect the `Database/database.sqlite` file from unauthorized access, as it may contain sensitive log data or configuration.
- **Input Sanitization:** If any external input is ever written to the database (not currently the case for logs/config but for future features), ensure it's properly sanitized to prevent SQL injection, even though `better-sqlite3` uses parameterized queries which inherently protect against most SQLi.

### API Key Management (if applicable)
(This section will be relevant for Task 3 and 4. Store API keys securely, not hardcoded. Consider environment variables, encrypted config, or a secrets management system if available.)

---

## 7. Common Usage Scenarios

### Initial Setup and Verification
1. Install the service using `sc create` as described in [Installation Procedures](#installation-procedures).
2. Start the service.
3. Check Windows Services panel or `sc query` to confirm it's "RUNNING".
4. After a minute (or the configured `heartbeatIntervalMs`), query the `logs` table in `Database/database.sqlite` to verify heartbeat entries are being created.
   ```sql
   SELECT * FROM logs WHERE event = 'Heartbeat' ORDER BY timestamp DESC LIMIT 5;
   ```
5. Verify initial service state logs (e.g., 'Service starting', 'Database initialized').

### Changing Log Verbosity
1. Decide on the desired log level (e.g., `DEBUG` for more details, `WARNING` for less).
2. Update the `config` table:
   ```sql
   UPDATE config SET value = 'DEBUG' WHERE key = 'currentLogLevel';
   ```
3. Restart the "Orderwise Local Sync Service" for the change to take effect.
4. Monitor new entries in the `logs` table to confirm the verbosity has changed.

### Updating Heartbeat Interval
1. Determine the new desired interval in milliseconds (e.g., 5 minutes = `300000` ms).
2. Update the `config` table:
   ```sql
   UPDATE config SET value = '300000' WHERE key = 'heartbeatIntervalMs';
   ```
3. Restart the "Orderwise Local Sync Service".
4. Observe the timestamps of new 'Heartbeat' events in the `logs` table to confirm the interval has changed.