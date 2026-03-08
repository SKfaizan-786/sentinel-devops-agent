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

    // FINAL FLUSH: Handle the case where the last chunk didn't end in \n
    if (buffer && buffer.trim()) {
        try {
            results.push(JSON.parse(buffer));
        } catch (e) {
            // Not a complete JSON object, ignore
        }
    }

    return results;
}

const chunks = [
    '{"id": 1, "status": "o',
    'k"}\n{"id": 2, "status": "pe',
    'nding"}\n',
    '{"id": 3, "stat',
    'us": "done"}' // No trailing newline here
];

console.log('🧪 Testing Line-Buffered Parsing with EOF Flush...\n');
const parsed = testParsing(chunks);

console.log('Results:', JSON.stringify(parsed, null, 2));

if (parsed.length === 3 && parsed[0].id === 1 && parsed[2].status === 'done') {
    console.log('\n✅ Verification Successful: All objects parsed correctly across chunk boundaries and EOF.');
} else {
    console.log('\n❌ Verification Failed: Parsing logic did not handle chunk boundaries or EOF as expected.');
    console.log('Count:', parsed.length);
    process.exit(1);
}
