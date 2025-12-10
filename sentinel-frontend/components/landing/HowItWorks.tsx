"use client";

import { motion } from "framer-motion";

const steps = [
    {
        number: "01",
        title: "Monitor",
        description: "Connects to your Kestra workflows and metrics store to watch every heartbeat.",
    },
    {
        number: "02",
        title: "Predict",
        description: "Analyzes patterns to forecast latency spikes, resource exhaustion, and errors.",
    },
    {
        number: "03",
        title: "Act",
        description: "Executes pre-approved healing workflows to resolve issues instantly.",
    },
    {
        number: "04",
        title: "Learn",
        description: "Learns from every incident to improve prediction accuracy over time.",
    },
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-24 bg-black/20 relative">
            <div className="container px-4 md:px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">How Sentinel Works</h2>
                    <p className="text-muted-foreground">From detection to resolution in seconds.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.2 }}
                            className="relative flex flex-col items-center text-center"
                        >
                            <div className="w-24 h-24 rounded-full glass flex items-center justify-center text-3xl font-bold text-primary mb-6 border border-primary/30 z-10 bg-[#0F172A]">
                                {step.number}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                            <p className="text-muted-foreground text-sm max-w-[200px]">{step.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
