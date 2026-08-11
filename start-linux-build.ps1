$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$linuxAppDirWindows = Join-Path $projectRoot 'release_build_multi_platform\linux-unpacked'
$wslLinkWindows = 'E:\video-convert-wsl-link'

if (-not (Test-Path $linuxAppDirWindows)) {
  Write-Error "Linux build directory not found: $linuxAppDirWindows"
}

if (Test-Path $wslLinkWindows) {
  $existing = Get-Item $wslLinkWindows -Force
  if ($existing.Target -ne $projectRoot) {
    Remove-Item $wslLinkWindows -Force
  }
}

if (-not (Test-Path $wslLinkWindows)) {
  New-Item -ItemType Junction -Path $wslLinkWindows -Target $projectRoot | Out-Null
}

$linuxAppDirWsl = "/mnt/e/video-convert-wsl-link/release_build_multi_platform/linux-unpacked"

$bashScript = @"
set -e
cd '$linuxAppDirWsl'

existing_pid=`$(pgrep -f '/kunqiu-video-converter(--no-sandbox)?' | head -n 1 || true)
if [ -n "`$existing_pid" ]; then
  kill "`$existing_pid" || true
  sleep 1
fi

chmod +x ./kunqiu-video-converter ./chrome-sandbox
nohup ./kunqiu-video-converter --no-sandbox >/tmp/kunqiu-video-converter.out 2>/tmp/kunqiu-video-converter.err < /dev/null &
new_pid=`$!
echo "STARTED_PID=`$new_pid"
"@

$result = & wsl.exe -d Ubuntu -- bash -lc $bashScript
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  Write-Error "Failed to start Linux app via WSL."
}

Write-Output $result
Write-Output "Linux app start command sent. Logs:"
Write-Output "stdout: /tmp/kunqiu-video-converter.out"
Write-Output "stderr: /tmp/kunqiu-video-converter.err"
