"use client";

import Link from "next/link";
import { SentinelLogo } from "@/components/common/SentinelLogo";
import { Github, Twitter, Mail, ArrowUp, Activity, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";

const footerLinks = {
    product: [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Live Demo", href: "/demo" },
        { label: "Features", href: "/#features" },
        { label: "How It Works", href: "/#how-it-works" },
    ],
    company: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms & Conditions", href: "/terms" },
    ],
    highlights: [
        { icon: Zap, label: "<500ms Response" },
        { icon: ShieldCheck, label: "99.99% Uptime" },
        { icon: Activity, label: "24/7 Monitoring" },
    ],
};

const socialLinks = [
    { icon: Github, href: "https://github.com/SKfaizan-786/sentinel-devops-agent", label: "GitHub" },
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
    { icon: Mail, href: "mailto:contact@sentinel.ai", label: "Email" },
];

export function Footer() {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <footer className="relative border-t border-white/10 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            {/* Top gradient line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

            <div className="container px-4 md:px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand Column */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="space-y-4"
                    >
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                            <SentinelLogo size={28} />
                            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                                Sentinel
                            </span>
                        </Link>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Autonomous AI-powered DevOps agent. Predictive healing,
                            real-time monitoring, and self-recovery — always awake.
                        </p>

                        {/* Social Icons */}
                        <div className="flex gap-3 pt-2">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.label}
                                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all duration-300"
                                >
                                    <social.icon className="h-4 w-4" />
                                </a>
                            ))}
                        </div>
                    </motion.div>

                    {/* Product Links */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                            Product
                        </h3>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-zinc-400 hover:text-cyan-400 transition-colors duration-200"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Legal Links */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                            Legal
                        </h3>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-zinc-400 hover:text-cyan-400 transition-colors duration-200"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Highlights */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                            Why Sentinel
                        </h3>
                        <ul className="space-y-3">
                            {footerLinks.highlights.map((item) => (
                                <li key={item.label} className="flex items-center gap-2 text-sm text-zinc-400">
                                    <item.icon className="h-4 w-4 text-cyan-400/70" />
                                    {item.label}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 pt-8 border-t border-white/5">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-zinc-500">
                            © {new Date().getFullYear()} Sentinel AI. Built for the Future of DevOps.
                        </p>

                        <button
                            onClick={scrollToTop}
                            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-cyan-400 transition-colors duration-200 group"
                        >
                            Back to top
                            <ArrowUp className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
}
