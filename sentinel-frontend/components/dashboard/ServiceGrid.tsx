"use client";

import React, { memo } from "react";
import { Service } from "@/lib/mockData";
import { ServiceCard } from "./ServiceCard";
import { motion } from "framer-motion";
import { usePredictions } from "@/hooks/usePredictions";
import { Globe, Server } from "lucide-react";

interface ServiceGridProps {
    services: Service[];
    groupBy?: 'none' | 'cluster' | 'region';
}

interface GroupedServices {
    [key: string]: {
        name: string;
        services: Service[];
    };
}

export function ServiceGrid({ services, groupBy = 'none' }: ServiceGridProps) {
    const predictionsMap = usePredictions();
    const predictions = Object.values(predictionsMap);

    const getPrediction = (service: Service) => {
        return predictions.find(p => {
            const name = (p.containerName || '').toLowerCase();
            const serviceId = service.id.toLowerCase();

            // Prioritize strict equality on ID
            if (name === serviceId) return true;

            // Safe fallback: match only if the container name *starts with* the service name followed by a delimiter
            if (name === service.name.toLowerCase().replace(/ /g, '-')) return true;

            return false;
        });
    };

    // Group services by cluster or region
    const groupServices = (): GroupedServices => {
        if (groupBy === 'none') {
            return { 'all': { name: 'All Services', services } };
        }

        const grouped: GroupedServices = {};
        
        for (const service of services) {
            let groupKey: string;
            let groupName: string;

            if (groupBy === 'cluster') {
                groupKey = service.cluster || 'default';
                // Use consistent fallback: clusterName -> cluster -> key-based display name
                groupName = service.clusterName || service.cluster || (groupKey === 'default' ? 'Default Cluster' : groupKey);
            } else {
                groupKey = service.region || 'default';
                // Use consistent fallback: region value or key-based display name
                groupName = service.region || (groupKey === 'default' ? 'Default Region' : groupKey);
            }

            if (!grouped[groupKey]) {
                grouped[groupKey] = { name: groupName, services: [] };
            }
            grouped[groupKey].services.push(service);
        }

        return grouped;
    };

    const groupedServices = groupServices();
    const groups = Object.entries(groupedServices);
    const showGroupHeaders = groupBy !== 'none' && groups.length > 1;

    // Render flat grid for single group or no grouping
    if (!showGroupHeaders) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {services.map((service, index) => (
                    <motion.div
                        key={service.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                        <ServiceCard service={service} prediction={getPrediction(service)} />
                    </motion.div>
                ))}
            </div>
        );
    }

    // Render grouped services with headers
    return (
        <div className="space-y-8">
            {groups.map(([groupKey, group]) => (
                <div key={groupKey} className="space-y-4">
                    {/* Group Header */}
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                        {groupBy === 'cluster' ? (
                            <Server className="h-5 w-5 text-primary" />
                        ) : (
                            <Globe className="h-5 w-5 text-primary" />
                        )}
                        <h3 className="text-lg font-semibold text-foreground">
                            {group.name}
                        </h3>
                        <span className="text-sm text-muted-foreground">
                            ({group.services.length} services)
                        </span>
                    </div>

                    {/* Services Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {group.services.map((service, index) => (
                            <motion.div
                                key={service.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <ServiceCard service={service} prediction={getPrediction(service)} />
                            </motion.div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
});

ServiceGrid.displayName = "ServiceGrid";
