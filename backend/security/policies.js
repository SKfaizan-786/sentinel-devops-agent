const policies = {
    allowCritical: false,
    allowHigh: true, // Allow high severity by default but warn
    blockDeployment: true, // Block new deployments if critical vulnerabilities found
    ignorePackages: [], // List of packages to ignore (e.g., 'npm-audit')
    warningOnly: false // If true, only log warnings, don't block
};

function getPolicy() {
    return policies;
}

function updatePolicy(newPolicy) {
    const allowed = ['allowCritical', 'allowHigh', 'blockDeployment', 'ignorePackages', 'warningOnly'];
    for (const key of Object.keys(newPolicy || {})) {
        if (!allowed.includes(key)) continue;
        if (key === 'ignorePackages') {
            if (!Array.isArray(newPolicy[key])) throw new Error('ignorePackages must be an array');
            policies[key] = newPolicy[key].map(String);
        } else {
            if (typeof newPolicy[key] !== 'boolean') throw new Error(`${key} must be boolean`);
            policies[key] = newPolicy[key];
        }
    }
    return policies;
}

function checkCompliance(scanResult) {
    if (!scanResult || scanResult.error) {
        if (policies.warningOnly) {
            return { compliant: true, warning: 'Scan failed; allowing due to warningOnly mode' };
        }
        return { compliant: false, reason: 'Scan failed or skipped' };
    }
    
    // Check specific policy logic
    if (policies.warningOnly) return { compliant: true, warning: 'Policy violation detected (Warning Mode)' };

    // Ignore blocked packages/vulns logic could be added here
    
    if (!policies.allowCritical && scanResult.criticalCount > 0) {
        return { 
            compliant: false, 
            reason: `Found ${scanResult.criticalCount} critical vulnerabilities. Policy: allowCritical=false`
        };
    }

    if (!policies.allowHigh && scanResult.highCount > 0) {
        return { 
            compliant: false, 
            reason: `Found ${scanResult.highCount} high severity vulnerabilities. Policy: allowHigh=false` 
        };
    }

    return { compliant: true };
}

module.exports = {
    getPolicy,
    updatePolicy,
    checkCompliance
};
