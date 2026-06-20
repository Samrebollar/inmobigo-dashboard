const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\sam32\\.gemini\\antigravity-ide\\brain\\d6359428-2155-4e94-b9b6-29750560ccd6\\.system_generated\\logs\\transcript.jsonl';

async function printStepOutput() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let found = false;
    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const obj = JSON.parse(line);
            if (obj.step_index >= 610 && obj.step_index <= 614) {
                console.log(`\n================ STEP ${obj.step_index} (${obj.source}, ${obj.type}) ================`);
                console.log(JSON.stringify(obj, null, 2).substring(0, 1500));
            }
        } catch (e) {
            // ignore
        }
    }
}

printStepOutput();
