const fs = require('fs');

const file = 'C:\\Users\\bakol\\.gemini\\antigravity-ide\\brain\\0f5e869b-f9e5-4538-9e08-f89e00d7d031\\.system_generated\\logs\\transcript_full.jsonl';
const lines = fs.readFileSync(file, 'utf-8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  const obj = JSON.parse(line);
  if (obj.step_index === 208) {
    // Look inside content or tool_calls
    console.log("Found step 208!");
    fs.writeFileSync('raw_subagent_step.json', JSON.stringify(obj, null, 2));
    console.log("Wrote raw step to raw_subagent_step.json");
  }
}
