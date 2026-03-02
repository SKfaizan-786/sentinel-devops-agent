import React, { useState } from 'react';

interface Vulnerability {
  id: string;
  package: string;
  severity: string;
  cvssScore: number;
  title: string;
  description: string;
  fixedVersion: string;
  reference: string;
}

interface ScanReportProps {
  vulnerabilities: Vulnerability[];
  imageId: string;
  scannedAt: Date;
}

export function ScanReport({ vulnerabilities, imageId, scannedAt }: ScanReportProps) {
  const [filter, setFilter] = useState('');

  const filteredVulns = vulnerabilities.filter(v =>
    v.package.toLowerCase().includes(filter.toLowerCase()) ||
    v.id.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-md p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-200">
          Vulnerability Report for {imageId}
        </h3>
        <span className="text-xs text-slate-400">
          Scanned At: {new Date(scannedAt).toLocaleString()}
        </span>
      </div>
      
      <input
        type="text"
        placeholder="Filter by package or CVE ID..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1 mb-3 w-full"
      />

      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-xs text-left text-slate-400">
          <thead className="bg-slate-800 text-slate-300 sticky top-0">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Package</th>
              <th className="px-3 py-2">Severity</th>
              <th className="px-3 py-2">CVSS</th>
              <th className="px-3 py-2">Fixed In</th>
            </tr>
          </thead>
          <tbody>
            {filteredVulns.map((v, i) => (
              <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="px-3 py-2 font-mono text-blue-400 hover:underline cursor-pointer" title={v.title}>
                    <a href={v.reference} target="_blank" rel="noopener noreferrer">{v.id}</a>
                </td>
                <td className="px-3 py-2">{v.package}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded ${
                    v.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                    v.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                    v.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {v.severity}
                  </span>
                </td>
                <td className="px-3 py-2">{v.cvssScore.toFixed(1)}</td>
                <td className="px-3 py-2 text-green-400">{v.fixedVersion || 'N/A'}</td>
              </tr>
            ))}
            {filteredVulns.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center py-4 text-slate-500">No vulnerabilities found matching filter.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
