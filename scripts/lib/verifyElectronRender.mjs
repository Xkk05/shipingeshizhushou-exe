import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { dirname, resolve } from 'node:path';

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function waitForDebugPort(port) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return;
    } catch {
      // The app may still be starting.
    }
    await wait(250);
  }

  throw new Error(`Electron app did not expose a debug endpoint on ${endpoint}`);
}

function recordRendererError(errors, message) {
  if (!/favicon|ResizeObserver|Failed to fetch progress|\/api\/progress|检查授权码失败/i.test(message)) {
    errors.push(message);
  }
}

export async function verifyElectronRender(exePath, options = {}) {
  const projectRoot = options.projectRoot || resolve(import.meta.dirname, '../..');
  const screenshotName = options.screenshotName || 'electron-render.png';
  const screenshotPath = resolve(projectRoot, 'test-results', screenshotName);
  const port = 9400 + Math.floor(Math.random() * 200);
  const errors = [];
  let appProcess;

  try {
    appProcess = spawn(exePath, [`--remote-debugging-port=${port}`], {
      stdio: 'ignore',
      windowsHide: true,
    });
    appProcess.on('error', (error) => recordRendererError(errors, `Failed to start app: ${error.message}`));

    await waitForDebugPort(port);

    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    page.on('pageerror', (error) => recordRendererError(errors, error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') recordRendererError(errors, message.text());
    });

    const cdp = await context.newCDPSession(page);
    await cdp.send('Runtime.enable');
    cdp.on('Runtime.exceptionThrown', (event) => {
      const description = event.exceptionDetails?.exception?.description || event.exceptionDetails?.text;
      if (description) recordRendererError(errors, description);
    });

    await page.reload({ waitUntil: 'load' });
    await wait(3000);

    fs.mkdirSync(dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const diagnostics = await page.evaluate(() => {
      const appRoot = document.querySelector('#app');
      const firstVisibleText = document.body.innerText.trim();
      return {
        href: location.href,
        readyState: document.readyState,
        appHtmlLength: appRoot?.innerHTML.length || 0,
        bodyTextLength: firstVisibleText.length,
        bodyTextPreview: firstVisibleText.slice(0, 120),
      };
    });

    await browser.close();

    if (errors.length > 0 || diagnostics.appHtmlLength < 100 || diagnostics.bodyTextLength < 40) {
      throw new Error(
        [
          'Electron render check failed.',
          `Diagnostics: ${JSON.stringify(diagnostics)}`,
          `Errors: ${JSON.stringify(errors)}`,
          `Screenshot: ${screenshotPath}`,
        ].join('\n'),
      );
    }

    return { ok: true, exePath, screenshotPath, diagnostics };
  } finally {
    if (appProcess && !appProcess.killed) {
      appProcess.kill();
    }
  }
}
