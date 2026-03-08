'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Github } from 'lucide-react';

interface ContributorCardProps {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  index: number;
}

/**
 * Individual contributor card component
 */
export function ContributorCard({
  login,
  avatar_url,
  html_url,
  contributions,
  index,
}: ContributorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      viewport={{ once: true }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative h-full"
    >
      <Link href={html_url} target="_blank" rel="noopener noreferrer">
        <div className="relative h-full p-6 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 
                        border border-slate-700/50 backdrop-blur-sm
                        hover:border-cyan-500/50 transition-all duration-300
                        shadow-lg hover:shadow-cyan-500/20 overflow-hidden">
          
          {/* Background glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/0 via-indigo-500/0 to-cyan-500/0 
                          group-hover:from-cyan-500/10 group-hover:via-indigo-500/10 group-hover:to-cyan-500/10 
                          transition-all duration-500"></div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            {/* Avatar */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="relative"
            >
              <img
                src={avatar_url}
                alt={login}
                className="w-20 h-20 rounded-full border-2 border-cyan-500/50 
                           group-hover:border-cyan-400 transition-colors duration-300
                           shadow-lg"
              />
              <div className="absolute -bottom-1 -right-1 bg-cyan-500 rounded-full p-2">
                <Github className="w-4 h-4 text-white" />
              </div>
            </motion.div>

            {/* Username */}
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 
                           transition-colors duration-300">
                {login}
              </h3>
              <p className="text-sm text-cyan-400 mt-1 flex items-center justify-center gap-1">
                <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full"></span>
                {contributions} {contributions === 1 ? 'contribution' : 'contributions'}
              </p>
            </div>

            {/* View Profile Badge */}
            <div className="pt-2">
              <span className="inline-block px-3 py-1 text-xs font-semibold 
                             bg-cyan-500/20 text-cyan-300 rounded-full
                             group-hover:bg-cyan-500/40 transition-colors duration-300">
                View Profile →
              </span>
            </div>

            {/* Stats Bar */}
            <div className="w-full pt-2 mt-2 border-t border-slate-700/50">
              <div className="flex justify-center items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-cyan-400">{contributions}</span>
                <span>contributions</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
