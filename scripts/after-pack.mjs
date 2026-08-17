import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export default async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const rootDir = context.packager.projectDir;
  const rceditPath = path.join(rootDir, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe');
  const iconPath = existsSync(path.join(rootDir, 'build', 'icon.ico'))
    ? path.join(rootDir, 'build', 'icon.ico')
    : path.join(rootDir, 'public', 'app-icon.ico');

  if (!existsSync(rceditPath)) {
    throw new Error(`rcedit not found: ${rceditPath}`);
  }

  if (!existsSync(iconPath)) {
    throw new Error(`Windows app icon not found: ${iconPath}`);
  }

  const appExeName = readdirSync(context.appOutDir).find((fileName) => fileName.endsWith('.exe'));
  if (!appExeName) {
    throw new Error(`No Windows executable found in ${context.appOutDir}`);
  }

  const appExePath = path.join(context.appOutDir, appExeName);
  execFileSync(rceditPath, [appExePath, '--set-icon', iconPath], { stdio: 'inherit' });
  console.log(`Embedded Windows app icon: ${appExePath}`);
}
