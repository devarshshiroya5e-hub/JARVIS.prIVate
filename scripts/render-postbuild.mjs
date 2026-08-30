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

// JARVIS uses exactly one remote AI model in production.
// Keep a defensive replacement here so stale bundled defaults cannot restore
// Gemini/OpenAI model identifiers after a build.
const NVIDIA_MODEL = 'nvidia/nemotron-3.5-content-safety:free';
const legacyModels = [
  'gemini-3.7-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.5-flash',
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
];
for (const legacyModel of legacyModels) output = output.replaceAll(legacyModel, NVIDIA_MODEL);

fs.writeFileSync(serverFile, output);
console.log(`Render postbuild complete: ${serverFile} configured for ${NVIDIA_MODEL}.`);
