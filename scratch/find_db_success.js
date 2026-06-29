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
            if (obj.step_index >= 663 && obj.step_index <= 900) {
                if (obj.type === 'RUN_COMMAND' && obj.content && obj.content.includes('completed successfully') && !obj.content.includes('failed') && !obj.content.includes('Ambos intentos fallaron')) {
                    console.log(`Step ${obj.step_index} success command log:`, obj.content);
                }
                if (obj.type === 'PLANNER_RESPONSE' && obj.tool_calls) {
                    for (const call of obj.tool_calls) {
                        if (call.name === 'run_command' && (call.args.CommandLine.includes('sql') || call.args.CommandLine.includes('migra') || call.args.CommandLine.includes('db'))) {
                            console.log(`Step ${obj.step_index} command proposal:`, call.args.CommandLine);
                        }
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }
}

search();
