# Getting Started with Sentinel

Welcome to **Sentinel**, an autonomous AI‑powered DevOps agent that predicts failures, auto‑heals services, and gives you a real‑time view of your infrastructure.[web:1]  
This guide walks you from a fresh clone to a running dashboard.

---

## 1. Prerequisites

Make sure you have these installed before starting:

- **Docker** & **Docker Compose** (v20+ recommended)  
  - Install Docker Desktop (Windows/macOS) or Docker Engine (Linux): `https://docs.docker.com/get-docker/`
- **Node.js 18+**  
  - Download: `https://nodejs.org/en/download/`
- **Git**  
  - `https://git-scm.com/downloads`
- **Groq API key** (for AI analysis)  
  - `https://console.groq.com/`

> PostgreSQL, Kestra, and mock services are all started via `docker-compose.yml`, you do not need to install them separately.

---

## 2. Clone the Repository

```bash
git clone https://github.com/SKfaizan-786/sentinel-devops-agent.git
cd sentinel-devops-agent
```
---
## 3. Configure Environment Variables
### 3.1 Backend .env
1. Copy the example file:
```bash
cp backend/.env.example backend/.env
```
2. Open backend/.env and review/update the key variables:
### 3.2 Frontend .env.local
```bash
cd sentinel-frontend
cp .env.example .env.local
```
Set the backend URL

---
## 4. Start the Full Stack with Docker
From the repo root:
```bash
docker-compose up -d
```
**This brings up:**

Sentinel backend (`default http://localhost:4000`)

Next.js dashboard (`default http://localhost:3000`)

Kestra orchestrator

PostgreSQL + mock services for **auth**, **payment**, and **notification**.

**Verify containers:**
```bash
docker ps
```
You should see containers for the backend, frontend, Kestra, Postgres, and mock services.

---
## 5. Initialize Backend & RBAC
Open a new terminal, then:
```bash
cd sentinel-devops-agent/backend
npm install
npm run quick-setup
```
---
## 6. (Optional) Run Frontend via npm
If you prefer running the dashboard with npm instead of the Docker‑built container:
```bash
cd sentinel-devops-agent/sentinel-frontend
npm install
npm run dev
```
The dev server runs at: `http://localhost:3000`

Ensure the backend is running (via Docker or npm start in backend).

---
## 7. CLI Quick Start
Sentinel provides a CLI to interact with the system from your terminal.

**7.1 Install CLI**
```bash
cd sentinel-devops-agent/cli
npm install
npm link
```
This links a global sentinel command.

**7.2 Example CLI Commands**
```bash
# Show overall system health
sentinel status

# Simulate failures (chaos tests)
sentinel simulate auth down
sentinel simulate payment degraded
sentinel simulate notification slow

# Trigger a manual heal action
sentinel heal auth

# Generate an AI incident report
sentinel report
```
---
## 8. Common Issues & Troubleshooting
**10.1 Docker daemon not running**

Symptom: `docker-compose up -d` returns “Cannot connect to the Docker daemon”.

**Fix:**

Start Docker Desktop (Windows/macOS).

**On Linux:**
```bash
sudo systemctl start docker
sudo systemctl enable docker
```
Then re‑run **docker-compose up -d**.

---
## 9. Next Steps
After you are comfortable with the basic setup, continue with:

[ARCHITECTURE.md](ARCHITECTURE.md) – high‑level system design and data flow.

[API.md](API.md) – backend API reference.

[DEVELOPMENT.md](DEVELOPMENT.md) – advanced dev workflows.

[DOCUMENTATION.md](DOCUMENTATION.md) – documentation index.

[FAQ.md](FAQ.md) – common operational questions.

If you run into problems that are not covered here, open a GitHub issue with details about your OS, Docker/Node versions, and relevant logs so maintainers can help.