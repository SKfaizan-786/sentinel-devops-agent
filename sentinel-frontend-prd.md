# Sentinel - Frontend Product Requirements Document

**Project:** Sentinel - Autonomous DevOps Intelligence Agent  
**Hackathon:** AI Agents Assemble (WeMakeDevs)  
**Duration:** 7 days  
**Platform:** Next.js + Vercel  
**Date:** December 10, 2025

---

## Executive Summary

Sentinel's frontend is a **real-time DevOps intelligence dashboard** that visualizes service health, incidents, agent decisions, and auto-healing actions. The UI must be **visually impressive, intuitive, and compelling** for both the hackathon demo and potential investors.

**Core UX Philosophy:** Live updates, clear incident narratives, and agent decision transparency.

---
## Visual Design Strategy

Sentinel’s frontend follows a Function–Aesthetic–Layout formula to avoid generic UI and ensure a coherent design language across the marketing site and the product dashboard.

### Landing Page (Marketing Site)

- **Function:** High-conversion SaaS Landing Page for an AI DevOps intelligence agent (“24/7 AI DevOps Engineer”).
- **Aesthetic:** Aurora Gradient + Glassmorphism.
  - Dark background with soft aurora gradients.
  - Frosted glass cards, subtle blur, depth, and layered panels.
- **Layout:** Scrollytelling with embedded Bento sections.
  - One long scroll that explains: Problem → Solution → How Sentinel works → Social proof → CTA.
  - Key sections (features, metrics, tool logos) organized in a Bento-style grid of cards.

**Golden Prompt (Landing):**  
“Create a high-conversion SaaS landing page for an AI DevOps intelligence agent that monitors services, predicts failures, auto-heals incidents, and explains its decisions. Use a scrollytelling layout that walks the user through the problem, the Sentinel solution, how it works, and a final CTA. Apply an Aurora Gradient + Glassmorphism aesthetic with a dark background, frosted glass cards, and soft glowing accents.”

### Dashboard (Product UI)

- **Function:** Real-time SaaS Dashboard for monitoring services, incidents, and agent decisions.
- **Aesthetic:** Dark Glassmorphism.
  - Dark slate background with layered, semi-transparent cards.
  - Clear hierarchy, strong contrast, minimal visual noise.
- **Layout:** Bento Grid.
  - Distinct cards for Health Summary, Services, Metrics, Incident Timeline, Agent Reasoning, Logs, and Alerts.
  - Grid adapts responsively (single column on mobile, multi-column on desktop).

**Golden Prompt (Dashboard):**  
“Create a real-time SaaS dashboard UI for an autonomous AI DevOps agent that shows system health, services, incidents, metrics, logs, and agent reasoning. Use a Bento Grid layout with distinct cards for each functional area so engineers can scan status at a glance. Apply a Dark Glassmorphism aesthetic with frosted glass panels, subtle depth, and a dark background optimized for dense data visualization.”


## Project Architecture

### Technology Stack
- **Framework:** Next.js 15+ (App Router)
- **Hosting:** Vercel
- **Styling:** Tailwind CSS + design system variables
- **Real-time Updates:** WebSockets (Socket.io) / Server-Sent Events (SSE)
- **Charts/Metrics:** Recharts or Chart.js
- **Icons:** Lucide React
- **State Management:** React Context or Zustand (keep it light)
- **Database Viewer:** Optional—view Kestra workflow logs (read-only)

### Backend Integration Points
1. **Kestra REST API** — Fetch workflow status, logs, metrics
2. **Metrics Store** — Database/time-series DB (PostgreSQL + TimescaleDB or similar)
3. **WebSocket Server** — Real-time incident push updates
4. **Auth** — Optional (for hackathon, can skip or use simple token auth)

---

## Page Inventory

### **1. Landing Page** (`/`)
**Purpose:** Hook judges & visitors. Communicate what Sentinel does in 10 seconds.

