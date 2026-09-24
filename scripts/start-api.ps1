$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectRoot
try { & .\mvnw.cmd spring-boot:run; exit $LASTEXITCODE } finally { Pop-Location }
