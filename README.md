# Universal DevOps Automation Agent

A modular, enterprise-ready DevOps automation tool built in pure JavaScript (Node.js CommonJS) following clean **MVC (Model-View-Controller)** architecture.

Designed for real DevOps teams, this agent inspects software repositories, validates environment configurations, orchestrates CI/CD pipelines, executes security scans, and coordinates multi-cloud deployments deterministically (with optional AI-assisted diagnosis in later milestones).

---

## Architecture: Why MVC for a DevOps Agent?

Even though MVC is traditionally associated with web applications, applying MVC to a CLI automation agent enforces strict separation of concerns, high testability, and clean maintainability:

```
                      +-------------------+
                      |     CLI Input     |
                      |   (node index)    |
                      +---------+---------+
                                |
                                v
                      +-------------------+
                      |     App Router    |
                      |    (src/app.js)   |
                      +---------+---------+
                                |
                                v
                    +-----------------------+
                    |   ProjectController   | <---+ Coordinates operations
                    +-----------+-----------+     | Thin logic, no business rules
                                |                 |
         +----------------------+-----------------+
         |                                        |
         v                                        v
+-----------------+                      +-------------------+
|  Project Model  |                      | ProjectReportView |
| (src/models)    |                      | (src/views)       |
+--------+--------+                      +---------+---------+
         | Encapsulates data & rules               | Formats output (Terminal / JSON)
         |                                         v
         |                               +-------------------+
         +-----------------------------> |  Terminal Output  |
                                         +-------------------+
```

### Component Responsibilities:

1. **Models (`src/models/`)**:
   - Represent domain entities and business rules (e.g. `Project.js`).
   - Validate data consistency (e.g. ensuring absolute root paths and valid names).
   - Never interact directly with user input, terminal output, or cloud APIs.

2. **Views (`src/views/`)**:
   - Responsible strictly for formatting data for humans or automation (e.g. `ProjectReportView.js`).
   - Renders terminal reports with status banners, and optionally outputs structured JSON.
   - Contains zero filesystem access or business logic.

3. **Controllers (`src/controllers/`)**:
   - Act as coordinators (e.g. `ProjectController.js`).
   - Receives commands and parameters from the CLI router (`src/app.js`).
   - Invokes validators, services, and models.
   - Passes processed data to the View and manages process exit codes.

4. **Utilities (`src/utils/`)**:
   - Zero-dependency helpers for path validation (`pathValidator.js`), styled console logging (`logger.js`), and centralized error handling (`errorHandler.js`).

---

## Directory Structure (Milestone 1)

```
devops-automation-agent/
├── package.json                   # Project manifest, scripts, and configuration
├── .gitignore                     # Git ignore rules for node_modules, logs, reports
├── .env.example                   # Template for environment configuration
├── README.md                      # Architecture documentation and guides
├── index.js                       # Executable CLI entrypoint
├── src/
│   ├── app.js                     # Application command router & argument parser
│   ├── models/
│   │   └── Project.js             # Model representing target repository state
│   ├── views/
│   │   └── ProjectReportView.js   # Formatter for terminal and JSON reporting
│   ├── controllers/
│   │   └── ProjectController.js   # MVC coordinator for project inspection
│   └── utils/
│       ├── logger.js              # ANSI-colored console logging utility
│       ├── pathValidator.js       # Directory path existence and access validator
│       └── errorHandler.js        # Centralized error handler
└── tests/
    ├── Project.test.js            # Unit tests for Project domain model
    ├── ProjectController.test.js  # Unit tests for controller flow & view delegation
    └── pathValidator.test.js      # Unit tests for directory path validation
```

---

## Prerequisites

- **Node.js**: Version 18.0.0 or higher (Node 24+ recommended).
- **npm**: Version 9.0.0 or higher.
- **Operating System**: Windows PowerShell, macOS, or Linux.

Zero third-party runtime dependencies are required for Milestone 1.

---

## Installation & Setup

1. Open Windows PowerShell or your terminal.
2. Navigate to the project directory:
   ```powershell
   cd "C:\Users\HeerPatel\.gemini\antigravity\scratch\devops-automation-agent"
   ```
3. Verify Node.js and npm versions:
   ```powershell
   node -v
   npm -v
   ```

---

## CLI Usage

### 1. View Help Guide
```powershell
node index.js
# or
node index.js --help
```

### 2. Analyze a Project Directory
Pass an existing repository directory path (relative or absolute):

```powershell
# Analyze current directory
npm run dev -- analyze "."

# Analyze with absolute path
npm run dev -- analyze "C:\Users\HeerPatel\.gemini\antigravity\scratch\devops-automation-agent"

# Direct invocation
node index.js analyze "."
```

### 3. Output in Structured JSON Format
Add the `--json` flag to emit machine-readable JSON:

```powershell
node index.js analyze "." --json
```

### 4. Error Handling Examples
The agent safely validates target directories before executing any operations:

```powershell
# Missing path argument
node index.js analyze

# Non-existent path
node index.js analyze "C:\DoesNotExist"

# Passing a single file instead of a folder
node index.js analyze "package.json"
```

---

## Running Automated Tests

Tests are written using Node.js's native test runner (`node:test` and `node:assert`). They run instantly without external testing frameworks:

```powershell
npm test
```

Expected output:
```
✔ Project Model (5 tests pass)
✔ ProjectController (MVC Coordination) (3 tests pass)
✔ PathValidator Utility (5 tests pass)
ℹ tests 13
ℹ pass 13
ℹ fail 0
```

---

## Roadmap

- [x] **Milestone 1: MVC CLI Foundation** (Current)
- [ ] **Milestone 2: Project Discovery** (Detecting Node.js, .NET, Python, Docker, K8s, CI/CD YAML)
- [ ] **Milestone 3: Environment Configuration Audit** (Detecting secrets, missing variables, `.env.example`)
- [ ] **Milestone 4: Security Policy Checks** (Gitleaks, Trivy, npm audit, SonarQube)
- [ ] **Milestone 5: Azure DevOps CI/CD Integration** (Inspecting and orchestrating pipelines)
- [ ] **Milestone 6: Azure Key Vault Integration** (Secret reference validation and managed identity)
- [ ] **Milestone 7: Controlled Multi-Cloud Deployments** (Pre-checks, approval gates, health checks)
- [ ] **Milestone 8: Additional Cloud & Secret Providers** (AWS, Google Cloud, Kubernetes)
- [ ] **Milestone 9: AI Diagnosis & Planning** (Explaining failures and recommending fixes)
