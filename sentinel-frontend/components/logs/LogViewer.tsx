'use client';

import { useState } from 'react';
import { Download, Pause, Play, Search, Trash2, Filter } from 'lucide-react';
import { useLogs, LogLevel } from '@/hooks/useLogs';
import { LogExportModal } from './LogExportModal';

export function LogViewer() {
  const {
    logs,
    isPaused,
    setIsPaused,
    filterLevel,
    setFilterLevel,
    search,
    setSearch,
    clearLogs
  } = useLogs();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'warn':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'success':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'debug':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-sm font-medium"
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white text-sm font-medium"
          >
            <Download size={16} />
            Export
          </button>

          <button
            onClick={clearLogs}
            className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors text-red-400 text-sm font-medium"
          >
            <Trash2 size={16} />
            Clear
          </button>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none text-sm"
            />
          </div>

          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'all')}
              className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none text-sm appearance-none cursor-pointer"
            >
              <option value="all" className="bg-gray-900">All Levels</option>
              <option value="error" className="bg-gray-900">Error</option>
              <option value="warn" className="bg-gray-900">Warning</option>
              <option value="info" className="bg-gray-900">Info</option>
              <option value="success" className="bg-gray-900">Success</option>
              <option value="debug" className="bg-gray-900">Debug</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log Count */}
      <div className="text-sm text-gray-400">
        Showing {logs.length} log {logs.length === 1 ? 'entry' : 'entries'}
        {isPaused && <span className="ml-2 text-yellow-400">(Paused)</span>}
      </div>

      {/* Logs List */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="text-lg font-medium">No logs to display</p>
              <p className="text-sm mt-1">Logs will appear here as they are generated</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getLevelColor(log.level)} uppercase`}
                    >
                      {log.level}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                        <span className="font-mono">{log.timestamp}</span>
                        <span>•</span>
                        <span className="text-primary">{log.service}</span>
                      </div>
                      <p className="text-white text-sm break-words">{log.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      <LogExportModal
        logs={logs}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