**Sections:**
- **Hero** — Bold headline + subheading + CTA button
  - Headline: "Meet Your AI DevOps Engineer"
  - Subheading: "Autonomous monitoring. Predictive healing. Always awake."
  - CTA: "View Live Dashboard" button
- **Problem Statement** — Why DevOps engineers need this
- **How It Works** — 3-4 step visual flow
  - Step 1: Monitors services 24/7
  - Step 2: Predicts failures before they happen
  - Step 3: Automatically fixes issues
  - Step 4: Learns and improves
- **Key Features** — Feature cards (Predictive, Autonomous, Intelligent, Transparent)
- **Tech Stack** — Logos: Kestra, Vercel, Cline, Oumi (if integrated)
- **CTA Section** — "Ready to prevent outages?" → Demo button
- **Footer** — Links, team info (optional for hackathon)

**Design Notes:**
- Modern, dark theme (tech-forward)
- Animated icons/transitions
- Real incident data could be embedded (e.g., "Prevented 47 outages this month")

---

### **2. Dashboard** (`/dashboard`)
**Purpose:** Real-time nerve center. THE most important page.

#### **Layout Structure**
```
┌─ Header (fixed) ─────────────────────────────────────┐
│ Logo | Search | Notifications | Theme Toggle | Profile │
├──────────────────────────────────────────────────────┤
│ ┌─ Sidebar (collapsible) ──┐ ┌─ Main Content ──────┐ │
│ │ • Overview               │ │ [Metrics Section]    │ │
│ │ • Services               │ │ [Incidents Section]  │ │
│ │ • Incidents              │ │ [Logs Section]       │ │
│ │ • Analytics              │ │ [Agent Reasoning]    │ │
│ │ • Settings               │ │                      │ │
│ └──────────────────────────┘ └──────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

#### **Key Sections (Tab-based or all visible)**

##### **A. Health Summary Widget** (Top)
```
┌─────────────────────────────────────┐
│ Overall System Health: 98.5% ↑      │
├─────────────────────────────────────┤
│ Services Up: 12/12                  │
│ Active Incidents: 0                 │
│ Alerts (24h): 3                     │
│ Issues Auto-Fixed: 2                │
└─────────────────────────────────────┘
```

**Metrics Displayed:**
- Overall uptime %
- Service count (up/total)
- Critical alerts count
- Auto-fixes in last 24h

---

##### **B. Services Grid** (Real-time status)
```
┌─ Service Card ────────────────┐
│ 🟢 API Server                 │
│ Status: Healthy               │
│ Uptime: 99.8% | Latency: 45ms │
│ CPU: 32% | Memory: 64% | Disk: 12% │
│ [View Details] [View Logs]    │
└───────────────────────────────┘
```

**Per Service:**
- Status indicator (🟢 healthy, 🟡 degraded, 🔴 down)
- Uptime % (last 24h)
- Current latency/response time
- Resource usage (CPU, memory, disk)
- 1-hour mini sparkline (trend)
- Action buttons (view logs, manual heal, settings)

**Grid/List Toggle:** Users can switch between grid and table view.

---

##### **C. Metrics & Graphs** (Real-time charts)
**Layout:** 2-3 charts, updating every 10-30 seconds.

1. **Response Time Trend**
   - X-axis: Last 6 hours (time)
   - Y-axis: Response time (ms)
   - Multiple lines (one per service)
   - Highlight anomalies with colored zone

2. **Error Rate Heatmap**
   - X-axis: Services
   - Y-axis: Time buckets
   - Color intensity = error rate %
   - Quick visual of patterns

3. **Resource Utilization**
   - Bar chart: CPU, memory, disk usage per service
   - Threshold lines (warning, critical)

**Requirements:**
- Live updates (WebSocket preferred)
- Responsive to screen size
- Zoom/pan capability
- Data point hover tooltips

---

##### **D. Incident Timeline** (Active + Recent)
**Purpose:** Tell the story of what went wrong and how the agent fixed it.

**Incident Card Structure:**
```
┌─────────────────────────────────────────────────────────┐
│ 🔴 Incident: Database Connection Pool Exhaustion       │
│ Status: [🟢 RESOLVED] Duration: 5 min 23 sec           │
├─────────────────────────────────────────────────────────┤
│ Detected: 2025-12-10 12:15:30 UTC (by Sentinel Agent)  │
│ Root Cause: Query timeout spike detected               │
│ Agent Action: Increased pool size from 50→100          │
│ Recovery: Service recovered at 12:20:53 UTC            │
├─────────────────────────────────────────────────────────┤
│ Timeline:                                               │
│  12:15:30 ⚠️  Anomaly detected                          │
│  12:15:45 🤖 Predicting: 87% chance escalation        │
│  12:16:00 🔧 Action: Increase pool size                │
│  12:20:53 ✅ Service recovered                          │
├─────────────────────────────────────────────────────────┤
│ Logs: [View Full Logs] | Learn: [View Agent Learning]  │
└─────────────────────────────────────────────────────────┘
```

**Key Info per Incident:**
- Incident type (latency spike, error rate, resource exhaustion, etc.)
- Service affected
- Detection timestamp
- Agent's prediction confidence
- Action taken
- Resolution timestamp + duration
- Status badge (resolved, in-progress, failed)
- Expandable timeline of micro-events
- Links to detailed logs + agent reasoning

**List Behavior:**
- Active incidents at top (sticky)
- Recent incidents below (last 24h)
- Ability to filter by service/type
- Click to expand full details

---

##### **E. Agent Decision Reasoning Panel** (Latest action)
**Purpose:** Transparency. Show exactly why the agent did what it did.

```
┌─────────────────────────────────────────────────────────┐
│ Latest Agent Decision                                   │
│ Timestamp: 2025-12-10 12:20:15 UTC                     │
├─────────────────────────────────────────────────────────┤
│ Incident: API Latency Spike                             │
│ Detected Metrics:                                        │
│  • Response time: 450ms → 1200ms (+167%)               │
│  • Error rate: 0.1% → 3.5% (+3400%)                    │
│  • Request queue: 150 → 800 (+433%)                    │
│                                                          │
│ Prediction: 91% confidence of service failure within 2m │
│                                                          │
│ Decision Tree:                                           │
│ ├─ Is CPU > 80%? YES → Scale resources                 │
│ ├─ Is DB connection pool < 50%? YES → Increase pool    │
│ └─ Is memory leak suspected? MAYBE → Monitor closely   │
│                                                          │
│ Action Taken: Scale from 2→4 instances                 │
│ Confidence: 94%                                          │
│ Expected outcome: Recovery in 30-45s                    │
│                                                          │
│ [ Approve ] [ Reject ] [ Learn from this ]              │
└─────────────────────────────────────────────────────────┘
```

**Expandable sections:**
- Detected anomalies (metric by metric)
- Prediction logic (decision tree visualization)
- Action rationale
- Expected outcome

---

##### **F. Alerts Panel** (Right sidebar, dismissible)
```
┌─────────────────────────────┐
│ Active Alerts (2)           │
├─────────────────────────────┤
│ ⚠️  High latency: API       │
│    148ms (avg: 45ms)        │
│    [Dismiss] [Investigate]  │
│                             │
│ 🔴 Error spike: Cache       │
│    5.2% error rate (< 0.1%) │
│    [Dismiss] [Investigate]  │
└─────────────────────────────┘
```

---

### **3. Services Page** (`/dashboard/services`)
**Purpose:** Detailed view of all monitored services. Deeper analytics per service.

**Layout:**
- Searchable/filterable service list
- Status column (visual indicator)
- Uptime % column
- Last incident column
- Actions column (view details, configure, pause monitoring)

**Click → Service Detail Modal or Dedicated Page:**
- Service name, description, team owner
- Current status & metrics
- 30-day uptime graph
- 7-day incident history
- Configured auto-healing rules
- Edit/configure service
- View all logs

---

### **4. Incidents Page** (`/dashboard/incidents`)
**Purpose:** Incident history, filtering, and analysis.

**Features:**
- **Filter by:** Date range, service, status (resolved/failed/pending), severity
- **Sort by:** Timestamp, duration, impact
- **Incident List:**
  - Incident type
  - Service(s) affected
  - Detected time
  - Resolution time
  - Duration
  - Status
  - Agent action taken
  - Click → Expanded view

**Incident Detail View (Modal or Page):**
- Full timeline with millisecond precision
- Metrics graphs for the incident period (zoomed in)
- Agent reasoning dump (decision logs)
- User feedback ("Agent did right/wrong?")
- Related incidents (patterns)

---

### **5. Analytics Page** (`/dashboard/analytics`)
**Purpose:** Insights, patterns, and learning metrics.

**Sections:**

#### **A. Agent Performance**
- Prediction accuracy (% correct predictions)
- False positive rate
- Mean time to resolution (MTTR)
- Auto-fix success rate %
- Learning curve (accuracy over time)

#### **B. Service Reliability**
- Uptime % by service (bar chart)
- Incident frequency by service
- Most common incident types
- Most common root causes

#### **C. Cost Impact**
- Estimated cost of downtime prevented
- Cost of resource scaling (if tracked)
- ROI of Sentinel (rough calculation)

#### **D. Trends**
- Incidents over time (line chart)
- Predictions accuracy trend
- Service health trend (overall)

---

### **6. Logs Page** (`/dashboard/logs`)
**Purpose:** Detailed log streaming and search.

**Features:**
- Real-time log stream (from Kestra workflows)
- Search by keyword, service, timestamp
- Log level filter (info, warning, error, debug)
- Downloadable log export (JSON/CSV)
- Log filtering by incident ID

**Layout:**
- Search/filter bar (top)
- Log table with: timestamp, level, service, message
- Click row → expanded view of full log entry

---

### **7. Settings Page** (`/dashboard/settings`)
**Purpose:** Configuration and preferences.

**Sections:**

#### **A. Monitoring Config**
- Add/remove services to monitor
- Set monitoring intervals (default: 30s)
- Configure alert thresholds (latency, error rate, resource usage)

#### **B. Auto-Healing Rules**
- Define when agent should act autonomously vs alert
- Severity levels (critical auto-heal, warning alert, info log)
- Timeout before escalating to human

#### **C. Notifications**
- Alert channels (email, Slack, webhook)
- Alert frequency (immediate, batch, daily digest)
- Notification preferences per incident type

#### **D. Agent Learning**
- Learning enabled/disabled toggle
- Feedback system (did agent do right?)
- Reset agent memory (clear learning history)

#### **E. Display & Theme**
- Dark/light mode toggle
- Timezone preference
- Data retention policy

#### **F. API Keys**
- Generate/revoke API keys (for external integration)
- View usage stats

---

### **8. Demo Page** (`/demo`)
**Purpose:** Pre-recorded or simulated demo for hackathon judges.

**Features:**
- Ability to "replay" a demo incident scenario
- Timeline scrubber (play through the incident)
- Narration/annotations overlay
- Shows the full story: healthy → degraded → agent fixes → recovery

**Or:**
- Live simulation mode that triggers fake incidents on demand
- Judges can press "Trigger Incident" button to watch the agent respond

---

### **9. Onboarding / Setup Page** (`/setup` or `/onboarding`)
**Purpose:** First-time setup flow.

**Steps:**
1. Welcome screen
2. Connect Kestra instance (URL + API key)
3. Add services to monitor (input service URLs)
4. Configure alert thresholds
5. Review configuration
6. "Start Monitoring" button → redirect to dashboard

---

### **10. Auth Pages** (Optional for Hackathon)
- `/login` — Simple login form
- `/signup` — Registration (or skip for demo)
- `/forgot-password` — Password reset (optional)

**For hackathon:** Can use simple session/token auth, or make it public.

---

## Detailed Component & Feature Specifications

### **Design System & Styling**

**Color Scheme:**
- Primary: Teal/Cyan (#32B8C6)
- Success: Green (#22C55E)
- Warning: Orange (#F59E0B)
- Error: Red (#EF4444)
- Background: Dark (#1F2937)
- Surface: Slightly lighter (#374151)
- Text: Light (#F3F4F6)

**Typography:**
- Headlines: Geist or Inter (bold, 24-32px)
- Body: Inter (regular, 14-16px)
- Mono (logs): Courier/Fira Code (12px)

**Spacing:** Use 8px grid system (8, 16, 24, 32, 48, 64px)

**Borders & Shadows:** Subtle, clean (no heavy shadows)

---

### **Real-time Updates Strategy**

**Data Flow:**
```
Kestra Workflows → Metrics DB
                 ↓
         WebSocket Server (or SSE)
                 ↓
    Next.js API Route (/api/stream)
                 ↓
           Browser WebSocket
                 ↓
    React Component (useEffect + useState)
                 ↓
    Update dashboard live
