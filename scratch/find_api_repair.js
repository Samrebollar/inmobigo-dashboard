const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\sam32\\.gemini\\antigravity-ide\\brain\\d6359428-2155-4e94-b9b6-29750560ccd6\\.system_generated\\logs\\transcript.jsonl';

async function findApiRepair() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const obj = JSON.parse(line);
            if (obj.tool_calls) {
                for (const call of obj.tool_calls) {
                    if (call.name === 'write_to_file' && JSON.stringify(call).includes('palmas-invoice-repair')) {
                        console.log(`\n================ STEP ${obj.step_index} (${obj.created_at}) ================`);
                        console.log(JSON.stringify(call.args, null, 2));
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }
}

findApiRepair();
