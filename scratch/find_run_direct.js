const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\sam32\\.gemini\\antigravity-ide\\brain\\d6359428-2155-4e94-b9b6-29750560ccd6\\.system_generated\\logs\\transcript.jsonl';

async function findRunDirect() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const obj = JSON.parse(line);
            if (obj.content && obj.content.includes('run-direct.js')) {
                console.log(`Step ${obj.step_index}: content includes run-direct.js`);
            }
            if (obj.tool_calls) {
                for (const call of obj.tool_calls) {
                    if (JSON.stringify(call).includes('run-direct.js')) {
                        console.log(`Step ${obj.step_index}: tool call includes run-direct.js`);
                        console.log(JSON.stringify(call, null, 2));
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }
}

findRunDirect();
