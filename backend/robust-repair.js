const fs = require('fs');

function repair(content) {
    let lines = content.split('\n');
    let out = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let nextLine = lines[i + 1] || "";

        // Pattern 1: Missing closing brace before a new node_modules entry
        if (line.includes('"url":') && nextLine.includes('"node_modules/')) {
            out.push(line + ' }');
            out.push('    },');
            continue;
        }

        // Pattern 2: Integrity hash followed immediately by version (minimatch case)
        if (line.includes('"integrity":') && nextLine.includes('"version":') && !line.trimEnd().endsWith(',')) {
            out.push(line);
            out.push('    },');
            out.push('    "node_modules/minimatch": {'); // The missing key!
            continue;
        }

        out.push(line);
    }
    return out.join('\n');
}

const filename = process.argv[2];
let content = fs.readFileSync(filename, 'utf8');
const repaired = repair(content);
try {
    JSON.parse(repaired);
    fs.writeFileSync(filename, repaired);
    console.log('REPAIR SUCCESSFUL');
} catch (e) {
    const pos = e.message.match(/position (\d+)/);
    if (pos) {
        const p = parseInt(pos[1]);
        console.log('Next error at pos ' + p + ': ' + repaired.substring(p - 20, p + 20));
    } else {
        console.error('REPAIR FAILED:', e.message);
    }
    process.exit(1);
}
