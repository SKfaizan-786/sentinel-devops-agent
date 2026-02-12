import { LogEntry } from "@/hooks/useLogs";

/**
 * Escapes a CSV field by wrapping in quotes and escaping internal quotes
 * Handles commas, newlines, and quotes in any field
 */
function escapeCsvField(field: string): string {
  // Replace any double-quote with two double-quotes and wrap in quotes
  return `"${field.replace(/"/g, '""')}"`;
}

/**
 * Converts log entries to CSV format
 * Properly escapes quotes and handles special characters in all fields
 */
export function convertToCSV(logs: LogEntry[]): string {
  const headers = ['timestamp', 'level', 'service', 'message'];
  
  const rows = logs.map(log => [
    escapeCsvField(log.timestamp),
    escapeCsvField(log.level),
    escapeCsvField(log.service),
    escapeCsvField(log.message)
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Converts log entries to JSON format
 * Pretty-printed with 2-space indentation
 */
export function convertToJSON(logs: LogEntry[]): string {
  return JSON.stringify(logs, null, 2);
}
