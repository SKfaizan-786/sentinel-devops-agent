export interface Service {
    id: string;
    name: string;
    type: "api" | "database" | "worker" | "cache";
    status: "healthy" | "degraded" | "down";
    uptime: number;
    latency: number;
    cpu: number;
    memory: number;
    trend: number[];
    description?: string;
}

export interface IncidentEvent {
    time: string;
    event: string;
    icon: string;
}

export interface Incident {
    id: string;
    title: string;
    serviceId: string;
    status: "resolved" | "in-progress" | "failed";
    severity: "critical" | "warning" | "info";
    timestamp: string;
    duration: string;
    rootCause: string;
    agentAction: string;
    agentPredictionConfidence: number;
    timeline: IncidentEvent[];
    logs?: string[];
    reasoning?: string;
    affectedServices?: string[];
}

//
// ✅ SERVICES (added search + database so ALL incidents resolve)
//

export const mockServices: Service[] = [
    {
        id: "api-gateway",
        name: "API Gateway",
        type: "api",
        status: "healthy",
        uptime: 99.99,
        latency: 45,
        cpu: 12,
        memory: 45,
        trend: [40,42,45,48,45,42,40,38,42,45,45,42],
    },
    {
        id: "auth-service",
        name: "Auth Service",
        type: "api",
        status: "healthy",
        uptime: 99.95,
        latency: 28,
        cpu: 15,
        memory: 30,
        trend: [25,28,30,28,25,22,25,28,30,28,28,25],
    },
    {
        id: "payment-service",
        name: "Payment Service",
        type: "worker",
        status: "healthy",
        uptime: 99.9,
        latency: 85,
        cpu: 22,
        memory: 40,
        trend: [60,65,70,65,60,55,60,65,70,65,65,60],
    },
    {
        id: "notification-service",
        name: "Notification Service",
        type: "api",
        status: "healthy",
        uptime: 99.9,
        latency: 120,
        cpu: 48,
        memory: 55,
        trend: [100,110,120,115,110,105,110,115,120,115,115,110],
    },

    // ✅ ADDED missing services to avoid UI crashes

    {
        id: "search-service",
        name: "Search Service",
        type: "api",
        status: "healthy",
        uptime: 99.7,
        latency: 90,
        cpu: 35,
        memory: 60,
        trend: [80,85,90,92,95,100,95,90,88,85],
    },

    {
        id: "database-service",
        name: "Database",
        type: "database",
        status: "healthy",
        uptime: 99.98,
        latency: 12,
        cpu: 30,
        memory: 55,
        trend: [20,25,30,32,35,38,36,34,30],
    },
];

//
// ✅ INCIDENTS (ALL VALID SERVICE IDS)
//

