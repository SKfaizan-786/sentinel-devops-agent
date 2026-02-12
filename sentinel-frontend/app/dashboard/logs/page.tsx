'use client';

import { LogViewer } from '@/components/logs/LogViewer';

export default function LogsPage() {
  return (
    <div className="container mx-auto max-w-7xl pb-20 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">System Logs</h1>
        <p className="text-muted-foreground">
          Real-time activity logs from Sentinel monitoring agent
        </p>
      </div>

      <LogViewer />
    </div>
  );
}
