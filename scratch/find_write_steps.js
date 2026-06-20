const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\sam32\\.gemini\\antigravity-ide\\brain\\d6359428-2155-4e94-b9b6-29750560ccd6\\.system_generated\\logs\\transcript.jsonl';
const targetFiles = [
    'run-direct.js',
    'inspect-env-keys.js',
    'check-process-env.js',
    'rpc-sql-inspect.js',
    'inspect-benefits-db.js',
    'cleanup-and-seed.js'
];

async function findWriteSteps() {
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
                    if (call.name === 'write_to_file' || call.name === 'replace_file_content') {
                        const target = call.args.TargetFile || '';
                        if (targetFiles.some(f => target.includes(f))) {
                            console.log(`\n================ STEP ${obj.step_index} (${obj.created_at}) ================`);
                            console.log(`Tool: ${call.name}, Target: ${target}`);
                            console.log(JSON.stringify(call.args, null, 2).substring(0, 3000));
                        }
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }
}

findWriteSteps();
