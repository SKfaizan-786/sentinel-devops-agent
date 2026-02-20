
"use client";

import Link from "next/link";
import { Button } from "@/components/common/Button";
import { SentinelLogo } from "@/components/common/SentinelLogo";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useWebSocketContext } from "@/lib/WebSocketContext";
import { Wifi, WifiOff, Info } from "lucide-react";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const { isConnected } = useWebSocketContext();
  const modalRef = useRef<HTMLDivElement>(null);

  // Scroll Effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ESC key close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAboutOpen(false);
    };
    if (aboutOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [aboutOpen]);

  // Click outside close
  const handleOutsideClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setAboutOpen(false);
    }
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
          scrolled
            ? "bg-background/80 backdrop-blur-md border-white/10 py-3"
            : "bg-transparent py-5"
        )}
      >
        <div className="container px-4 md:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <SentinelLogo size={32} />
            <span>Sentinel</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="hover:text-primary transition-colors">
              How It Works
            </Link>
            <Link href="/demo" className="hover:text-primary transition-colors">
              Live Demo
            </Link>
            <button
              onClick={() => setAboutOpen(true)}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Info className="h-4 w-4" /> About
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                isConnected
                  ? "bg-green-500/10 text-green-500"
                  : "bg-red-500/10 text-red-500"
              )}
            >
              {isConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">
                {isConnected ? "Online" : "Offline"}
              </span>
            </div>

            <Link href="/login" className="hidden md:block text-sm font-medium hover:text-primary">
              Login
            </Link>

            <Link href="/dashboard">
              <Button size="sm" className="shadow-lg shadow-primary/20">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ================= ABOUT MODAL ================= */}

      {aboutOpen && (
        <div
          onClick={handleOutsideClick}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
        >
          <div
            ref={modalRef}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto 
            rounded-2xl border border-white/10 
            bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-black/90 
            shadow-2xl shadow-primary/20 p-8 animate-in fade-in zoom-in-95 duration-300"
          >
            {/* Close Button */}
            <button
              onClick={() => setAboutOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center 
              rounded-full bg-white/5 hover:bg-primary/20 text-muted-foreground 
              hover:text-primary transition-all"
            >
              ✕
            </button>

            {/* Title */}
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-primary via-purple-400 to-blue-400 bg-clip-text text-transparent mb-6">
              About Sentinel
            </h2>

            {/* Description */}
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong>Sentinel</strong> is an autonomous AI-powered DevOps agent
                built to transform infrastructure management from reactive
                troubleshooting to proactive, self-healing automation.
              </p>

              <p>
                Traditional monitoring systems notify engineers after a failure occurs.
                Teams then manually inspect logs, analyze metrics, determine the root cause,
                and apply fixes — a process that can take valuable time and increase downtime.
              </p>

              <p>
                Sentinel removes this delay by continuously monitoring services,
                detecting anomalies instantly, performing AI-driven root cause analysis,
                and automatically executing recovery workflows within seconds.
              </p>
            </div>

            {/* How It Works */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-primary mb-4">
                ⚙ How Sentinel Works
              </h3>

              <div className="space-y-3 text-sm text-muted-foreground">
                <p><strong>1.</strong> 5-second continuous service monitoring</p>
                <p><strong>2.</strong> AI-powered log & metric analysis (LLaMA 3.3-70B)</p>
                <p><strong>3.</strong> Intelligent root cause identification</p>
                <p><strong>4.</strong> 30-second automated recovery via Kestra</p>
                <p><strong>5.</strong> Transparent reasoning & full incident timeline</p>
              </div>
            </div>

            {/* Core Capabilities */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-primary mb-4">
                🚀 Core Capabilities
              </h3>

              <ul className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                <li>Autonomous 24/7 monitoring</li>
                <li>Predictive anomaly detection</li>
                <li>AI-driven root cause analysis</li>
                <li>Automated incident recovery</li>
                <li>Multi-service monitoring</li>
                <li>Docker orchestration support</li>
                <li>PostgreSQL state tracking</li>
                <li>Scalable microservice architecture</li>
              </ul>
            </div>

            {/* Hackathon */}
            <div className="mt-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
              <p className="font-semibold text-yellow-400 mb-2">
                🏆 Hackathon Achievement
              </p>
              <p className="text-muted-foreground text-xs">
                Featured Project at <strong>WeMakeDevs AI Agents Assemble</strong><br />
                6,000+ teams • 20+ countries • $15,000 prize pool
              </p>

              <a
                href="https://apertre.resourcio.in/projects"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-primary text-xs underline hover:text-primary/80"
              >
                View on Apertre 3.0 →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

