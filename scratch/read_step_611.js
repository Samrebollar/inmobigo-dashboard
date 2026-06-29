const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\sam32\\.gemini\\antigravity-ide\\brain\\d6359428-2155-4e94-b9b6-29750560ccd6\\.system_generated\\logs\\transcript.jsonl';

async function search() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const obj = JSON.parse(line);
            if (obj.step_index === 611 || obj.step_index === 610 || obj.step_index === 612 || obj.step_index === 613) {
                console.log(`Step ${obj.step_index}:`, JSON.stringify(obj, null, 2));
            }
        } catch (e) {
            // ignore
        }
    }
}

search();