```

**Update Frequency:**
- Metrics: Every 10-30 seconds
- Incidents: Immediate (push when detected)
- Logs: Real-time stream
- Agent decisions: Immediate

**Fallback:** If WebSocket unavailable, use polling (30s interval).

---

### **Responsive Design**

**Breakpoints:**
- Mobile: 320px - 640px
- Tablet: 641px - 1024px
- Desktop: 1025px+

**Strategy:**
- Dashboard: Collapsible sidebar on mobile
- Charts: Stacked/single-column on mobile
- Incident cards: Full-width on mobile
- Service grid: 1 column on mobile, 2-3 on desktop

---

## Frontend Tech Decisions

### **Why Next.js?**
- ✅ Vercel native (1-click deploy)
- ✅ API routes (proxy to Kestra, WebSocket server)
- ✅ Static generation for landing page (fast)
- ✅ Dynamic for dashboard (real-time updates)
- ✅ SEO-friendly

### **Why Recharts?**
- ✅ React-native, lightweight
- ✅ Responsive out-of-box
- ✅ Real-time data updates
- ✅ Tooltip/hover interaction

### **Why Tailwind + Design System?**
- ✅ Rapid prototyping
- ✅ Consistent styling
- ✅ Easy dark mode
- ✅ Responsive utilities

---

## File Structure (Next.js App Router)

```
sentinel-frontend/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page (/)
│   ├── demo/
│   │   └── page.tsx            # Demo page
│   ├── login/
│   │   └── page.tsx            # Login page
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard layout (sidebar, header)
│   │   ├── page.tsx            # Dashboard overview
│   │   ├── services/
│   │   │   ├── page.tsx        # Services list
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Service detail
│   │   ├── incidents/
│   │   │   ├── page.tsx        # Incidents list
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Incident detail
│   │   ├── analytics/
│   │   │   └── page.tsx        # Analytics page
│   │   ├── logs/
│   │   │   └── page.tsx        # Logs page
│   │   └── settings/
│   │       └── page.tsx        # Settings page
│   └── api/
│       ├── services/
│       │   └── route.ts        # GET services list
│       ├── incidents/
│       │   └── route.ts        # GET incidents
│       ├── metrics/
│       │   └── route.ts        # GET metrics
│       ├── stream/
│       │   └── route.ts        # WebSocket or SSE endpoint
│       └── logs/
│           └── route.ts        # GET logs
├── components/
│   ├── dashboard/
│   │   ├── HealthSummary.tsx
│   │   ├── ServiceGrid.tsx
│   │   ├── ServiceCard.tsx
│   │   ├── MetricsCharts.tsx
│   │   ├── IncidentTimeline.tsx
│   │   ├── IncidentCard.tsx
│   │   ├── AgentReasoningPanel.tsx
│   │   └── AlertsPanel.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Navigation.tsx
│   ├── common/
│   │   ├── StatusBadge.tsx
│   │   ├── Sparkline.tsx
│   │   ├── Modal.tsx
│   │   └── LoadingSpinner.tsx
│   └── landing/
│       ├── HeroSection.tsx
│       ├── FeaturesSection.tsx
│       ├── HowItWorks.tsx
│       └── CTASection.tsx
├── hooks/
│   ├── useMetrics.ts           # Fetch + real-time metrics
│   ├── useIncidents.ts         # Fetch + watch incidents
│   ├── useLogs.ts              # Stream logs
│   └── useWebSocket.ts         # WebSocket connection
├── lib/
│   ├── api.ts                  # API client
│   ├── kestra.ts               # Kestra API integration
│   ├── types.ts                # TypeScript types
│   └── constants.ts            # Constants (API URLs, etc.)
├── styles/
│   ├── globals.css             # Tailwind + design system
│   └── theme.css               # Theme variables
├── public/
│   ├── logo.svg
│   ├── icons/
│   └── demo-data.json          # For demo mode
├── .env.local                  # Environment variables
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
└── package.json
```

---

## API Endpoints (Kestra Integration)

Your Next.js API routes will proxy these:

```
GET /api/services                    → List all services
GET /api/services/:id                → Get service detail + metrics
GET /api/incidents                   → List incidents (with filters)
GET /api/incidents/:id               → Get incident detail
GET /api/incidents/:id/logs          → Get logs for incident
GET /api/metrics?service=X&range=1h  → Get metrics for time range
GET /api/stream                      → WebSocket/SSE stream
GET /api/logs                        → Search logs
GET /api/analytics                   → Analytics summary
POST /api/incidents/:id/feedback     → Submit user feedback on agent decision
POST /api/settings                   → Save settings
```

---

## Performance Targets

- **Landing page:** < 2s load time
- **Dashboard initial load:** < 3s
- **Real-time updates:** < 500ms latency
- **Chart updates:** 60fps (smooth animations)
- **Mobile responsive:** Works on 3G

---

## Nice-to-Have Features (If Time)

1. **Dark Mode** (toggle in header)
2. **Export reports** (PDF or CSV)
3. **Incident annotations** (user notes on incidents)
4. **Slack integration** (show alerts in Slack)
5. **Comparison view** (compare 2 services' metrics)
6. **Custom dashboards** (user-created filtered views)
7. **Search across all data** (global search)
8. **Accessibility** (WCAG AA compliance)
9. **Mobile app** (React Native version, later)
10. **Predictive alerts** (show predicted failures in advance)

---

## Success Metrics (For Hackathon Judges)

- ✅ **Visually impressive demo** (clean, modern UI)
- ✅ **Real-time updates** (live metrics updating)
- ✅ **Clear incident narrative** (story tells itself)
- ✅ **Agent reasoning visible** (transparency wins)
- ✅ **Responsive design** (works on all screens)
- ✅ **Fast load times** (snappy interactions)
- ✅ **Polished UX** (no rough edges)

---

## Submission Checklist

- [ ] Landing page deployed and live
- [ ] Dashboard fully functional with real data
- [ ] Real-time updates working (WebSocket/SSE)
- [ ] Demo scenario ready (can replay perfectly)
- [ ] README with demo instructions
- [ ] Demo video (2-3 min) showing full flow
- [ ] Code well-documented (comments, types)
- [ ] Vercel deployment linked
- [ ] GitHub repo public (for Captain Code Award)
- [ ] Sensitive data (API keys) not exposed

---

## Build Priority (7-Day Sprint)

**Day 1:** Landing page + basic dashboard layout  
**Day 2:** Services grid + metrics charts  
**Day 3:** Incidents timeline + real-time updates  
**Day 4:** Agent reasoning panel + alerts  
**Day 5:** Analytics + settings pages  
**Day 6:** Polish, demo scenario, responsiveness  
**Day 7:** Documentation, video, final polish

---

**Good luck building! This is your visual story—make it shine. 🚀**
