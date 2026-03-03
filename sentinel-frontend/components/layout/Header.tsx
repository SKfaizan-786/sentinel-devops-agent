"use client";

import Link from "next/link";
import { Button } from "@/components/common/Button";
import { SentinelLogo } from "@/components/common/SentinelLogo";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useWebSocketContext } from "@/lib/WebSocketContext";
import { Wifi, WifiOff, Info, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("#features");
  const { isConnected } = useWebSocketContext();
  const modalRef = useRef<HTMLDivElement>(null);

  /* ================= Scroll Spy ================= */

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const sections = ["#features", "#how-it-works"];
      for (let id of sections) {
        const el = document.querySelector(id);
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        if (rect.top <= 120 && rect.bottom >= 120) {
          setActive(id);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ================= Modal Close ================= */

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAboutOpen(false);
    };
    if (aboutOpen) window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aboutOpen]);

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setAboutOpen(false);
    }
  };

  const navItems = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#faqs", label: "FAQs" },
    { href: "/demo", label: "Live Demo" },
    { href: "/contributors", label: "Contributors" },
  ];

  return (
    <>
      {/* ================= NAVBAR ================= */}

      <header className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4">
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={cn(
            "w-full max-w-7xl rounded-2xl transition-all duration-500 relative",
            scrolled
              ? "bg-black/70 backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(0,255,255,0.1)]"
              : "bg-black/40 backdrop-blur-xl border border-white/5"
          )}
        >
          {/* Animated Gradient Border */}
          <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-20 blur-sm" />

          <div className="relative px-6 py-3 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <SentinelLogo size={30} />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Sentinel
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 relative">
              {navItems.map((item) => (
                <motion.div
                  key={item.href}
                  whileHover={{ scale: 1.08 }}
                  className="relative"
                >
                  <Link
                    href={item.href}
                    onClick={() => setActive(item.href)}
                    className="relative text-sm font-medium px-3 py-2"
                  >
                    <span
                      className={cn(
                        "relative z-10 transition-colors duration-300",
                        active === item.href
                          ? "text-white"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      {item.label}
                    </span>

                    {active === item.href && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30"
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      />
                    )}
                  </Link>
                </motion.div>
              ))}

              <button
                onClick={() => setAboutOpen(true)}
                className="text-zinc-400 hover:text-cyan-400 transition flex items-center gap-1"
              >
                <Info className="h-4 w-4" />
                About
              </button>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Status */}
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                  isConnected
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(0,255,100,0.4)]"
                    : "bg-red-500/10 text-red-400"
                )}
              >
                {isConnected ? (
                  <Wifi className="h-3 w-3 animate-pulse" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">
                  {isConnected ? "Online" : "Offline"}
                </span>
              </div>

              <Link
                href="/login"
                className="hidden md:block text-sm text-zinc-400 hover:text-white transition"
              >
                Login
              </Link>

              <Link href="/dashboard">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white shadow-lg hover:scale-105 transition-all duration-300"
                >
                  Dashboard
                </Button>
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden text-zinc-400"
              >
                {mobileOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </motion.div>
      </header>

      {/* ================= MOBILE MENU ================= */}

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-4 right-4 z-40 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-6 space-y-4 md:hidden"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block text-zinc-300 hover:text-cyan-400"
              >
                {item.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= ELITE MODAL ================= */}

      {aboutOpen && (
        <div
          onClick={handleOutsideClick}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-xl px-4"
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-black via-zinc-900 to-black shadow-[0_0_50px_rgba(0,255,255,0.15)] p-8"
          >
            <button
              onClick={() => setAboutOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-cyan-400"
            >
              ✕
            </button>

            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent mb-6">
              About <span className="text-pink-300">Sentinel</span>
            </h2>

            <p className="text-zinc-300 mb-6">
              <span className="font-bold text-pink-200">Sentinel</span> is an autonomous AI-powered DevOps agent built to transform infrastructure management from reactive troubleshooting to proactive, self-healing automation.<br /><br />
              Traditional monitoring systems notify engineers after a failure occurs. Teams then manually inspect logs, analyze metrics, determine the root cause, and apply fixes — a process that can take valuable time and increase downtime.<br /><br />
              Sentinel removes this delay by continuously monitoring services, detecting anomalies instantly, performing AI-driven root cause analysis, and automatically executing recovery workflows within seconds.
            </p>

            {/* How Sentinel Works */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg text-pink-200 mb-2 flex items-center gap-2">
                <span className="inline-block">⚙️</span> How Sentinel Works
              </h3>
              <ol className="list-decimal list-inside text-zinc-200 space-y-1 pl-4">
                <li>5-second continuous service monitoring</li>
                <li>AI-powered log &amp; metric analysis <span className="text-xs text-zinc-400">(LLaMA 3.3-70B)</span></li>
                <li>Intelligent root cause identification</li>
                <li>30-second automated recovery via Kestra</li>
                <li>Transparent reasoning &amp; full incident timeline</li>
              </ol>
            </div>

            {/* Core Capabilities */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg text-pink-200 mb-2 flex items-center gap-2">
                <span className="inline-block">🚀</span> Core Capabilities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-zinc-200 text-sm">
                <div>Autonomous 24/7 monitoring</div>
                <div>Predictive anomaly detection</div>
                <div>AI-driven root cause analysis</div>
                <div>Automated incident recovery</div>
                <div>Multi-service monitoring</div>
                <div>Docker orchestration support</div>
                <div>PostgreSQL state tracking</div>
                <div>Scalable microservice architecture</div>
              </div>
            </div>

            {/* Hackathon Achievement */}
            <div className="mt-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
              <p className="font-semibold text-yellow-400 mb-2">
                🏆 Hackathon Achievement
              </p>
              <p className="text-yellow-200 text-xs mb-1">
                Featured Project at <strong>WeMakeDevs AI Agents Assemble</strong><br />
                6,000+ teams • 20+ countries • $15,000 prize pool
              </p>
              <a
                href="https://apertre.resourcio.in/projects"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-yellow-300 underline hover:text-yellow-200"
              >
                View on Apertre 3.0 →
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}