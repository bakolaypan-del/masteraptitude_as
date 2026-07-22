const fs = require('fs');
const path = require('path');

const file = 'C:\\Users\\bakol\\.gemini\\antigravity-ide\\brain\\0f5e869b-f9e5-4538-9e08-f89e00d7d031\\.system_generated\\logs\\transcript_full.jsonl';

const lines = fs.readFileSync(file, 'utf-8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  const obj = JSON.parse(line);
  if (obj.step_index === 208) {
    console.log("Found browser subagent step!");
    // Write the raw content to a file so we can view it
    fs.writeFileSync('subagent_content.txt', obj.content);
    console.log("Wrote subagent content to subagent_content.txt");
  }
}
