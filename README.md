# Universal DevOps Automation Agent

A modular, enterprise-ready DevOps automation tool built in Node.js (CommonJS) following clean **Routes → Controllers → Models → Services** REST API architecture.

---

## 🏛️ Code Flow & Architecture Explained (Plain English)

If you have ever built an Express API or eaten at a restaurant, you already understand this architecture! Here is the exact analogy:

```
+-----------------------------------------------------------------------------------------+
|                                    THE REQUEST FLOW                                     |
+-----------------------------------------------------------------------------------------+

  1. CLIENT (Postman / Browser / Terminal)
     Sends: POST http://localhost:3000/api/projects/analyze
     Body:  { "path": "C:\\Projects\\my-app" }
        |
        v
  2. SERVER (server.js)
     - Receives HTTP request, parses JSON body with express.json().
     - Forwards request to /api routes.
        |
        v
  3. ROUTE (src/routes/projectRoutes.js)
     - The Receptionist / Traffic Police.
     - Matches: POST /api/projects/analyze -> calls projectController.analyzeProject(req, res).
        |
        v
  4. CONTROLLER (src/controllers/ProjectController.js)
     - The Kitchen Manager.
     - Reads req.body.path.
     - Calls pathValidator to check if the directory exists.
     - Creates the Project Model.
     - Calls GeminiService to get AI DevOps advice.
     - Sends HTTP Response: res.status(200).json({ success: true, data: project }).
        |
        +----------------------------+----------------------------+
        |                                                         |
        v                                                         v
  5. MODEL (src/models/Project.js)                 6. SERVICE (src/services/GeminiService.js)
     - The Blueprint / Recipe.                        - The Specialist Chef.
     - Holds project name, path, status, timestamp.   - Communicates with Google Gemini 2.5 Flash.
     - Ensures data validity.                         - Provides DevOps assessments.
```

---

## 📁 Directory Layout

```
devops-automation-agent/
├── server.js                      # Express API server entrypoint (npm start)
├── index.js                       # Optional CLI runner (npm run cli)
├── package.json                   # Dependencies & npm scripts
├── .env                           # GEMINI_API_KEY & server PORT
├── .env.example                   # Environment configuration template
├── README.md                      # Architecture guide
├── src/
│   ├── routes/
│   │   ├── index.js               # Main API router (/api)
│   │   └── projectRoutes.js       # Routes: POST /analyze, GET /health
│   ├── controllers/
│   │   └── ProjectController.js   # (req, res) controller handlers
│   ├── models/
│   │   └── Project.js             # Project domain entity blueprint
│   ├── services/
│   │   └── GeminiService.js       # Google Gemini 2.5 Flash AI integration
│   ├── views/
│   │   └── ProjectReportView.js   # Terminal formatter for CLI mode
│   └── utils/
│       ├── envLoader.js           # Native .env loader
│       ├── pathValidator.js       # Directory path validator
│       ├── errorHandler.js        # Centralized error handler
│       └── logger.js              # ANSI color logger
└── tests/
    ├── apiRoutes.test.js          # REST API route integration tests
    ├── GeminiService.test.js      # Gemini AI service tests
    ├── Project.test.js            # Model unit tests
    ├── ProjectController.test.js  # Controller unit tests
    └── pathValidator.test.js      # Filesystem validation tests
```

---

## 🚀 Quick Start Guide

### 1. Setup your Gemini Key in `.env`
Open `.env` and paste your Gemini API key:
```env
PORT=3000
GEMINI_API_KEY=AIzaSy...your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### 2. Start the API Server
```powershell
npm start
```
Output:
```
[SUCCESS] DevOps Automation Agent API Server running on port 3000!
[INFO] Root:   http://localhost:3000
[INFO] Health: http://localhost:3000/api/projects/health
[INFO] Docs:   POST http://localhost:3000/api/projects/analyze
```

### 3. Test the Endpoints

#### Check Server Health (`GET /api/projects/health`):
Open your browser at `http://localhost:3000/api/projects/health` or in PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/projects/health"
```
Response:
```json
{
  "status": "UP",
  "uptimeSeconds": 12,
  "geminiConfigured": true,
  "timestamp": "2026-10-14T06:30:00.000Z"
}
```

#### Analyze a Local Folder or Remote Git Repository (`POST /api/projects/analyze`):
In Postman or PowerShell:
```powershell
# Analyze local folder:
Invoke-RestMethod -Uri "http://localhost:3000/api/projects/analyze" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"path": "."}'

# Analyze remote Git URL:
Invoke-RestMethod -Uri "http://localhost:3000/api/projects/analyze" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"path": "https://github.com/your-username/your-repo"}'
```

#### Chat with Agent via API (`POST /api/projects/chat`):
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/projects/chat" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"message": "How do I configure Docker for this Node.js app?"}'
```

---

## 🔍 CLI Commands

### 1. Analyze Local Folder or Remote Git URL:
```powershell
# Analyze current folder:
node index.js analyze .

# Analyze any remote GitHub / GitLab / Bitbucket repository:
node index.js analyze "https://github.com/your-user/your-repo"
```

### 2. Interactive Terminal Chat:
```powershell
node index.js chat
# or:
npm run chat
```

### 3. One-Off Question (`ask`):
```powershell
node index.js ask "How do I setup a GitHub Actions CI pipeline for Node.js?"
```

---

## 🛡️ Quota & Token Protection Layer

To protect your Gemini quota, avoid `429 Too Many Requests`, and keep latency low:

1. **Token Budget (`GEMINI_MAX_TOKENS=300` in `.env`):**
   - Limits response generation to ~300 tokens per prompt (crisp, direct answers).
2. **Input Prompt Length Cap:**
   - Prompts are validated and capped at 1,000 characters to prevent huge payload abuse.
3. **Sliding Window History:**
   - In chat mode, only the last 4 turns (2 user questions + 2 agent replies) are passed to Gemini, keeping input token usage minimal.
4. **API Rate Limiter (10 Requests / Minute):**
   - Pure in-memory middleware throttles rapid API calls per IP with `Retry-After` headers.

---

## 🧪 Running Automated Tests

All 37 unit & integration tests run in ~1 second with zero test frameworks:
```powershell
npm test
```
```text
✔ GeminiService (7 tests pass)
✔ GitService (4 tests pass)
✔ Project Model (5 tests pass)
✔ ProjectController (MVC Coordination) (4 tests pass)
✔ StackDetectorService (2 tests pass)
✔ DevOps Agent Express API Routes (7 tests pass)
✔ PathValidator Utility (5 tests pass)
✔ RateLimiter Utility (3 tests pass)
ℹ tests 37
ℹ pass 37
ℹ fail 0
```
