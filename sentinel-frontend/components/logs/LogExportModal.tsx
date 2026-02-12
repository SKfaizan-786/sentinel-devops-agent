'use client';

import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { LogEntry } from '@/hooks/useLogs';
import { convertToCSV, convertToJSON } from '@/lib/exporters';

interface LogExportModalProps {
  logs: LogEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export function LogExportModal({ logs, isOpen, onClose }: LogExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  // Use lazy initializer to avoid impure render
  const [filename, setFilename] = useState(() => `logs-${Date.now()}`);

  const handleExport = () => {
    // Sanitize and validate filename
    const sanitizedFilename = filename.trim() || `logs-${Date.now()}`;
    
    const data = format === 'csv' ? convertToCSV(logs) : convertToJSON(logs);
    const blob = new Blob([data], { 
      type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizedFilename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-96 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white">Export Logs</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
              className="w-full border border-white/20 rounded-lg px-3 py-2 bg-white/10 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
            >
              <option value="csv" className="bg-gray-900">CSV (Spreadsheet)</option>
              <option value="json" className="bg-gray-900">JSON (Programmatic)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {format === 'csv' 
                ? 'Compatible with Excel, Google Sheets, and other spreadsheet tools' 
                : 'Structured format for programmatic analysis and processing'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white">Filename</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full border border-white/20 rounded-lg px-3 py-2 bg-white/10 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
              placeholder="logs-export"
            />
            <p className="text-xs text-gray-400 mt-1">
              Will be saved as: {filename}.{format}
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-sm text-blue-400">
              📊 Exporting {logs.length} log {logs.length === 1 ? 'entry' : 'entries'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              All applied filters will be preserved in the export
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleExport}
              disabled={!filename.trim()}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              <Download size={18} /> Export
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg py-2.5 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
