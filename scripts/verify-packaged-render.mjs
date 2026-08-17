import fs from 'node:fs';
import { resolve } from 'node:path';
import { verifyElectronRender } from './lib/verifyElectronRender.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
const outputDir = resolve(projectRoot, packageJson.build?.directories?.output || 'dist');
const appDir = resolve(outputDir, 'win-unpacked');
const exeName = fs
  .readdirSync(appDir)
  .find((name) => name.endsWith('.exe') && !['elevate.exe', 'updater.exe'].includes(name));

if (!exeName) {
  throw new Error(`Cannot find packaged app executable in ${appDir}`);
}

const exePath = resolve(appDir, exeName);

const result = await verifyElectronRender(exePath, {
  projectRoot,
  screenshotName: 'packaged-render.png',
});

console.log(JSON.stringify(result, null, 2));
