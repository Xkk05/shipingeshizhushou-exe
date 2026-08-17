import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { join, resolve } from 'node:path';
import { verifyElectronRender } from './lib/verifyElectronRender.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
const outputDir = resolve(projectRoot, packageJson.build?.directories?.output || 'dist');
const setupName = fs
  .readdirSync(outputDir)
  .find((name) => /^kunqiu-video-converter-setup-.*\.exe$/i.test(name));

if (!setupName) {
  throw new Error(`Cannot find setup installer in ${outputDir}`);
}

const setupPath = resolve(outputDir, setupName);
const installDir = join(os.tmpdir(), `VideoFormatHelperInstallSmoke_${Date.now()}`);

function runInstaller() {
  return new Promise((resolveInstall, rejectInstall) => {
    const installer = spawn(setupPath, ['/S', `/D=${installDir}`], {
      stdio: 'ignore',
      windowsHide: true,
    });

    installer.on('error', rejectInstall);
    installer.on('exit', (code) => {
      if (code === 0) {
        resolveInstall();
      } else {
        rejectInstall(new Error(`Installer exited with code ${code}`));
      }
    });
  });
}

function findInstalledExe(dir) {
  const productExe = join(dir, `${packageJson.build?.productName || packageJson.productName}.exe`);
  if (fs.existsSync(productExe)) {
    return productExe;
  }

  const rootExe = fs
    .readdirSync(dir)
    .find((name) => name.endsWith('.exe') && !/^uninstall/i.test(name));
  if (rootExe) {
    return join(dir, rootExe);
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findInstalledExe(fullPath);
      if (nested) return nested;
    } else if (
      entry.name.endsWith('.exe') &&
      !/^uninstall/i.test(entry.name) &&
      !['elevate.exe', 'updater.exe'].includes(entry.name)
    ) {
      return fullPath;
    }
  }
}

function stopExistingInstalledApp(exePath) {
  spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      'Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $env:TARGET_EXE } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }',
    ],
    {
      env: { ...process.env, TARGET_EXE: exePath },
      windowsHide: true,
      stdio: 'ignore',
    },
  );
}

await runInstaller();

const exePath = findInstalledExe(installDir);
if (!exePath) {
  throw new Error(`Cannot find installed app executable in ${installDir}`);
}

stopExistingInstalledApp(exePath);

const result = await verifyElectronRender(exePath, {
  projectRoot,
  screenshotName: 'installed-render.png',
});

console.log(JSON.stringify({ ...result, setupPath, installDir }, null, 2));
