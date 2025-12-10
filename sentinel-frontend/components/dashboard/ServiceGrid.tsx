"use client";

import { Service } from "@/lib/mockData";
import { ServiceCard } from "./ServiceCard";
import { motion } from "framer-motion";

export function ServiceGrid({ services }: { services: Service[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {services.map((service, index) => (
                <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                    <ServiceCard service={service} />
                </motion.div>
            ))}
        </div>
    );
}
