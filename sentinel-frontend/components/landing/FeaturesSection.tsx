"use client";

import { motion } from "framer-motion";
import { Brain, Zap, Shield, Eye } from "lucide-react";
import { Spotlight } from "@/components/common/Spotlight";

const features = [
    {
        icon: Eye,
        title: "24/7 Monitoring",
        description: "Sentinel never sleeps. It monitors your entire stack in real-time, detecting anomalies instantly.",
        color: "text-blue-400",
    },
    {
        icon: Brain,
        title: "Predictive Intelligence",
        description: "Uses advanced ML to predict failures before they happen, alerting you to potential risks.",
        color: "text-purple-400",
    },
    {
        icon: Zap,
        title: "Autonomous Healing",
        description: "Automatically fixes common issues like memory leaks, connection pools, and scaling.",
        color: "text-yellow-400",
    },
    {
        icon: Shield,
        title: "Transparent Decisions",
        description: "Every action is logged with a full decision tree, so you know exactly why Sentinel acted.",
        color: "text-green-400",
    },
];

export function FeaturesSection() {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="container px-4 md:px-6 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                        The AI that <span className="text-gradient-primary">prevents outages</span>
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Sentinel replaces reactive fire-fighting with proactive intelligence.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <Spotlight className="h-full p-8 flex flex-col items-start bg-white/5 border-white/5 hover:border-primary/20 transition-colors">
                                <div className={`p-3 rounded-lg bg-white/5 w-fit mb-6 group-hover:scale-110 transition-transform ${feature.color}`}>
                                    <feature.icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    {feature.description}
                                </p>
                            </Spotlight>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
