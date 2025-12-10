# Sentinel Frontend - Cursor/Cline IDE Instructions

**Project:** Sentinel - Autonomous DevOps Intelligence Agent  
**Frontend Framework:** Next.js 15+ (App Router)  
**Hosting:** Vercel  
**Duration:** 7-day sprint  
**Date Created:** December 10, 2025

---

## 📋 SYSTEM PROMPT FOR IDE

## 📋 SYSTEM PROMPT FOR IDE

You are building **Sentinel**, a real-time DevOps intelligence dashboard and its marketing site. Use the Function–Aesthetic–Layout formula for all UI decisions.

### Global Design Formula

- **Landing Page**
  - Function: SaaS Landing Page for an AI DevOps intelligence agent.
  - Aesthetic: Aurora Gradient + Glassmorphism (dark background, soft gradients, frosted glass cards).
  - Layout: Scrollytelling with embedded Bento sections.

- **Dashboard**
  - Function: SaaS Dashboard for live DevOps monitoring and agent decisions.
  - Aesthetic: Dark Glassmorphism (layered, semi-transparent cards over a dark slate background).
  - Layout: Bento Grid (cards for health, services, metrics, incidents, logs, and reasoning).

When generating components, layouts, and styles, always align with this formula.

**Golden Prompt (for landing generation):**  
“Create a SaaS landing page for an AI DevOps intelligence agent called Sentinel. Use a scrollytelling layout that starts with the outage/DevOps pain, then introduces Sentinel, explains how it works (monitoring, prediction, auto-healing, learning), and ends with a strong CTA to view the live dashboard. Apply an Aurora Gradient + Glassmorphism aesthetic: dark background, soft gradient glows, and frosted glass cards for features and metrics.”

**Golden Prompt (for dashboard generation):**  
“Create a real-time SaaS dashboard for Sentinel, an autonomous AI DevOps agent. Use a Bento Grid layout with cards for: overall system health, services list, metrics charts, incident timeline, agent reasoning panel, alerts, and logs. Apply a Dark Glassmorphism aesthetic with semi-transparent panels, subtle blur, and clear hierarchy so engineers can quickly understand the system state.”


---

## 🎨 DESIGN SYSTEM

### Color Palette

```typescript
// tailwind.config.ts colors
const colors = {
  // Semantic colors
  primary: '#32B8C6',        // Teal/Cyan
  success: '#22C55E',        // Green
  warning: '#F59E0B',        // Orange
  error: '#EF4444',          // Red
  
  // Backgrounds
  bg: {
    primary: '#0F172A',      // Very dark (charcoal)
    secondary: '#1E293B',    // Dark slate
    tertiary: '#334155',     // Medium slate
  },
  
  // Text
  text: {
    primary: '#F1F5F9',      // Light
    secondary: '#CBD5E1',    // Medium light
    muted: '#94A3B8',        // Muted
  },
  
  // Status indicators
  status: {
    healthy: '#10B981',      // Green
    degraded: '#F59E0B',     // Orange
    down: '#EF4444',         // Red
  },
};
```

### Typography

```css
/* Headlines */
h1 { font-size: 2rem; font-weight: 600; }      /* 32px */
h2 { font-size: 1.5rem; font-weight: 600; }    /* 24px */
h3 { font-size: 1.25rem; font-weight: 600; }   /* 20px */
h4 { font-size: 1rem; font-weight: 600; }      /* 16px */

/* Body */
body { font-size: 0.875rem; font-weight: 400; } /* 14px */
small { font-size: 0.75rem; }                    /* 12px */

/* Mono (logs) */
code { font-family: 'Fira Code', monospace; }
```

### Spacing (8px grid)

```
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
```

---

## 📁 PROJECT SETUP

### Dependencies (package.json)

```json
{
  "name": "sentinel-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.294.0",
    "zustand": "^4.4.0",
    "socket.io-client": "^4.7.0",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0"
  }
}
```

### Directory Structure

