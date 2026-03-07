'use client';

import React, { useState, useEffect } from 'react';
import { useContainers } from '@/hooks/useContainers';
import { VulnerabilityBadge } from '@/components/security/VulnerabilityBadge';
import { ScanReport } from '@/components/security/ScanReport';
import { Shield, RefreshCw, AlertTriangle, CheckCircle, Database } from 'lucide-react';

interface ScanSummary {
  imageId: string;
  scannedAt: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  vulnerabilities: any[];
  error?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function SecurityDashboardPage() {
  const { containers, loading, refetch } = useContainers();
  const [scanResults, setScanResults] = useState<Record<string, ScanSummary>>({});
  const [scanning, setScanning] = useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Get unique images
  const uniqueImages = Array.from(new Set(containers.map(c => c.image)));

  const fetchScanResult = async (imageId: string) => {
    if (scanning[imageId]) return;
    
    setScanning(prev => ({ ...prev, [imageId]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/security/scan?imageId=${encodeURIComponent(imageId)}`);
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      setScanResults(prev => ({ ...prev, [imageId]: data }));
    } catch (err) {
      console.error(`Failed to scan ${imageId}:`, err);
      const message = err instanceof Error ? err.message : 'Scan failed';
      setScanResults(prev => ({
        ...prev,
        [imageId]: {
          imageId,
          scannedAt: new Date().toISOString(),
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          vulnerabilities: [],
          error: message,
        },
      }));
    } finally {
      setScanning(prev => ({ ...prev, [imageId]: false }));
    }
  };

  useEffect(() => {
    if (uniqueImages.length > 0) {
      uniqueImages.forEach(img => {
        if (!scanResults[img] && !scanning[img]) {
            fetchScanResult(img);
        }
      });
    }
  }, [containers]);

  // Handle manual rescan
  const handleRescan = (imageId: string) => {
     // Clear old result to show loading state if desired, or just re-fetch
     fetchScanResult(imageId);
  };

  const totalCritical = Object.values(scanResults).reduce((acc, r) => acc + (r.criticalCount || 0), 0);
  const totalHigh = Object.values(scanResults).reduce((acc, r) => acc + (r.highCount || 0), 0);
  const scannedCount = Object.keys(scanResults).length;

  if (loading) {
      return <div className="p-8 text-slate-400">Loading container security data...</div>;
  }

  return (
    <div className="p-6 text-slate-200">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            Container Security
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Vulnerability scanning for active containers
          </p>
        </div>
        
        <div className="flex gap-4">
            <div className="bg-slate-800 px-4 py-2 rounded border border-slate-700 flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400"/>
                <span className="text-sm font-medium">{uniqueImages.length} Images</span>
            </div>
             <div className="bg-slate-800 px-4 py-2 rounded border border-slate-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400"/>
                <span className="text-sm font-medium">{totalCritical} Critical Vulns</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-slate-300">Active Images</h2>
          <div className="space-y-2">
            {uniqueImages.map(image => {
                const result = scanResults[image];
                const isScanning = scanning[image];
                const isSelected = selectedImage === image;

                return (
                    <div 
                        key={image}
                        onClick={() => setSelectedImage(image)}
                        className={`p-3 rounded border cursor-pointer transition-colors ${
                            isSelected 
                                ? 'bg-blue-500/10 border-blue-500/50' 
                                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-sm break-all">{image}</span>
                            {isScanning ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                            ) : result ? (
                                result.error ? (
                                    <span className="text-xs text-red-500">Error</span>
                                ) : (
                                    <VulnerabilityBadge 
                                        critical={result.criticalCount} 
                                        high={result.highCount} 
                                        medium={result.mediumCount} 
                                        low={result.lowCount}
                                    />
                                )
                            ) : (
                                <span className="text-xs text-slate-500">Pending...</span>
                            )}
                        </div>
                        {result && !result.error && (
                            <div className="text-xs text-slate-500">
                                Last scanned: {new Date(result.scannedAt).toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                );
            })}
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="lg:col-span-2">
            {selectedImage ? (
                scanResults[selectedImage] ? (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                             <h2 className="text-lg font-semibold text-slate-300 break-all">
                                Report: {selectedImage}
                            </h2>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleRescan(selectedImage); }}
                                className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded flex items-center gap-2"
                            >
                                <RefreshCw className="w-3 h-3" /> Rescan Image
                            </button>
                        </div>
                        
                        {scanResults[selectedImage].error ? (
                             <div className="bg-red-900/20 border border-red-900 p-4 rounded text-red-200">
                                Scan Error: {scanResults[selectedImage].error}
                            </div>
                        ) : (
                            <ScanReport 
                                vulnerabilities={scanResults[selectedImage].vulnerabilities}
                                imageId={selectedImage}
                                scannedAt={new Date(scanResults[selectedImage].scannedAt)}
                            />
                        )}
                    </div>
                ) : (
                    <div className="h-64 flex items-center justify-center border border-dashed border-slate-700 rounded bg-slate-800/50">
                        <div className="text-center">
                            <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-2" />
                            <p className="text-slate-400">Scanning image...</p>
                        </div>
                    </div>
                )
            ) : (
                <div className="h-64 flex items-center justify-center border border-dashed border-slate-700 rounded bg-slate-800/50">
                    <div className="text-center text-slate-500">
                        <Shield className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>Select an image to view vulnerability report</p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
