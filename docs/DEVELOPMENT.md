````markdown
# Development Guide

This guide provides detailed technical information for developers working on Sentinel.

## 📚 Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Architecture](#project-architecture)
3. [Component Deep Dive](#component-deep-dive)
4. [Development Workflows](#development-workflows)
5. [Debugging & Troubleshooting](#debugging--troubleshooting)
6. [Performance Optimization](#performance-optimization)

---

## Development Environment Setup

### System Requirements

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | 18.x+ | LTS recommended |
| npm | 9.x+ | Or yarn/pnpm |
| Docker | 20.x+ | For full stack development |
| Docker Compose | 2.x+ | Included with Docker Desktop |
| Git | 2.30+ | Version control |

### Quick Start (5 minutes)

```bash
# 1. Clone repository
git clone https://github.com/SKfaizan-786/sentinel-devops-agent.git
cd sentinel-devops-agent

# 2. Install all dependencies
npm install:all  # Script in package.json

# 3. Start development stack
docker-compose up -d
npm run dev:all

# 4. Open in browser
# Frontend: http://localhost:3000
# Kestra: http://localhost:9090
```

### Detailed Setup

#### Frontend Development

```bash
cd sentinel-frontend

# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Build for production
npm run build
npm start

# Run linter
npm run lint

# Run tests (if configured)
npm run test
```

**Access:** <http://localhost:3000>

#### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Start server (watches for changes)
npm start

# Or use nodemon for auto-reload
npm run dev
```

**Access:** <http://localhost:4000>

**Endpoints:**

- `GET /api/status` - Service health
- `GET /api/activity` - Activity log
- `GET /api/insights` - AI insights
- `POST /api/kestra-webhook` - Webhook receiver

#### CLI Development

```bash
cd cli

# Install dependencies
npm install

# Test commands
npm link  # Makes 'sentinel' command globally available

# Run commands
sentinel status
sentinel simulate auth down
sentinel heal auth
sentinel report
```

#### Kestra Workflows

```bash
# Access Kestra UI
open http://localhost:9090

# Upload workflows manually or via docker volume
# Workflows auto-load from ./kestra-flows/
```

**Workflows:**

- `intelligent-monitor.yaml` - Main 30s monitoring loop
- `health-monitor.yaml` - Health check baseline

---

## Project Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                         │
│  Dashboard | Analytics | Incidents | Logs | Settings | Demo   │
│  ├─ Components (Glassmorphism UI)                            │
│  ├─ Hooks (useMetrics, useIncidents, useWebSocket)          │
│  └─ Mock Data (Service statuses, incidents)                 │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP Polling (interval)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Express.js)                         │
│  /api/status | /api/activity | /api/insights                 │
│  ├─ Health Monitor (every 5s)                               │
│  ├─ Activity Logger                                          │
│  └─ Webhook Receiver (from Kestra)                          │
└──────────┬────────────────────────────────┬──────────────────┘
           │                                │ Webhook
           │ Polls                          │ (AI Reports)
           ▼                                ▼
    ┌─────────────┐          ┌────────────────────────────┐
    │   Services  │          │  Kestra Orchestrator       │
    │  (Mock)     │          │  ├─ Fetch Metrics (30s)    │
    │ ├─ Auth     │          │  ├─ Detect Failures        │
    │ ├─ Payment  │          │  ├─ Auto-heal              │
    │ └─ Notify   │          │  ├─ Call Groq AI           │
    └─────────────┘          │  └─ Push Results           │
                             └──────────────┬─────────────┘
                                          │
                             ┌────────────▼──────────┐
                             │  Groq API (LLaMA)      │
                             │  AI Analysis Engine     │
                             └────────────────────────┘
```

### Data Flow

1. **Initialization:** Dashboard loads mock data + starts polling backend
2. **Health Polling:** Backend checks services every 5s
3. **Kestra Trigger:** Every 30s, workflow runs:
   - Fetches metrics from all 3 services
   - Detects failures
   - Auto-heals any down services
   - Calls Groq AI for analysis
   - Sends results to backend webhook
4. **Dashboard Update:** Frontend polls `/api/insights` and updates UI
5. **User Action:** Manual failures via CLI or simulate endpoints

---

## Component Deep Dive

### Frontend Component Hierarchy

```
App (Next.js Layout)
├─ Header
│  ├─ SentinelLogo
│  ├─ Navigation
│  └─ ProfileDropdown
├─ Dashboard
│  ├─ HealthSummary
│  ├─ ServiceGrid
│  │  └─ ServiceCard (x4)
│  ├─ MetricsCharts
│  │  ├─ TrafficChart (Recharts)
│  │  ├─ ResourcesChart
│  │  └─ PerformanceTable
│  ├─ IncidentTimeline
│  └─ AgentReasoningPanel
├─ Demo Page
│  ├─ Scenario Selector
│  ├─ ServiceGrid (Dynamic)
│  ├─ Metrics (Dynamic)
│  └─ Reasoning Panel
└─ Footer
```

### Key Components & Their Responsibilities

#### `HealthSummary.tsx`

- Displays overall system uptime percentage
- Shows service count (healthy/total)
- Shows active incidents count
- Updates in real-time from `useMetrics` hook

**Props:**

```typescript
interface HealthSummaryProps {
  uptime: number;        // 0-100%
  servicesUp: number;    // Healthy count
  totalServices: number; // Total count
  activeIncidents: number;
}
```

#### `ServiceCard.tsx`

- Shows individual service status
- Displays latency, CPU, memory
- Shows 12-hour trend sparkline
- Status badge (healthy/degraded/down)

**Data Source:** `useMetrics` hook + mock services

#### `MetricsCharts.tsx`

- Traffic chart (response time over time)
- Resources chart (CPU/memory usage)
- Performance table (sorted by metric)

**Data:** 20-30 point history from `useMetrics`

#### `AgentReasoningPanel.tsx`

- Shows AI analysis from Kestra
- Displays triggered action
- Shows confidence score
- Renders as terminal-style output

**Data:** Parsed from `incident.reasoning` (Groq response)

#### `IncidentTimeline.tsx`

- Chronological list of incidents
- Filters by status/severity
- Links to incident details
- Shows duration and root cause

**Data:** `useIncidents` hook

### Custom Hooks

#### `useMetrics()`

Returns real-time metrics for all services:

```typescript
const { metrics } = useMetrics();
// metrics = {
//   "auth-service": { 
//     currentResponseTime: 45,
//     currentErrorRate: 0.02,
//     currentCpu: 32,
//     history: [...]
//   }
// }
```

**Logic:**

- Polls backend `/api/status` every 2 seconds
- Applies sine wave to base values (visual liveliness)
- Detects down services (code !== 200)
- Maintains 30-point history

#### `useIncidents()`

Returns incident data with auto-open logic:

```typescript
const { incidents, activeIncidentId, setActiveIncidentId } = useIncidents();
// Auto-opens panel if critical/degraded
```

**Logic:**

- Fetches insights from `/api/insights`
- Parses AI analysis (JSON or string)
- Determines severity (CRITICAL/DEGRADED/HEALTHY)
- Auto-opens if failed status

#### `useWebSocket()` (Stub)

Currently returns mock WebSocket data. Ready for real WebSocket integration.

### Design System & Theming

The frontend utilizes a centralized theme configuration and a modern CSS variable system.

#### Theme Configuration (`lib/theme.ts`)

We use a strongly typed theme object to manage status and severity colors.

- **Status Scopes:** `healthy`, `warning`, `critical`, `unknown`, `degraded`, `down`, `info`
- **Helper Functions:**
  - `getStatusColor(status)`: Returns color object `{ bg, text, border, dot }`
  - `getSeverityColor(severity)`: Returns similar color object for severity levels

#### Global Styles (`globals.css`)

Key design system elements:

- **CSS Variables:** Mapped to semantic names (e.g., `--status-healthy`, `--status-critical`)
- **Visual Effects:**
  - `.glass`: Standard glassmorphism effect
  - `.liquid-glass`: Advanced cyan-tinted glass effect used in `ServiceCard`
  - `.aurora-bg`: Dynamic animated background

#### StatusBadge Component

The `StatusBadge` is the primary way to display state. It automatically maps the status string to the correct theme colors.

```tsx
import { StatusBadge } from '@/components/common/StatusBadge';

// Usage
<StatusBadge status="healthy" label="Operational" size="md" />
<StatusBadge status="critical" showDot={true} />
```

---

## Development Workflows

### Adding a New Dashboard Page

1. **Create page file**

   ```bash
   # sentinel-frontend/app/dashboard/new-feature/page.tsx
   "use client";
   
   import { useMetrics } from "@/hooks/useMetrics";
   
   export default function NewFeaturePage() {
     const { metrics } = useMetrics();
     
     return (
       <div>
         {/* Your UI */}
       </div>
     );
   }
   ```

2. **Add navigation link** in `Sidebar.tsx`

   ```typescript
   {
     label: "New Feature",
     href: "/dashboard/new-feature",
     icon: IconComponent
   }
   ```

3. **Create components** in `components/new-feature/`
4. **Use hooks** to fetch data
5. **Test** on multiple screens (mobile/tablet/desktop)

### Adding a New API Endpoint

1. **Add to backend** (`backend/index.js`)

   ```javascript
   app.get('/api/new-endpoint', (req, res) => {
     try {
       // Validate & process
       res.json({ success: true, data: { /* ... */ } });
     } catch (error) {
       res.status(500).json({ success: false, error: error.message });
     }
   });
   ```

2. **Update frontend hook** if needed

   ```typescript
   const fetchData = async () => {
     const res = await fetch('http://localhost:4000/api/new-endpoint');
     const data = await res.json();
     setData(data);
   };
   ```

3. **Test with curl/Postman**

   ```bash
   curl http://localhost:4000/api/new-endpoint
   ```

### Adding a New Kestra Workflow

1. **Create YAML** in `kestra-flows/`

   ```yaml
   id: my-workflow
   namespace: sentinel
   triggers:
     - id: schedule
       type: io.kestra.plugin.core.trigger.Schedule
       cron: "0 * * * *"  # Hourly
   tasks:
     - id: fetch-data
       type: io.kestra.plugin.core.http.Request
       uri: http://backend:4000/api/status
   ```

2. **Upload to Kestra** (via UI at localhost:9090 or auto-load from volume)
3. **Trigger manually** to test
4. **Check logs** in Kestra UI
5. **Send webhook** to backend if needed

### Adding a New CLI Command

1. **Create command function** (`cli/src/commands.js`)

   ```javascript
   export const myCommand = async (arg1) => {
     try {
       const result = await getStatus();
       console.log(chalk.green(`✅ ${result}`));
     } catch (error) {
       console.log(chalk.red(`❌ ${error.message}`));
     }
   };
   ```

2. **Register command** (`cli/index.js`)

   ```javascript
   program
     .command('mycommand')
     .description('Description of command')
     .argument('<arg1>', 'Argument help')
     .action(async (arg1) => {
       await myCommand(arg1);
     });
   ```

3. **Test locally**

   ```bash
   npm link
   sentinel mycommand arg1
   ```

---

## Debugging & Troubleshooting

### Common Issues

#### Frontend won't connect to backend

**Problem:** Dashboard shows "connecting" status

**Solution:**

```bash
# 1. Check backend is running
curl http://localhost:4000/api/status

# 2. Check CORS settings in backend/index.js
# Should have: app.use(cors());

# 3. Check frontend fetch URL matches
# Should be: http://localhost:4000

# 4. Check docker networking
docker network ls
docker network inspect sentinel-net
```

#### Services won't start in Docker

**Problem:** `docker-compose up` fails

**Solution:**

```bash
# Check logs
docker-compose logs

# Rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up

# Check specific service
docker logs auth-service
```

#### Kestra workflow not triggering

**Problem:** Workflow runs but doesn't execute

**Solution:**

```bash
# Access Kestra UI
open http://localhost:9090

# Check workflow syntax (YAML must be valid)
# Check trigger conditions
# Look at execution logs
# Manually trigger to test
```

#### AI analysis not appearing

**Problem:** AgentReasoningPanel is empty

**Solution:**

```bash
# Check GROQ_API_KEY is set
echo $SECRET_GROQ_API_KEY

# Check Kestra logs
docker logs kestra

# Verify webhook is being sent
# Check backend logs: docker logs backend

# Mock the response if API key not set
# Update intelligent-monitor.yaml to use mock data
```

### Debug Mode

Enable verbose logging:

```bash
# Frontend
NEXT_DEBUG=* npm run dev

# Backend
DEBUG=* npm start

# CLI
DEBUG=* sentinel status
```

### Browser DevTools

1. **React DevTools** - Inspect component state
2. **Network tab** - Monitor API calls
3. **Console** - Check errors/warnings
4. **Lighthouse** - Performance profiling

---

## Performance Optimization

### Frontend Optimizations

**Current:**

- Next.js 16 with App Router (built-in optimization)
- Tailwind CSS (tree-shaking unused styles)
- Framer Motion (GPU-accelerated animations)
- Lazy loading for heavy components

**To Improve:**

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';
const HeavyChart = dynamic(() => import('./charts/Heavy'), {
  loading: () => <Skeleton />,
  ssr: false // Don't render on server
});
```

### Backend Optimizations

**Current:**

- In-memory caching (activityLog, systemStatus)
- 5-second polling interval (reasonable balance)

**To Improve:**

```javascript
// Add caching for frequent requests
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

app.get('/api/status', (req, res) => {
  const now = Date.now();
  if (cache.has('status') && now - cache.get('status').time < CACHE_TTL) {
    return res.json(cache.get('status').data);
  }
  // Compute and cache
});
```

### Kestra Optimizations

**Current:**

- 30-second trigger interval
- Parallel health checks (3x concurrent)
- Conditional AI analysis (only if failures detected)

**To Improve:**

```yaml
# Use allowFailure to prevent blocking
- id: fetch-metrics
  type: io.kestra.plugin.core.flow.Parallel
  allowFailure: true  # Continue even if some fail
  timeout: 10s        # Set timeout
```

### Database (Future)

When adding persistent storage:

```javascript
// Use indexes for frequent queries
db.incidents.createIndex({ timestamp: -1 });

// Batch writes
const batch = [];
incidents.forEach(inc => batch.push(inc));
await db.insertMany(batch);

// Pagination
const page = req.query.page || 1;
const limit = 50;
const skip = (page - 1) * limit;
```

---

## Best Practices

### Code Style

- **Use TypeScript** for new frontend code
- **Use const/let** (no var)
- **Arrow functions** preferred
- **Comments** for complex logic
- **Descriptive variable names**

### Component Design

- **One component = one responsibility**
- **Props should be typed**
- **Use composition over inheritance**
- **Memoize expensive computations**

### API Design

- **RESTful endpoints**
- **Consistent error responses**
- **CORS headers set properly**
- **Rate limiting (future)**

### Testing (when adding tests)

```javascript
// Test file structure
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Test implementation
  });

  it('should handle props correctly', () => {
    // Test implementation
  });
});
```

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/en/starter/basic-routing.html)
- [Kestra Docs](https://kestra.io/docs)
- [Groq API](https://console.groq.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Happy coding! 🚀**

````