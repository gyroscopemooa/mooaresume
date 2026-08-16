$project = (Get-Location).Path
$cloudflared = Join-Path $env:LOCALAPPDATA "cloudflared.exe"
if (-not (Test-Path $cloudflared)) { throw "cloudflared.exe not found in LOCALAPPDATA" }
Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location -LiteralPath '$project'; npm run dev" -WorkingDirectory $project
Start-Sleep -Seconds 3
Write-Host "Starting Cloudflare Quick Tunnel for http://localhost:3000..." -ForegroundColor Green
& $cloudflared tunnel --protocol http2 --url http://localhost:3000