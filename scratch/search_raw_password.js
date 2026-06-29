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
            const str = JSON.stringify(obj);
            if (str.includes('DATABASE_URL') && !str.includes('DATABASE_URL not found') && !str.includes('missing in process.env')) {
                console.log(`Step ${obj.step_index} matches DATABASE_URL:`);
                if (obj.content) {
                    console.log('  Content:', obj.content.substring(0, 300));
                }
                if (obj.tool_calls) {
                    console.log('  Tool calls:', JSON.stringify(obj.tool_calls).substring(0, 300));
                }
            }
        } catch (e) {
            // ignore
        }
    }
}

search();
