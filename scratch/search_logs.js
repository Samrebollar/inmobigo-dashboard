const fs = require('fs');
const readline = require('readline');
const path = require('path');

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
            // Search for commands
            if (obj.tool_calls) {
                for (const call of obj.tool_calls) {
                    if (call.name === 'run_command') {
                        console.log(`Step ${obj.step_index} (${obj.created_at}): Command -> ${call.args.CommandLine}`);
                    }
                }
            }
            if (obj.content && (obj.content.includes('DATABASE_URL') || obj.content.includes('postgres:') || obj.content.includes('sql') || obj.content.includes('migra'))) {
                console.log(`Step ${obj.step_index} content matches.`);
            }
        } catch (e) {
            // ignore
        }
    }
}

search();
