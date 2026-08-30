import fs from 'node:fs';
import path from 'node:path';

const serverFile = path.resolve('dist/server.cjs');

if (!fs.existsSync(serverFile)) {
  throw new Error(`Render build failed: expected ${serverFile} to exist after esbuild.`);
}

let output = fs.readFileSync(serverFile, 'utf8');

// Render supplies PORT dynamically. Keep a local fallback for development.
const portReplacements = [
  ['const PORT = 3000;', "const PORT = Number(process.env.PORT) || 3000;"],
  ['var PORT = 3000;', "var PORT = Number(process.env.PORT) || 3000;"],
];

for (const [from, to] of portReplacements) {
  if (output.includes(from)) {
    output = output.replace(from, to);
    break;
  }
}

// Low-latency production model defaults. These are stable/current Gemini models
// and are selected automatically when the server's Gemini fallback is used.
output = output.replaceAll('gemini-3.7-flash', 'gemini-2.5-flash-lite');
output = output.replaceAll('openai/gpt-4o', 'google/gemini-2.5-flash');
output = output.replaceAll('openai/gpt-4o-mini', 'google/gemini-2.5-flash-lite');

// Turn off extended thinking on Gemini 2.5 Flash paths used for quick assistant commands.
output = output.replaceAll(
  'temperature: 0.7,\n          tools: [{ functionDeclarations: JARVIS_TOOLS }],',
  'temperature: 0.2,\n      thinkingConfig: { thinkingBudget: 0 },\n          tools: [{ functionDeclarations: JARVIS_TOOLS }],'
);

output = output.replaceAll('temperature: 0.7,\n        },', 'temperature: 0.2,\n          thinkingConfig: { thinkingBudget: 0 },\n        },');

fs.writeFileSync(serverFile, output);
console.log('Render postbuild complete: dist/server.cjs ready with Render PORT and low-latency AI defaults.');
