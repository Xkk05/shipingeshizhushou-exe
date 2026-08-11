import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const sourceIco = path.join(rootDir, 'public', 'app-icon.ico');
const buildDir = path.join(rootDir, 'build');
const linuxIconsDir = path.join(buildDir, 'icons');

if (!existsSync(sourceIco)) {
  throw new Error(`Source icon not found: ${sourceIco}`);
}

mkdirSync(buildDir, { recursive: true });
mkdirSync(linuxIconsDir, { recursive: true });

copyFileSync(sourceIco, path.join(buildDir, 'icon.ico'));

const powershellScript = `
Add-Type -AssemblyName System.Drawing

$source = "${sourceIco.replace(/\\/g, '\\\\')}"
$buildIcon = "${path.join(buildDir, 'icon.png').replace(/\\/g, '\\\\')}"
$sizes = @(16, 24, 32, 48, 64, 96, 128, 256, 512)
$iconsDir = "${linuxIconsDir.replace(/\\/g, '\\\\')}"

$baseBitmap = [System.Drawing.Image]::FromFile($source)

foreach ($size in $sizes) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.DrawImage($baseBitmap, 0, 0, $size, $size)
  $target = Join-Path $iconsDir ($size.ToString() + "x" + $size.ToString() + ".png")
  $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
  if ($size -eq 512) {
    $bitmap.Save($buildIcon, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  $graphics.Dispose()
  $bitmap.Dispose()
}

$baseBitmap.Dispose()
`;

execFileSync(
  'powershell.exe',
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', powershellScript],
  { stdio: 'inherit' }
);

console.log('Generated cross-platform icons in build/icons and build/icon.png');
