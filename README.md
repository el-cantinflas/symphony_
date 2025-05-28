# Orderwise Local Sync Validator

A local architecture stack (Node.js Windows Service + Electron + SQLite) that securely interacts with the Orderwise REST API and external services within a corporate network.

## Project Overview

This application is designed to test whether a Node.js-based Windows Service can reliably:
- Run on the same Windows network as Orderwise
- Access its local REST API securely
- Process and forward data to external systems
- Be installed/removed easily via MSI without admin permissions

## Project Structure

```
orderwise-local-sync/
├── src/                  # Source code for Node.js service
│   ├── DBManager.js      # Database connection and schema management
│   └── index.js          # Main entry point for the application
├── public/               # Electron UI assets
│   ├── index.html        # Main Electron UI page
│   ├── styles/           # CSS styles
│   └── scripts/          # Frontend JavaScript
├── Database/             # SQLite database files
├── scripts/              # Utility scripts
└── tasks/                # Task management files
```

## Installation

### Prerequisites

- Node.js (LTS, v20.x or later)
- npm (included with Node.js)
- Windows OS (for service functionality)

### Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd orderwise-local-sync
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Rebuild native modules for Electron (if needed):
   ```
   npx electron-rebuild
   ```

## Development

### Running the Application

For development, you can run the Electron app with:

```
npm start
```

### Database Schema

The application uses SQLite with the following schema:

#### Config Table
- `key` (TEXT): Configuration key name
- `value` (TEXT): Configuration value
- `updated_at` (DATETIME): Last update timestamp

#### Logs Table
- `id` (INTEGER): Auto-incrementing primary key
- `event` (TEXT): Event type or name
- `data` (TEXT): JSON data related to the event
- `timestamp` (DATETIME): Event timestamp

## Building and Packaging

To create an MSI installer:

```
npm run build
```

This will create an installer in the `dist` directory.

## Testing

Run tests with:

```
npm test
```

## License

ISC