# Video Convert - Deployment Package Preparer (Solution B)
# This version uses English logic to avoid PowerShell 5.1 encoding issues

$ErrorActionPreference = "Stop"

Write-Host "--- STEP 1: Building project ---" -ForegroundColor Cyan
try {
    npm run build:prod
} catch {
    Write-Host "ERROR: Build failed. Please check your code." -ForegroundColor Red
    exit 1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "--- STEP 2: Preparing directory ---" -ForegroundColor Cyan
$deployDir = "deploy-runtime-pkg"
$deployPath = Join-Path $PWD $deployDir

if (Test-Path $deployPath) {
    Remove-Item -Path $deployPath -Recurse -Force
}
New-Item -ItemType Directory -Path $deployPath | Out-Null

Write-Host "--- STEP 3: Copying files ---" -ForegroundColor Cyan
if (-not (Test-Path "dist-web")) { Write-Host "Missing dist-web"; exit 1 }
if (-not (Test-Path "dist-server")) { Write-Host "Missing dist-server"; exit 1 }

Copy-Item -Path "dist-web" -Destination (Join-Path $deployPath "dist-web") -Recurse -Force
Copy-Item -Path "dist-server" -Destination (Join-Path $deployPath "dist-server") -Recurse -Force
Copy-Item -Path "public" -Destination (Join-Path $deployPath "public") -Recurse -Force
Copy-Item -Path "package.json" -Destination $deployPath -Force
Copy-Item -Path "package-lock.json" -Destination $deployPath -Force

if (Test-Path "Dockerfile.runtime") {
    Copy-Item -Path "Dockerfile.runtime" -Destination (Join-Path $deployPath "Dockerfile") -Force
}

Write-Host "--- STEP 4: Generating config ---" -ForegroundColor Cyan
$ignoreList = @("node_modules", "*.log", ".git", "uploads", "converted")
$ignoreList | Set-Content -Path (Join-Path $deployPath ".dockerignore")

Write-Host ""
Write-Host "SUCCESS! Deployment package is ready in: $deployDir" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Zip the '$deployDir' folder."
Write-Host "2. Upload to BT Panel and unzip."
Write-Host "3. Create Docker project using the Dockerfile inside."
