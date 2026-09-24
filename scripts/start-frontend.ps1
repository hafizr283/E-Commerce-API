$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeExecutable = (Get-Command node -ErrorAction Stop).Source
$nodeMajor = [int]((& $nodeExecutable -p 'process.versions.node.split(".")[0]') | Select-Object -First 1)
if ($nodeMajor -lt 22) {
    $bundledNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
    if (Test-Path -LiteralPath $bundledNode) { $nodeExecutable = $bundledNode }
    else { throw 'Install Node 24.15 or later, then run npm ci in frontend.' }
}
Push-Location -LiteralPath (Join-Path $projectRoot 'frontend')
try {
    if (!(Test-Path -LiteralPath 'node_modules/@angular/cli/bin/ng.js')) { throw 'Run npm ci in frontend using Node 24.15 or later first.' }
    & $nodeExecutable node_modules/@angular/cli/bin/ng.js serve --host 127.0.0.1 --port 4200 --proxy-config proxy.conf.json
    exit $LASTEXITCODE
} finally { Pop-Location }
