import { Incident } from "./mockData";

/**
 * Downloads a file with the given content
 */
function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Escape CSV field values that may contain commas, quotes, or newlines
 */
function escapeCSVField(value: string | number | undefined): string {
    if (value === undefined || value === null) return "";
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

/**
 * Format timestamp for human-readable display
 */
function formatTimestamp(timestamp: string): string {
    try {
        return new Date(timestamp).toLocaleString();
    } catch {
        return timestamp;
    }
}

/**
 * Export incidents to CSV format
 */
export function exportToCSV(incidents: Incident[], filename: string = "incidents") {
    const headers = [
        "ID",
        "Timestamp",
        "Title",
        "Service",
        "Severity",
        "Status",
        "Duration",
        "Root Cause",
        "Agent Action",
        "Confidence",
    ];

    const rows = incidents.map((incident) => [
        escapeCSVField(incident.id),
        escapeCSVField(formatTimestamp(incident.timestamp)),
        escapeCSVField(incident.title),
        escapeCSVField(incident.serviceId),
        escapeCSVField(incident.severity),
        escapeCSVField(incident.status),
        escapeCSVField(incident.duration),
        escapeCSVField(incident.rootCause),
        escapeCSVField(incident.agentAction),
        escapeCSVField(incident.agentPredictionConfidence),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    downloadFile(csvContent, `${filename}.csv`, "text/csv;charset=utf-8;");
}

/**
 * Export incidents to JSON format
 */
export function exportToJSON(incidents: Incident[], filename: string = "incidents") {
    const exportData = incidents.map((incident) => ({
        id: incident.id,
        timestamp: incident.timestamp,
        title: incident.title,
        service: incident.serviceId,
        severity: incident.severity,
        status: incident.status,
        duration: incident.duration,
        rootCause: incident.rootCause,
        agentAction: incident.agentAction,
        confidence: incident.agentPredictionConfidence,
        timeline: incident.timeline,
        affectedServices: incident.affectedServices,
    }));

    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, `${filename}.json`, "application/json");
}
