const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\sam32\\.gemini\\antigravity-ide\\brain\\d6359428-2155-4e94-b9b6-29750560ccd6\\.system_generated\\logs\\transcript.jsonl';

async function checkTaskResults() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const obj = JSON.parse(line);
            if (obj.content && (obj.content.includes('task-612') || obj.content.includes('task-731') || obj.content.includes('supabase projects list'))) {
                console.log(`\n================ STEP ${obj.step_index} ================`);
                console.log(obj.content);
            }
        } catch (e) {
            // ignore
        }
    }
}

checkTaskResults();
