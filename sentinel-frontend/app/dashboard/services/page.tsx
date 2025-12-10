import { ServiceGrid } from "@/components/dashboard/ServiceGrid";
import { mockServices } from "@/lib/mockData";
import { Button } from "@/components/common/Button";
import { Plus } from "lucide-react";

export default function ServicesPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Services</h1>
                    <p className="text-muted-foreground">Manage and monitor your microservices.</p>
                </div>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Add Service
                </Button>
            </div>

            <ServiceGrid services={mockServices} />
        </div>
    );
}
