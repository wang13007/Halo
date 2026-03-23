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

exit $exitCode
