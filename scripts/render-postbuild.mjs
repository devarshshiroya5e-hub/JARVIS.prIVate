import fs from 'node:fs';
import path from 'node:path';

const serverFile = path.resolve('dist/server.cjs');

if (!fs.existsSync(serverFile)) {
  throw new Error(`Render build failed: expected ${serverFile} to exist after esbuild.`);
}

let output = fs.readFileSync(serverFile, 'utf8');
const replacements = [
  ['const PORT = 3000;', "const PORT = Number(process.env.PORT) || 3000;"],
  ['var PORT = 3000;', "var PORT = Number(process.env.PORT) || 3000;"],
];

let replaced = false;
for (const [from, to] of replacements) {
  if (output.includes(from)) {
    output = output.replace(from, to);
    replaced = true;
    break;
  }
}

if (!replaced) {
  console.warn('Render postbuild warning: PORT declaration was not found; verify server.ts already uses process.env.PORT.');
}

fs.writeFileSync(serverFile, output);
console.log('Render postbuild complete: production server entry exists at dist/server.cjs');
