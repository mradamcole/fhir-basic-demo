import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, '..');
const counterPath = resolve(workspaceRoot, '.build-counter');
const outputPath = resolve(workspaceRoot, 'src/app/buildInfo.ts');

async function readCounter() {
  try {
    const value = await readFile(counterPath, 'utf8');
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

async function main() {
  const nextCounter = (await readCounter()) + 1;
  await writeFile(counterPath, `${nextCounter}\n`, 'utf8');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `export const buildCounter = ${nextCounter};\n`,
    'utf8'
  );
  process.stdout.write(`Build counter: ${nextCounter}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to update build counter: ${String(error)}\n`);
  process.exitCode = 1;
});
