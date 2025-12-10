import { HealthSummary } from "@/components/dashboard/HealthSummary";
import { ServiceGrid } from "@/components/dashboard/ServiceGrid";
import { mockMetrics, mockServices } from "@/lib/mockData";

export default function DashboardPage() {
    return (
        <div className="space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
                <p className="text-muted-foreground">Real-time overview of your system health and agent activities.</p>
            </div>

            <HealthSummary
                uptime={mockMetrics.uptime}
                servicesUp={mockMetrics.servicesUp}
                totalServices={mockMetrics.totalServices}
                activeIncidents={mockMetrics.activeIncidents}
            />

            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Monitored Services</h2>
                    <span className="text-sm text-muted-foreground">Last updated: Just now</span>
                </div>
                <ServiceGrid services={mockServices} />
            </div>
        </div>
    );
}
