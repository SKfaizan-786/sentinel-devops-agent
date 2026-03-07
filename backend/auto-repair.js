const fs = require('fs');

function findNextError(content) {
    try {
        JSON.parse(content);
        return null;
    } catch (e) {
        const match = e.message.match(/position (\d+)/);
        if (match) return parseInt(match[1]);
        return -1;
    }
}

let content = fs.readFileSync('package-lock.json.orig', 'utf8');
let pos;
let iterations = 0;

while ((pos = findNextError(content)) !== null && iterations < 100) {
    iterations++;
    console.log(`Error at pos ${pos}. Context: ${content.substring(pos - 20, pos + 20)}`);

    // Look for missing braces/commas before the error
    // Many errors look like they are missing a closing brace for an object and a comma
    // e.g. "funding": { "url": "..." } "node_modules/..."

    const before = content.substring(0, pos);
    const after = content.substring(pos);

    // Try to insert missing closing braces and comma
    content = before.trimEnd() + '\n      }\n    },\n    ' + after.trimStart();
}

fs.writeFileSync('package-lock.json.orig', content);
if (findNextError(content) === null) {
    console.log('Successfully repaired JSON after ' + iterations + ' iterations.');
} else {
    console.log('Failed to repair JSON completely.');
}
