'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ContributorCard } from '@/components/contributors/ContributorCard';
import { RefreshCw, Users, Github, AlertCircle } from 'lucide-react';

interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

export default function ContributorsPage() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const GITHUB_OWNER = 'SKfaizan-786';
  const GITHUB_REPO = 'sentinel-devops-agent';
  // Auto-refresh every 30 minutes
  const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000;

  /**
   * Fetch contributors from GitHub API
   */
  const fetchContributors = async (isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) {
        setLoading(true);
      }
      setIsRefreshing(true);
      setError(null);

      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contributors?per_page=100&sort=contributions`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            // Add GitHub token from env if available (to increase rate limit)
            ...(process.env.NEXT_PUBLIC_GITHUB_TOKEN && {
              'Authorization': `token ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`,
            }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch contributors: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      const formattedContributors: Contributor[] = data.map(
        (contributor: any) => ({
          login: contributor.login,
          avatar_url: contributor.avatar_url,
          html_url: contributor.html_url,
          contributions: contributor.contributions,
        })
      );

      setContributors(formattedContributors);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching contributors:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch contributors'
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Initial fetch and auto-refresh setup
   */
  useEffect(() => {
    fetchContributors();

    // Set up auto-refresh interval
    const intervalId = setInterval(() => {
      fetchContributors(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);

  /**
   * Format last updated time
   */
  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200 px-6 py-16">
      {/* Back to Home Button */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-start">
        <Link
          href="/"
          className="inline-block px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow transition-colors duration-200"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className="w-10 h-10 text-cyan-400" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent">
              Contributors
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto"
          >
            Meet the amazing people who make Sentinel DevOps Agent possible.
            Real-time contributor data from our GitHub repository.
          </motion.p>
        </motion.div>

        {/* Stats and Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl 
                     bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-slate-300">
              {contributors.length} Contributors
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              Last updated: <span className="text-cyan-400 font-semibold">{formatLastUpdated(lastUpdated)}</span>
            </span>

            <button
              onClick={() => fetchContributors()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg 
                       bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed
                       text-white font-semibold transition-all duration-300
                       shadow hover:shadow-cyan-500/20"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            <Link
              href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg 
                       bg-slate-700 hover:bg-slate-600 text-white font-semibold 
                       transition-all duration-300 shadow hover:shadow-slate-700/50"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse p-6 rounded-2xl bg-slate-800/50 
                          border border-slate-700/50 h-64"
              >
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-slate-700/50"></div>
                  <div className="h-4 bg-slate-700/50 rounded mx-auto w-24"></div>
                  <div className="h-3 bg-slate-700/50 rounded mx-auto w-20"></div>
                  <div className="h-8 bg-slate-700/50 rounded mx-auto w-28 mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto p-6 rounded-xl bg-red-950/30 border border-red-900/50 backdrop-blur-sm"
        >
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-red-300 mb-2">
                Failed to Load Contributors
              </h3>
              <p className="text-red-200 mb-4">{error}</p>
              <button
                onClick={() => fetchContributors()}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 
                         text-white font-semibold transition-colors duration-300"
              >
                Try Again
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Contributors Grid */}
      {!loading && !error && contributors.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
          className="max-w-7xl mx-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {contributors.map((contributor, index) => (
              <ContributorCard
                key={contributor.login}
                {...contributor}
                index={index}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && !error && contributors.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl mx-auto text-center py-16"
        >
          <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-300 mb-2">
            No Contributors Found
          </h3>
          <p className="text-slate-400">
            Unable to fetch contributors at this time. Please try again later.
          </p>
        </motion.div>
      )}

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-7xl mx-auto mt-20 text-center text-sm text-slate-400"
      >
        <p>
          This page automatically updates every 30 minutes with the latest contributor
          data from{' '}
          <Link
            href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline transition-colors"
          >
            GitHub
          </Link>
          .
        </p>
      </motion.div>
    </div>
  );
}
