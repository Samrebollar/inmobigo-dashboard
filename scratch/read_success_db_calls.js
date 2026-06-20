const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\sam32\\.gemini\\antigravity-ide\\brain\\d6359428-2155-4e94-b9b6-29750560ccd6\\.system_generated\\logs\\transcript.jsonl';

async function findSuccess() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const obj = JSON.parse(line);
            if (obj.type === 'RUN_COMMAND' && obj.status === 'DONE' && obj.content && obj.content.includes('success')) {
                console.log(`Step ${obj.step_index}: Command succeeded. Output preview:`);
                console.log(obj.content.substring(0, 500));
            }
        } catch (e) {
            // ignore
        }
    }
}

findSuccess();