export const mockIncidents: Incident[] = [

{
    id: "inc-network-recovered",
    title: "Gateway Network Instability (Recovered)",
    serviceId: "api-gateway",
    status: "resolved",
    severity: "warning",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    duration: "1h 30m",
    rootCause: "Intermittent packet loss between edge and gateway",
    agentAction: "Rerouted traffic and reset flaky node",
    agentPredictionConfidence: 94,
    timeline: [
        { time: "11:00:00", event: "Packet loss spike detected", icon: "📡" },
        { time: "11:25:00", event: "Retries increasing", icon: "⚠️" },
        { time: "11:50:00", event: "Traffic rerouted", icon: "🤖" },
        { time: "12:30:00", event: "Network stabilized", icon: "✅" },
    ]
},

{
    id: "inc-cascade",
    title: "Payment API Cascade Failure",
    serviceId: "payment-service",
    status: "in-progress",
    severity: "critical",
    timestamp: new Date(Date.now()-1000*60*10).toISOString(),
    duration: "Ongoing",
    rootCause: "Database timeout triggered downstream cache failure",
    agentAction: "Restarting DB connection pool and clearing cache",
    agentPredictionConfidence: 92,
    timeline: [
        {time:"10:01:10",event:"Payment API slowing",icon:"⚠️"},
        {time:"10:02:40",event:"Database timeout detected",icon:"🗄️"},
        {time:"10:03:10",event:"Cache miss storm triggered",icon:"💥"},
        {time:"10:04:00",event:"Recovery workflow started",icon:"🤖"},
    ]
},

{
    id:"inc-memory",
    title:"Notification Service Memory Leak",
    serviceId:"notification-service",
    status:"resolved",
    severity:"warning",
    timestamp:new Date(Date.now()-1000*60*120).toISOString(),
    duration:"1h 35m",
    rootCause:"Unreleased message queue buffers",
    agentAction:"Restarted container and applied memory cap",
    agentPredictionConfidence:96,
    timeline:[
        {time:"12:00:00",event:"Memory rising",icon:"📈"},
        {time:"12:40:00",event:"Memory >85%",icon:"⚠️"},
        {time:"13:10:00",event:"Leak pattern detected",icon:"🤖"},
        {time:"13:35:00",event:"Container restarted",icon:"🔄"},
        {time:"13:36:30",event:"Service stabilized",icon:"✅"},
    ]
},

{
    id:"inc-cpu",
    title:"Worker CPU Contention",
    serviceId:"payment-service",
    status:"in-progress",
    severity:"warning",
    timestamp:new Date(Date.now()-1000*60*180).toISOString(),
    duration:"3h",
    rootCause:"Batch job overload",
    agentAction:"Scaling workers + throttling queue",
    agentPredictionConfidence:85,
    timeline:[
        {time:"08:10:00",event:"CPU sustained at 85%",icon:"🔥"},
        {time:"08:45:00",event:"Queue backlog rising",icon:"📊"},
        {time:"09:20:00",event:"Auto-throttle applied",icon:"🤖"},
    ]
},

{
    id:"inc-sync",
    title:"API Sync Timeout Between Auth & Gateway",
    serviceId:"api-gateway",
    status:"in-progress",
    severity:"warning",
    timestamp:new Date(Date.now()-1000*60*20).toISOString(),
    duration:"20m",
    rootCause:"Slow token validation",
    agentAction:"Restarted auth cache",
    agentPredictionConfidence:90,
    timeline:[
        {time:"09:40:00",event:"Gateway timeout spike",icon:"⏳"},
        {time:"09:42:30",event:"Auth latency rising",icon:"⚠️"},
        {time:"09:45:00",event:"Cache restarted",icon:"🔄"},
    ]
},

{
    id:"inc-search",
    title:"Search Service Outage",
    serviceId:"search-service",
    status:"failed",
    severity:"critical",
    timestamp:new Date(Date.now()-1000*60*45).toISOString(),
    duration:"15m",
    rootCause:"Elasticsearch heap OOM",
    agentAction:"Restart failed → escalated",
    agentPredictionConfidence:95,
    timeline:[
        {time:"14:20:10",event:"Service unresponsive",icon:"🔴"},
        {time:"14:20:15",event:"Soft restart attempted",icon:"🔧"},
        {time:"14:22:00",event:"Escalated to human",icon:"❌"},
    ]
},

{
    id:"inc-auth",
    title:"Auth Token Expiry Spike",
    serviceId:"auth-service",
    status:"resolved",
    severity:"info",
    timestamp:new Date(Date.now()-1000*60*120).toISOString(),
    duration:"5m",
    rootCause:"Clock drift",
    agentAction:"Synced NTP",
    agentPredictionConfidence:99,
    timeline:[
        {time:"12:15:30",event:"Token errors spike",icon:"⚠️"},
        {time:"12:15:45",event:"Clock drift detected",icon:"🔍"},
        {time:"12:16:00",event:"NTP synced",icon:"🔧"},
        {time:"12:20:50",event:"Recovered",icon:"✅"},
    ]
},
];

//
// ✅ METRICS AUTO-CALCULATED
//

export const mockMetrics = {
    totalServices: mockServices.length,
    servicesUp: mockServices.length,
    activeIncidents: mockIncidents.filter(i=>i.status==="in-progress").length,
    uptime: 99.4,
};