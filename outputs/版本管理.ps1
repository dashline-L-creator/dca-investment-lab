$priorGlobal = $env:GIT_CONFIG_GLOBAL
$priorSystem = $env:GIT_CONFIG_SYSTEM
$priorLocation = Get-Location
try {
    $env:GIT_CONFIG_GLOBAL = 'NUL'
    $env:GIT_CONFIG_SYSTEM = 'NUL'
    Set-Location -LiteralPath (Split-Path $PSScriptRoot -Parent)
    if ($args.Count -eq 0) { & git log --oneline --decorate -8 } else { & git @args }
} finally {
    $env:GIT_CONFIG_GLOBAL = $priorGlobal
    $env:GIT_CONFIG_SYSTEM = $priorSystem
    Set-Location -LiteralPath $priorLocation
}
