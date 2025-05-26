
# Product Requirements Document (PRD)
**Project Name**: Orderwise Local Sync Validator  
**Goal**: Validate a local architecture stack (Node.js Windows Service + Electron + SQLite) that securely interacts with the Orderwise REST API and external services within a corporate network.

---

## Executive Summary
This MVP is designed to test whether a Node.js-based Windows Service can reliably:
- Run on the same Windows network as Orderwise
- Access its local REST API securely
- Process and forward data to external systems
- Be installed/removed easily via MSI without admin permissions

---

## Problem Statement
Corporate ERPs like Orderwise are installed locally without native web integrations. Connecting them reliably and affordably to modern REST-based systems is difficult, particularly without modifying the ERP or relying on expensive SaaS platforms.

---

## Solution Overview
We will use:
- Node.js to run a background Windows Service
- SQLite as a config and logging layer
- Electron UI to configure and monitor the system
- MSI for packaging and clean deployment

---

## User Personas
- **System Integrator**: Sets up the sync bridge, tests API connections, configures endpoints.
- **Admin/IT**: Needs to deploy and uninstall software securely with minimal permissions.

---

## Core Features
- Electron-based UI with input fields and sync triggers
- Background Node.js service that reads/writes to SQLite
- Configurable endpoints and retry logic
- Descriptive logging for all events, actions, errors
- MSI installer with uninstall and firewall rule setup

---

## Suggested Feature Modules

| Module          | Component     | Description |
|-----------------|---------------|-------------|
| Config UI       | Electron      | Input endpoints, token |
| API Test        | Both          | Call Orderwise and external webhook |
| Sync Engine     | Service       | Run at boot or schedule |
| Logs            | SQLite + UI   | Read/display operation history |
| Installer       | MSI           | Single executable with no admin req if possible |

---

## Logical Dependency Chain

### Phase 1: Foundation – Core System Setup
1. Initialize SQLite schema with `config`, `logs` tables
2. Create Node.js service that logs heartbeat

### Phase 2: Communication Layer
3. Add functions to call Orderwise & external APIs
4. Implement persistent config handling

### Phase 3: Frontend UI
5. Electron input screen: API URLs and tokens
6. Log viewer panel for feedback

### Phase 4: Installer and Cleanup
7. MSI creation and packaging
8. Final integration testing

---

## AI/Automation
Not required for MVP. Future possibilities include:
- Auto-mapping fields
- Predictive logging insights
- AI sync schedulers

---

## Data Philosophy
- Data stays local
- SQLite handles all config and logs
- Log every action with JSON structure and timestamp
- Support eventual log export for diagnostics

---

## Platform and Access
- Windows only
- Node.js Windows service
- Electron desktop interface
- SQLite storage

---

## Test-Driven and Log-Driven Development
- Every feature is defined with test cases before implementation
- All actions (e.g., API calls, config changes) are logged in detail
- Logs include timestamps, action types, request/response payloads, and errors

**Sample Tests:**
- [ ] SQLite initializes with correct schema
- [ ] Electron app can save config to DB
- [ ] Service reads config and logs heartbeat
- [ ] External and Orderwise API endpoints respond correctly
- [ ] Logs are displayed in UI with correct status

---

## UI Mockup Prompt

> Design a minimalistic Windows desktop app using Electron for configuring and monitoring a local ERP sync service. The app should include:
> - A configuration screen with three fields: "Orderwise API Base URL", "External Webhook URL", and "Bearer Token"
> - Buttons: "Test Orderwise", "Send Test Payload", and "Sync Now"
> - A log viewer below the buttons that shows recent sync attempts with timestamps and statuses (Success/Failure/Error Message)
> Style: Professional, flat UI, no unnecessary animations. Responsive layout for 800x600 resolution. Use system font and clear spacing.

---

## Success Criteria
- Installs and runs without admin rights
- Electron UI accepts and saves config
- Node.js service calls APIs and logs results
- Logs visible in UI
- Clean uninstall
- Ready for scaling if test is successful

---

## Output Artifacts
- This PRD (.md)
- UI mockup prompt (above)
- Git repo structure (planned separately)
- MSI installer instructions (optional)

