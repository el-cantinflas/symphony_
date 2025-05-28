ee
# Product Requirements Document (PRD)
Project Name: Orderwise Local Sync Validator
Goal: Validate a local architecture stack (Node.js Windows Service + Electron + SQLite) that securely interacts with the Orderwise REST API and external services within a corporate network.

## Executive Summary
This MVP is designed to test whether a Node.js-based Windows Service can reliably:
- Run on the same Windows network as Orderwise
- Access its local REST API securely
- Process and forward data to external systems
- Be installed/removed easily via MSI without admin permissions

## Problem Statement
Corporate ERPs like Orderwise are installed locally without native web integrations. Connecting them reliably and affordably to modern REST-based systems is difficult, particularly without modifying the ERP or relying on expensive SaaS platforms.

## Solution Overview
We will use:
- Node.js to run a background Windows Service
- SQLite as a config and logging layer
- Electron UI to configure and monitor the system
- MSI for packaging and clean deployment

## User Personas
- System Integrator: Sets up the sync bridge, tests API connections, configures endpoints.
- Admin/IT: Needs to deploy and uninstall software securely with minimal permissions.

## Core Features
- Electron-based UI with input fields and sync triggers
- Background Node.js service that reads/writes to SQLite
- Configurable endpoints and retry logic
- Descriptive logging for all events, actions, errors
- MSI installer with uninstall and firewall rule setup

## Suggested Feature Modules

| Module          | Component     | Description |
|-----------------|---------------|-------------|
| Config UI       | Electron      | Input endpoints, token |
| API Test        | Both          | Call Orderwise and external webhook |
| Sync Engine     | Service       | Run at boot or schedule |
| Logs            | SQLite + UI   | Read/display operation history |
| Installer       | MSI           | Single executable with no admin req if possible |

## Logical Dependency Chain

### Phase 1: Foundation – Core System Setup
- Create and test SQLite schema with `config`, `logs` tables.
- Write minimal Node.js service to:
  - Log heartbeat every minute.
  - Write initial service state to logs.
- Document database schema and service lifecycle behavior.
- Tests: DB file creation, table presence, service startup log.

### Phase 2: Communication Layer
- Add API request module to Node.js service.
  - Implement retry and timeout logic.
  - Log request, response, and failure metadata.
- Write config reader and validator from SQLite.
- Prepare mock payloads and define two Orderwise API endpoints for testing.
- Tests: Successful call to Orderwise API, failed call handling, log entries format.

### Phase 3: Frontend UI
- Build Electron screen for API configuration inputs.
- Save user inputs to SQLite.
- Create log panel to show recent activities from logs.
- Document Electron-DB interactions and UI component contracts.
- Tests: Save and retrieve config, UI reflects logs correctly, button click triggers mock sync.

### Phase 4: Installer and Cleanup
- Use WiX Toolset or Advanced Installer to bundle the system.
- Configure firewall rules and test MSI deployment on clean Windows environment.
- Document installation flow, user prompts, and expected outcomes.
- Ensure uninstall removes all registry and filesystem artifacts.
- Tests: Full install/uninstall cycle without admin permissions, firewall rule presence.

## AI and Automation
Not required for MVP. Future possibilities include:
- Auto-mapping fields
- Predictive logging insights
- AI sync schedulers

## Data Philosophy
- Local-only data architecture
- SQLite handles all config and logs
- Log every action with JSON structure and timestamp
- Support eventual log export for diagnostics

## Platform and Access
- Platform: Windows
- Stack: Node.js (Service), Electron (Desktop UI), SQLite (Storage)
- Access: No external cloud dependency

## Test and Documentation Philosophy
- Test cases precede feature development.
- Each feature must log start, success, failure with context.
- Documentation includes interface schemas and flow descriptions.
- Logs should allow easy identification of what happened, when, and why.

## Success Criteria
- Installs and runs without admin rights
- Electron UI accepts and saves config
- Node.js service calls APIs and logs results
- Logs visible in UI
- Clean uninstall
- Ready for scaling if test is successful

## UI Mockup Prompt

Design a minimalistic Windows desktop app using Electron for configuring and monitoring a local ERP sync service. The app should include:
- A configuration screen with three fields: "Orderwise API Base URL", "External Webhook URL", and "Bearer Token"
- Buttons: "Test Orderwise", "Send Test Payload", and "Sync Now"
- A log viewer below the buttons that shows recent sync attempts with timestamps and statuses (Success/Failure/Error Message)
Style: Professional, flat UI, no unnecessary animations. Responsive layout for 800x600 resolution. Use system font and clear spacing.

## Output Artifacts
- PRD (this file)
- UI mockup prompt
- Git repo structure (planned separately)
- MSI installer instructions (optional)
