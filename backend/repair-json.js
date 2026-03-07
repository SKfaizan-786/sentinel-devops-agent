const fs = require('fs');

function repair(content) {
    // Fix line 1420-1421 area (missing braces for funding)
    content = content.replace(
        /"url": "https:\/\/github.com\/sponsors\/sindresorhus"\s+"node_modules\/js-yaml": {/,
        '"url": "https://github.com/sponsors/sindresorhus"\n      }\n    },\n    "node_modules/js-yaml": {'
    );

    // Fix line 1612-1613 area (missing braces/structure for minimatch)
    // Looking at the view_file, it looks like one entry was smashed into another.
    content = content.replace(
        /"integrity": "sha512-VgjWUsnnT6n\+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8\+jVzaeNt94ssEEl4w==",\s+"version": "3.1.3"/,
        '"integrity": "sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w=="\n    },\n    "node_modules/minimatch": {\n      "version": "3.1.3"'
    );

    return content;
}

const filename = process.argv[2];
let content = fs.readFileSync(filename, 'utf8');
const repaired = repair(content);
try {
    JSON.parse(repaired);
    fs.writeFileSync(filename, repaired);
    console.log('Attempted repair on ' + filename);
    console.log('JSON is now VALID.');
} catch (e) {
    console.error('Repair produced INVALID JSON, source file not overwritten:', e.message);
    process.exit(1);
}
