import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const windowsIconSizes = [16, 24, 32, 48, 64, 96, 128, 256];
const pngFrames = windowsIconSizes.map((size) => {
  const filePath = path.join(linuxIconsDir, `${size}x${size}.png`);
  if (!existsSync(filePath)) {
    throw new Error(`Generated icon frame not found: ${filePath}`);
  }

  return {
    size,
    buffer: readFileSync(filePath),
  };
});

const headerSize = 6;
const entrySize = 16;
let imageOffset = headerSize + entrySize * pngFrames.length;
const icoParts = [Buffer.alloc(headerSize + entrySize * pngFrames.length)];

icoParts[0].writeUInt16LE(0, 0);
icoParts[0].writeUInt16LE(1, 2);
icoParts[0].writeUInt16LE(pngFrames.length, 4);

pngFrames.forEach((frame, index) => {
  const entryOffset = headerSize + entrySize * index;
  icoParts[0].writeUInt8(frame.size === 256 ? 0 : frame.size, entryOffset);
  icoParts[0].writeUInt8(frame.size === 256 ? 0 : frame.size, entryOffset + 1);
  icoParts[0].writeUInt8(0, entryOffset + 2);
  icoParts[0].writeUInt8(0, entryOffset + 3);
  icoParts[0].writeUInt16LE(1, entryOffset + 4);
  icoParts[0].writeUInt16LE(32, entryOffset + 6);
  icoParts[0].writeUInt32LE(frame.buffer.length, entryOffset + 8);
  icoParts[0].writeUInt32LE(imageOffset, entryOffset + 12);
  imageOffset += frame.buffer.length;
  icoParts.push(frame.buffer);
});

writeFileSync(path.join(buildDir, 'icon.ico'), Buffer.concat(icoParts));

console.log('Generated cross-platform icons in build/icons, build/icon.png, and build/icon.ico');
