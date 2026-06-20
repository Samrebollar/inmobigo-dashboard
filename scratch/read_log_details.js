const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\sam32\\.gemini\\antigravity-ide\\brain\\d6359428-2155-4e94-b9b6-29750560ccd6\\.system_generated\\logs\\transcript.jsonl';
const targetSteps = [269, 273, 279, 324, 486, 493];

async function printSteps() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const obj = JSON.parse(line);
            if (targetSteps.includes(obj.step_index)) {
                console.log(`\n================ STEP ${obj.step_index} (${obj.created_at}) ================`);
                console.log(JSON.stringify(obj, null, 2).substring(0, 3000));
            }
        } catch (e) {
            // ignore
        }
    }
}

printSteps();