```
sentinel-frontend/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page (/)
│   ├── globals.css                # Global Tailwind + design system
│   ├── login/
│   │   └── page.tsx               # Login page
│   ├── setup/
│   │   └── page.tsx               # Onboarding setup
│   ├── demo/
│   │   └── page.tsx               # Demo replay
│   └── dashboard/
│       ├── layout.tsx             # Dashboard layout (header + sidebar)
│       ├── page.tsx               # Dashboard overview
│       ├── services/
│       │   ├── page.tsx           # Services list
│       │   └── [id]/
│       │       └── page.tsx       # Service detail
│       ├── incidents/
│       │   ├── page.tsx           # Incidents list
│       │   └── [id]/
│       │       └── page.tsx       # Incident detail
│       ├── analytics/
│       │   └── page.tsx           # Analytics page
│       ├── logs/
│       │   └── page.tsx           # Logs page
│       └── settings/
│           └── page.tsx           # Settings page
├── api/
│   └── (internal API routes)
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
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Navigation.tsx
│   │   └── DashboardLayout.tsx
│   ├── common/
│   │   ├── StatusBadge.tsx
│   │   ├── Sparkline.tsx
│   │   ├── Modal.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── LoadingSpinner.tsx
│   └── landing/
│       ├── HeroSection.tsx
│       ├── FeaturesSection.tsx
│       ├── HowItWorks.tsx
│       ├── TechStack.tsx
│       └── CTASection.tsx
├── hooks/
│   ├── useMetrics.ts
│   ├── useIncidents.ts
│   ├── useLogs.ts
│   ├── useWebSocket.ts
│   └── useWindowSize.ts
├── lib/
│   ├── api.ts                     # API client
│   ├── types.ts                   # TypeScript types
│   ├── constants.ts               # Constants
│   ├── mockData.ts                # Mock data for development
│   └── utils.ts                   # Utility functions
├── store/
│   └── dashboard.ts               # Zustand store
├── styles/
│   ├── globals.css                # Global styles + Tailwind
│   └── variables.css              # CSS variables
├── public/
│   ├── logo.svg
│   └── icons/
├── .env.local                     # Environment variables
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🚀 BUILD ORDER (7-Day Sprint)

### **Day 1: Project Scaffold + Landing Page**

**Tasks:**
1. Initialize Next.js project with TypeScript
2. Configure Tailwind CSS + design system
3. Create landing page structure (hero, features, CTA)
4. Set up basic responsive layout
5. Create Header, Footer components
6. Mock landing page data

**Files to create:**
- `app/page.tsx` (landing page)
- `app/globals.css` (Tailwind + design system)
- `tailwind.config.ts`
- `components/landing/*`
- `lib/constants.ts`

**Deliverable:** Landing page visually impressive, responsive, deployed to Vercel

---

### **Day 2: Dashboard Layout + Services Grid**

**Tasks:**
1. Create dashboard layout (header, sidebar, main content area)
2. Implement collapsible sidebar for mobile
3. Build Health Summary widget
4. Create Service Card component
5. Build Services Grid with mock data
6. Implement grid/list toggle view
7. Add service filter/search

**Files to create:**
- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `components/layout/Header.tsx`
- `components/layout/Sidebar.tsx`
- `components/dashboard/HealthSummary.tsx`
- `components/dashboard/ServiceGrid.tsx`
- `components/dashboard/ServiceCard.tsx`
- `components/common/StatusBadge.tsx`
- `lib/mockData.ts`
- `lib/types.ts`

**Deliverable:** Dashboard shell with services showing, fully responsive

---

### **Day 3: Metrics Charts + Real-time Updates**

**Tasks:**
1. Create metrics charts component (Recharts)
   - Response Time Trend (line chart)
   - Error Rate (line chart)
   - Resource Utilization (bar chart)
2. Implement WebSocket mock updates
3. Create real-time data hook (useMetrics)
4. Add sparklines to service cards
5. Implement chart interactions (hover, zoom)
6. Set up mock WebSocket server for development

**Files to create:**
- `components/dashboard/MetricsCharts.tsx`
- `hooks/useMetrics.ts`
- `hooks/useWebSocket.ts`
- `lib/api.ts` (API client with fallback polling)
- `store/dashboard.ts` (Zustand store)

**Deliverable:** Charts updating in real-time with mock data

---

### **Day 4: Incidents Timeline + Agent Reasoning**

**Tasks:**
1. Create Incident Card component
2. Build Incident Timeline component (scrollable list)
3. Create Agent Decision Reasoning Panel
4. Implement incident filtering/searching
5. Create incident detail modal
6. Add timeline micro-events visualization
7. Create useIncidents hook

**Files to create:**
- `components/dashboard/IncidentTimeline.tsx`
- `components/dashboard/IncidentCard.tsx`
- `components/dashboard/AgentReasoningPanel.tsx`
- `hooks/useIncidents.ts`
- `components/common/Modal.tsx`
- `components/common/Card.tsx`

**Deliverable:** Incident history showing with agent decisions clearly visible

---

### **Day 5: Incidents + Logs Pages**

**Tasks:**
1. Build `/dashboard/incidents` page
   - Incident list with filters (date, service, status)
   - Sort functionality
   - Incident detail page (`/dashboard/incidents/[id]`)
2. Build `/dashboard/logs` page
   - Log streaming component
   - Search/filter by service, level, timestamp
   - Log export (JSON/CSV)
3. Create log table component
4. Implement log detail modal
5. Create useLogs hook

**Files to create:**
- `app/dashboard/incidents/page.tsx`
- `app/dashboard/incidents/[id]/page.tsx`
- `app/dashboard/logs/page.tsx`
- `hooks/useLogs.ts`
- `components/common/Table.tsx` (reusable)

**Deliverable:** Full incident & log pages with filtering, sorting, search

---

### **Day 6: Analytics + Settings Pages**

**Tasks:**
1. Build `/dashboard/analytics` page
   - Agent performance metrics (accuracy, MTTR, success rate)
   - Service reliability chart (uptime %)
   - Incident frequency trends
   - Cost impact estimation
2. Build `/dashboard/settings` page
   - Monitoring config (add/remove services)
   - Alert thresholds
   - Auto-healing rules
   - Notification preferences
   - Theme toggle (dark/light)
3. Implement settings persistence (localStorage or API)
4. Add AlertsPanel component to dashboard

**Files to create:**
- `app/dashboard/analytics/page.tsx`
- `app/dashboard/settings/page.tsx`
- `components/dashboard/AlertsPanel.tsx`
- `components/dashboard/AnalyticsCharts.tsx`

**Deliverable:** Analytics and Settings fully functional

---

### **Day 7: Polish, Demo, Documentation**

**Tasks:**
1. Create Demo page (`/demo`)
   - Ability to replay demo incident scenario
   - Timeline scrubber
   - Incident trigger button
2. Create Onboarding page (`/setup`)
   - 5-step setup wizard
3. Fix bugs and edge cases
4. Optimize performance (lazy loading, code splitting)
5. Ensure mobile responsiveness
6. Add loading states and error boundaries
7. Create README with setup instructions
8. Build and deploy to Vercel

**Files to create:**
- `app/demo/page.tsx`
- `app/setup/page.tsx`
- `components/common/ErrorBoundary.tsx`
- `README.md`

**Deliverable:** Polished, production-ready frontend, deployed to Vercel

---

## 🔌 API ROUTES (Mock for Now)

### API Structure

```typescript
// app/api/services/route.ts
export async function GET() {
  // Return mock services
  return Response.json([...]);
}

// app/api/incidents/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service');
  const status = searchParams.get('status');
  // Return mock incidents filtered
  return Response.json([...]);
}

// app/api/metrics/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service');
  const range = searchParams.get('range'); // '1h', '6h', '24h'
  // Return mock metrics
  return Response.json({...});
}

// app/api/stream/route.ts - WebSocket/SSE endpoint
export async function GET() {
  // Return real-time stream of metrics
  return streamResponse(...);
}

// app/api/logs/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('q');
  const level = searchParams.get('level');
  // Return mock logs
  return Response.json([...]);
}
```

---

## 🎯 COMPONENT SPECIFICATIONS

### 1. **HealthSummary Component**

```typescript
// components/dashboard/HealthSummary.tsx
interface HealthSummaryProps {
  uptime: number;           // e.g., 98.5
  servicesUp: number;       // e.g., 12
  totalServices: number;    // e.g., 12
  activeIncidents: number;
  autoFixedCount24h: number;
}

export function HealthSummary(props: HealthSummaryProps) {
  // Display:
  // - Overall Health: 98.5% ↑
  // - Services Up: 12/12
  // - Active Incidents: 0
  // - Auto-Fixed (24h): 2
  // - Status color indicator (green if healthy, yellow if degraded, red if down)
}
```

**Design:**
- 4 metrics in a row (responsive: 2 rows on mobile)
- Large percentage at top
- Trend indicator (↑/↓/→)
- Use system colors (success, warning, error)

---

### 2. **ServiceCard Component**

```typescript
interface ServiceCardProps {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;           // e.g., 99.8
  latency: number;          // e.g., 45 (ms)
  resources: {
    cpu: number;           // e.g., 32 (%)
    memory: number;        // e.g., 64 (%)
    disk: number;          // e.g., 12 (%)
  };
  recentIncidents: number;  // e.g., 3
  lastIncident?: {
    timestamp: Date;
    type: string;
  };
  onViewDetails: (id: string) => void;
  onViewLogs: (id: string) => void;
}

export function ServiceCard(props: ServiceCardProps) {
  // Display:
  // 🟢 Service Name (with status indicator)
  // Status: Healthy
  // Uptime: 99.8% | Latency: 45ms
  // CPU: 32% | Memory: 64% | Disk: 12%
  // [View Details] [View Logs] buttons
  // Mini sparkline trend (1-hour)
  // Hover effect (elevation)
}
```

---

### 3. **MetricsCharts Component**

```typescript
interface MetricsChartsProps {
  timeRange: '1h' | '6h' | '24h';
  services: string[];
  data: TimeSeriesData[];
}

export function MetricsCharts(props: MetricsChartsProps) {
  // Render 3 charts:
  // 1. Response Time Trend (line chart, multi-line)
  // 2. Error Rate (line chart)
  // 3. Resource Utilization (bar chart)
  // 
  // Features:
  // - Time range selector
  // - Service filter
  // - Hover tooltips
  // - Download data button
  // - Real-time updates (smooth animation)
}
```

---

### 4. **IncidentCard Component**

```typescript
interface IncidentCardProps {
  id: string;
  type: string;                      // e.g., "Database Connection Pool Exhaustion"
  service: string;
  status: 'resolved' | 'in-progress' | 'failed';
  severity: 'critical' | 'warning' | 'info';
  detectedAt: Date;
  resolvedAt?: Date;
  duration?: number;                 // milliseconds
  agentPredictionConfidence: number; // e.g., 87
  agentAction: string;               // e.g., "Increased pool size from 50→100"
  rootCause: string;
  onExpand: (id: string) => void;
  onViewLogs: (id: string) => void;
  onViewReasoning: (id: string) => void;
}

export function IncidentCard(props: IncidentCardProps) {
  // Display as card:
  // [Status Badge] Incident: [Type]
  // Status: [RESOLVED] Duration: 5 min 23 sec
  // Detected: [timestamp] (by Sentinel Agent)
  // Root Cause: [reason]
  // Agent Action: [action]
  // 
  // Timeline (micro-events):
  // ⚠️  12:15:30 Anomaly detected
  // 🤖 12:15:45 Predicting: 87% chance escalation
  // 🔧 12:16:00 Action: Increase pool size
  // ✅ 12:20:53 Service recovered
  // 
  // Buttons: [View Full Logs] [View Agent Learning] [Expand]
  // Hover: Show full timeline
}
```

---

### 5. **AgentReasoningPanel Component**

```typescript
interface AgentReasoningPanelProps {
  incidentId: string;
  timestamp: Date;
  detectedMetrics: {
    name: string;
    before: number;
    after: number;
    percentChange: number;
  }[];
  predictionConfidence: number;
  decisionTree: DecisionNode[];
  actionTaken: string;
  expectedOutcome: string;
  onApprove: (incidentId: string) => void;
  onReject: (incidentId: string) => void;
  onLearn: (incidentId: string) => void;
}

export function AgentReasoningPanel(props: AgentReasoningPanelProps) {
  // Display as expandable panel:
  // Latest Agent Decision
  // Timestamp: [time]
  // 
  // Detected Metrics:
  // • Response time: 450ms → 1200ms (+167%)
  // • Error rate: 0.1% → 3.5% (+3400%)
  // • Request queue: 150 → 800 (+433%)
  // 
  // Prediction: 91% confidence of service failure within 2m
  // 
  // Decision Tree (tree visualization or expandable):
  // ├─ Is CPU > 80%? YES → Scale resources
  // ├─ Is DB connection pool < 50%? YES → Increase pool
  // └─ Is memory leak suspected? MAYBE → Monitor closely
  // 
  // Action Taken: Scale from 2→4 instances
  // Confidence: 94%
  // Expected outcome: Recovery in 30-45s
  // 
  // [Approve] [Reject] [Learn from this]
}
```

---

## 🧩 REUSABLE COMPONENTS

### Common Components to Build

```typescript
// components/common/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// components/common/Card.tsx
interface CardProps {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  hover?: boolean;
}

// components/common/StatusBadge.tsx
interface StatusBadgeProps {
  status: 'healthy' | 'degraded' | 'down' | 'resolved' | 'in-progress' | 'failed';
  size?: 'sm' | 'md' | 'lg';
}

// components/common/Modal.tsx
interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// components/common/Sparkline.tsx
interface SparklineProps {
  data: number[];
  height?: number;
  width?: number;
  color?: string;
}

// components/common/LoadingSpinner.tsx
// components/common/ErrorBoundary.tsx
// components/common/Table.tsx
```

---

## 🎣 CUSTOM HOOKS

### useMetrics

```typescript
export function useMetrics(serviceId?: string, timeRange: '1h' | '6h' | '24h' = '1h') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch initial metrics from /api/metrics
    // Subscribe to real-time updates (WebSocket or polling)
    // Update state on new data
  }, [serviceId, timeRange]);

  return { data, loading, error };
}
```

### useIncidents

```typescript
export function useIncidents(filters?: IncidentFilter) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch incidents from /api/incidents with filters
    // Listen for real-time incident updates
  }, [filters]);

  return { incidents, loading };
}
```

### useWebSocket

```typescript
export function useWebSocket(url: string) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    // Connect to WebSocket
    // On message: update data
    // On error: fallback to polling
    // On close: attempt reconnect
  }, [url]);

  return { data, status };
}
```

---

## 📊 MOCK DATA STRUCTURE

```typescript
// lib/mockData.ts

export const mockServices = [
  {
    id: 'api-server',
    name: 'API Server',
    status: 'healthy',
    uptime: 99.8,
    latency: 45,
    resources: { cpu: 32, memory: 64, disk: 12 },
    recentIncidents: 0,
  },
  // ... more services
];

export const mockIncidents = [
  {
    id: 'inc-001',
    type: 'Database Connection Pool Exhaustion',
    service: 'api-server',
    status: 'resolved',
    severity: 'critical',
    detectedAt: new Date('2025-12-10T12:15:30Z'),
    resolvedAt: new Date('2025-12-10T12:20:53Z'),
    agentPredictionConfidence: 87,
    agentAction: 'Increased pool size from 50→100',
    rootCause: 'Query timeout spike detected',
    timeline: [
      { time: '12:15:30', event: 'Anomaly detected', icon: '⚠️' },
      { time: '12:15:45', event: 'Predicting: 87% chance escalation', icon: '🤖' },
      { time: '12:16:00', event: 'Action: Increase pool size', icon: '🔧' },
      { time: '12:20:53', event: 'Service recovered', icon: '✅' },
    ],
  },
  // ... more incidents
];

export const mockMetrics = {
  responseTime: [...],
  errorRate: [...],
  cpuUsage: [...],
  // ...
};
```

---

## 🌐 ENVIRONMENT VARIABLES

```bash
# .env.local

# Backend
NEXT_PUBLIC_KESTRA_API_URL=http://localhost:8080
NEXT_PUBLIC_METRICS_API_URL=http://localhost:3001

# WebSocket
NEXT_PUBLIC_WS_URL=ws://localhost:3000/api/stream

# Demo mode (for hackathon)
NEXT_PUBLIC_DEMO_MODE=true

# Feature flags
NEXT_PUBLIC_ENABLE_REAL_TIME=false  # Set to true when Kestra ready
```

---

## 📈 PERFORMANCE CHECKLIST

- [ ] Code splitting enabled (Next.js automatic)
- [ ] Images optimized (use `next/image`)
- [ ] Lazy load components (React.lazy)
- [ ] Debounce search/filter inputs
- [ ] Memoize expensive computations (useMemo, useCallback)
- [ ] Minimize WebSocket payload size
- [ ] Implement virtual scrolling for long lists
- [ ] Bundle size < 200KB (gzipped)
- [ ] Lighthouse score > 80
- [ ] First Contentful Paint < 2s

---

## 🔐 SECURITY CHECKLIST

- [ ] No hardcoded API keys (use environment variables)
- [ ] Sanitize user inputs
- [ ] Use `next/image` for image optimization
- [ ] Implement CSRF protection (if backend supports)
- [ ] No localStorage for sensitive data (use secure cookies)
- [ ] Validate API responses
- [ ] Implement rate limiting (client-side)
- [ ] Use Content Security Policy headers

---

## ♿ ACCESSIBILITY CHECKLIST

- [ ] Semantic HTML (`<header>`, `<nav>`, `<main>`, `<section>`)
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus indicators visible
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Alt text on images
- [ ] Form labels associated with inputs
- [ ] Error messages clear and actionable
- [ ] Skip navigation link
- [ ] Mobile touch targets ≥ 44×44px

---

## 🧪 TESTING STRATEGY

```typescript
// Example: components/__tests__/HealthSummary.test.tsx

import { render, screen } from '@testing-library/react';
import { HealthSummary } from '@/components/dashboard/HealthSummary';

describe('HealthSummary', () => {
  it('renders health metrics correctly', () => {
    render(
      <HealthSummary
        uptime={98.5}
        servicesUp={12}
        totalServices={12}
        activeIncidents={0}
        autoFixedCount24h={2}
      />
    );
    
    expect(screen.getByText('98.5%')).toBeInTheDocument();
    expect(screen.getByText('12/12')).toBeInTheDocument();
  });
});
```

---

## 🚢 DEPLOYMENT CHECKLIST

- [ ] Build passes: `npm run build`
- [ ] No console errors/warnings
- [ ] All pages responsive (tested on mobile, tablet, desktop)
- [ ] Demo works (replay incident scenario)
- [ ] README complete with setup instructions
- [ ] GitHub repo public with clean commits
- [ ] Environment variables configured on Vercel
- [ ] API endpoints connected (or mocked)
- [ ] Analytics page shows data
- [ ] WebSocket fallback works
- [ ] Dark mode works
- [ ] No sensitive data exposed

---

## 💡 QUICK TIPS FOR DEVELOPMENT

1. **Use Next.js Image:** Always use `next/image` for optimized images
   ```typescript
   import Image from 'next/image';
   <Image src="/logo.svg" alt="Logo" width={40} height={40} />
   ```

2. **Tailwind for Everything:** No additional CSS files needed
   ```typescript
   <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-4 rounded-lg">
   ```

3. **Reuse Components:** Create a component library
   ```typescript
   <Button variant="primary" size="lg">Get Started</Button>
   <Card title="Services"><ServiceGrid /></Card>
   ```

4. **Mock Data Everywhere:** Until Kestra API is ready
   ```typescript
   import { mockIncidents } from '@/lib/mockData';
   const incidents = process.env.NEXT_PUBLIC_DEMO_MODE ? mockIncidents : apiIncidents;
   ```

5. **Error Boundaries:** Wrap pages with error handling
   ```typescript
   <ErrorBoundary>
     <DashboardPage />
   </ErrorBoundary>
   ```

6. **Real-time Updates:** Use WebSocket with polling fallback
   ```typescript
   const { data } = useWebSocket(wsUrl) || useFallbackPolling(apiUrl);
   ```

---

## 📚 REFERENCES

- Next.js Docs: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs
- Recharts: https://recharts.org/
- React Hooks: https://react.dev/reference/react/hooks
- TypeScript: https://www.typescriptlang.org/docs/

---

## 🎯 SUCCESS CRITERIA

✅ All pages built and linked  
✅ Components reusable and well-organized  
✅ Real-time updates working (mock or real)  
✅ Mobile responsive  
✅ Dark theme consistent  
✅ Demo scenario replays perfectly  
✅ No console errors  
✅ Deployed to Vercel  
✅ README complete  

---

**Ready to build? Use this doc in Cursor/Cline with:** 
```
@document sentinel-frontend-toon.md
```

**Then prompt:**
```
Build the entire Next.js frontend for Sentinel following the specifications in this document. Start with Day 1 tasks. Generate all necessary files with complete, working code.
```

Good luck! 🚀
