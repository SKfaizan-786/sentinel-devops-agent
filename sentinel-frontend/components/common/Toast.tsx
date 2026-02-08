"use client";

import { useEffect, useState } from "react";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

export type ToastType = "info" | "success" | "warning" | "error" | "incident";

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  onDismiss: (id: string) => void;
  duration?: number;
}

const icons = {
  info: <Info className="w-5 h-5 text-blue-400" />,
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  incident: <span className="relative flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
  </span>,
};

const styles = {
  info: "bg-blue-500/10 border-blue-500/20 text-blue-100",
  success: "bg-green-500/10 border-green-500/20 text-green-100",
  warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-100",
  error: "bg-red-500/10 border-red-500/20 text-red-100",
  incident: "bg-red-950/40 border-red-500/50 text-red-50 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
};

export function Toast({ id, type, title, message, onDismiss, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(id), 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onDismiss]);

  return (
    <div
      className={`
        relative w-full max-w-sm p-4 mb-3 rounded-lg border backdrop-blur-md shadow-lg transition-all duration-300 ease-in-out
        ${styles[type]}
        ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icons[type]}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm leading-none mb-1">{title}</h4>
          <p className="text-xs opacity-90 leading-relaxed">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onDismiss(id), 300);
          }}
          className="shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Progress bar for auto-dismiss */}
      <div className="absolute bottom-0 left-0 h-1 bg-white/20 rounded-b-lg w-full overflow-hidden">
        <div 
          className="h-full bg-current opacity-50 origin-left animate-progress"
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>

      <style jsx>{`
        @keyframes progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
        .animate-progress {
          animation-name: progress;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
}
