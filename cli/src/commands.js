import chalk from 'chalk';
import Table from 'cli-table3';
import { getStatus, triggerAction, getInsights } from './api.js';
import fs from 'fs';
import errorsModule from '../../backend/lib/errors.js';

const { ERRORS } = errorsModule;

const printError = (err) => {
    if (err && err.name === 'SentinelError') {
        console.error('\n' + chalk.bold('Message: ') + err.message);
        console.error(chalk.bold('Reason: ') + err.reason);
        console.error(chalk.bold('Solution: ') + err.solution + '\n');
    } else {
        console.error('\n' + chalk.bold('Message: ') + (err?.message || 'Unknown error occurred.') + '\n');
    }
};

// 1. STATUS COMMAND
export const showStatus = async () => {
    try {
        const data = await getStatus();

        if (!data) {
            printError(ERRORS.BACKEND_UNAVAILABLE());
            return;
        }

        console.log(chalk.bold.cyan('\nSentinel System Status'));

        // Added 'Last Updated' column to show per-service update timestamp
        const table = new Table({
            head: [chalk.white('Service'), chalk.white('Status'), chalk.white('Code')],
            style: { head: [], border: [] }
        });

        const services = data.services || {};

        Object.keys(services).forEach(name => {
            const s = services[name] || {};
            const code = Number(s.code ?? 0);
            let statusColor = chalk.green;
            let statusText = 'HEALTHY';

            if (code >= 500) {
                statusColor = chalk.red;
                statusText = 'CRITICAL';
            } else if (code >= 400 && code < 500) {
                statusColor = chalk.yellow;
                statusText = 'DEGRADED';
            } else if (code === 0) {
                statusColor = chalk.gray;
                statusText = 'UNKNOWN';
            } else if (code >= 200 && code < 300) {
                statusColor = chalk.green;
                statusText = 'HEALTHY';
            } else {
                statusColor = chalk.yellow;
                statusText = 'DEGRADED';
            }

            table.push([
                chalk.bold(name.toUpperCase()),
                statusColor(statusText),
                code
            ]);
        });

        console.log(table.toString());
        if (data.lastUpdated) {
            console.log(chalk.gray(`Last Updated: ${new Date(data.lastUpdated).toLocaleString()}`));
        }
    } catch (err) {
        printError(err);
    }
};

// 2. ACTION COMMAND (Simulate/Heal)
export const runAction = async (service, actionType) => {
    console.log(chalk.yellow(`\nTriggering ${actionType} on ${service}...`));
    try {
        const result = await triggerAction(service, actionType);
        console.log(chalk.green(`Success: ${result.message}`));
    } catch (err) {
        printError(err);
    }
};

// 3. REPORT COMMAND (Generates Markdown)
export const generateReport = async () => {
    console.log(chalk.blue('\nGenerating Incident Report...'));
    try {
        const insights = await getInsights();

        if (insights.length === 0) {
            console.log(chalk.yellow('No AI insights found to report.'));
            return;
        }

        // Filter and categorize insights (don't mutate original array)
        const incidents = [];
        const healthyPeriods = [];
        let lastStatus = null;
        let healthyStart = null;

        const chronological = [...insights].reverse();
        chronological.forEach((item) => {
            const analysis = item.analysis || item.summary || '';
            const isHealthy = analysis.includes('HEALTHY');
            const isCritical = analysis.includes('CRITICAL');
            const isDegraded = analysis.includes('DEGRADED');

            if (isCritical || isDegraded) {
                // Always record incidents
                incidents.push({
                    timestamp: item.timestamp,
                    severity: isCritical ? 'CRITICAL' : 'DEGRADED',
                    analysis: analysis
                });
                lastStatus = 'incident';
                healthyStart = null;
            } else if (isHealthy) {
                if (lastStatus === 'incident') {
                    // Record recovery
                    healthyPeriods.push({
                        timestamp: item.timestamp,
                        type: 'recovery',
                        analysis: analysis
                    });
                    healthyStart = item.timestamp;
                } else if (!healthyStart) {
                    healthyStart = item.timestamp;
                }
                lastStatus = 'healthy';
            }
        });

        // Generate report
        let mdContent = `# Sentinel Incident Report\n`;
        mdContent += `**Generated:** ${new Date().toLocaleString()}\n\n`;

        // Summary
        mdContent += `## Summary\n\n`;
        mdContent += `- **Total Events Analyzed:** ${insights.length}\n`;
        mdContent += `- **Critical Incidents:** ${incidents.filter(i => i.severity === 'CRITICAL').length}\n`;
        mdContent += `- **Degraded Events:** ${incidents.filter(i => i.severity === 'DEGRADED').length}\n`;
        mdContent += `- **Recovery Events:** ${healthyPeriods.filter(h => h.type === 'recovery').length}\n`;
        mdContent += `- **Current Status:** ${lastStatus === 'healthy' ? 'Healthy' : 'Requires Attention'}\n\n`;

        mdContent += `---\n\n`;

        // Incidents Section
        if (incidents.length > 0) {
            mdContent += `## Incidents\n\n`;

            incidents.forEach((incident, index) => {
                const badge = incident.severity === 'CRITICAL' ? 'CRITICAL' : 'DEGRADED';
                mdContent += `### ${badge} - Event ${index + 1}\n`;
                mdContent += `**Time:** ${new Date(incident.timestamp).toLocaleString()}\n\n`;
                mdContent += `**Analysis:**\n`;
                mdContent += `> ${incident.analysis}\n\n`;

                // Check if there's a recovery after this incident
                const recoveryIndex = healthyPeriods.findIndex(h =>
                    new Date(h.timestamp) > new Date(incident.timestamp)
                );

                if (recoveryIndex !== -1) {
                    const recovery = healthyPeriods[recoveryIndex];
                    const recoveryTime = new Date(recovery.timestamp);
                    const incidentTime = new Date(incident.timestamp);
                    const duration = Math.round((recoveryTime - incidentTime) / 1000);

                    mdContent += `**Recovery:** Restored after ${duration}s\n\n`;
                }

                mdContent += `---\n\n`;
            });
        } else {
            mdContent += `## No Incidents Detected\n\n`;
            mdContent += `All services have been operating normally during the monitored period.\n\n`;
        }

        // System Health Timeline
        if (healthyStart) {
            mdContent += `## System Health Timeline\n\n`;
            mdContent += `**Healthy Since:** ${new Date(healthyStart).toLocaleString()}\n`;
            const uptime = Math.round((Date.now() - new Date(healthyStart)) / 1000);
            mdContent += `**Uptime:** ${uptime}s\n\n`;
        }

        // Footer
        mdContent += `---\n\n`;
        mdContent += `*Report generated by Sentinel Autonomous DevOps Agent*\n`;
        mdContent += `*For more details, run \`sentinel status\` or check the dashboard at http://localhost:3000/dashboard*\n`;

        const fileName = `sentinel-report-${Date.now()}.md`;
        fs.writeFileSync(fileName, mdContent);

        console.log(chalk.green(`Report saved to ./${fileName}`));
        console.log(chalk.gray(`   ${incidents.length} incidents, ${healthyPeriods.length} recoveries documented`));
    } catch (err) {
        printError(err);
    }
};

