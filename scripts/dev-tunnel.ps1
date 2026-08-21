$project = (Get-Location).Path
$cloudflared = Join-Path $env:LOCALAPPDATA "cloudflared.exe"
if (-not (Test-Path $cloudflared)) { throw "cloudflared.exe not found in LOCALAPPDATA" }
Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location -LiteralPath '$project'; npm run dev" -WorkingDirectory $project
Start-Sleep -Seconds 3
Write-Host "Starting fixed Cloudflare Tunnel at https://local.mooaresume.com ..." -ForegroundColor Green
& $cloudflared tunnel run mooaresume-dev