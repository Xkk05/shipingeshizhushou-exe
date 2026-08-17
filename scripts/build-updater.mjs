import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(import.meta.dirname, '..');
const sourcePath = resolve(projectRoot, 'tools/updater/Updater.cs');
const outputPath = resolve(projectRoot, 'public/updater.exe');

const compilerCandidates = [
  `${process.env.WINDIR || 'C:\\Windows'}\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe`,
  `${process.env.WINDIR || 'C:\\Windows'}\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe`,
];

function findCompiler() {
  return compilerCandidates.find((candidate) => existsSync(candidate));
}

if (process.platform !== 'win32') {
  if (!existsSync(outputPath)) {
    throw new Error('public/updater.exe is required for Windows auto-update packaging.');
  }
  process.exit(0);
}

const compilerPath = findCompiler();
if (!compilerPath) {
  throw new Error('Cannot build updater.exe because .NET Framework csc.exe was not found.');
}

mkdirSync(dirname(outputPath), { recursive: true });

const result = spawnSync(
  compilerPath,
  [
    '/nologo',
    '/optimize+',
    '/target:winexe',
    `/out:${outputPath}`,
    sourcePath,
  ],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    windowsHide: true,
  },
);

if (result.status !== 0) {
  throw new Error(`Failed to build updater.exe with exit code ${result.status ?? 'unknown'}.`);
}

console.log(`Built updater helper: ${outputPath}`);
