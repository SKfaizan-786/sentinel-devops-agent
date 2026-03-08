const EventEmitter = require('events');

// Simulated logic from monitor.js
function testParsing(chunks) {
    let buffer = '';
    const results = [];
    
    for (const chunk of chunks) {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                results.push(JSON.parse(line));
            } catch (e) {
                console.error('Failed to parse line:', line);
            }
        }
    }
    return results;
}

const chunks = [
    '{"id": 1, "status": "o',
    'k"}\n{"id": 2, "status": "pe',
    'nding"}\n',
    '{"id": 3, "stat',
    'us": "done"}\n'
];

console.log('🧪 Testing Line-Buffered Parsing...\n');
const parsed = testParsing(chunks);

console.log('Results:', JSON.stringify(parsed, null, 2));

if (parsed.length === 3 && parsed[0].id === 1 && parsed[2].status === 'done') {
    console.log('\n✅ Verification Successful: All objects parsed correctly across chunk boundaries.');
} else {
    console.log('\n❌ Verification Failed: Parsing logic did not handle chunk boundaries as expected.');
    process.exit(1);
}
