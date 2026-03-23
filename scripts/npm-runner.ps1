param(
  [Parameter(Mandatory = $true)]
  [string]$Tool,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$projectRoot = Split-Path -Parent $env:npm_package_json
$runnerPath = Join-Path $projectRoot 'scripts\run-local-cli.cjs'

& node $runnerPath $Tool @Args
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0 -and $Tool -eq 'vite' -and $Args.Length -gt 0 -and $Args[0] -eq 'build') {
  $builtHtmlPath = Join-Path $projectRoot 'dist\app.html'
  $indexHtmlPath = Join-Path $projectRoot 'dist\index.html'

  if (Test-Path $builtHtmlPath) {
    Copy-Item $builtHtmlPath $indexHtmlPath -Force
  }
}

exit $exitCode
