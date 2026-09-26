# Compiles src\ into one standalone file: learn-git-win.html
# Run it with:  .\build.ps1   (or double-click build.cmd, which skips the
# "running scripts is disabled on this system" error for this one script)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$src = Join-Path $root 'src'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-Bundle($folder, $filter, $banner) {
    $parts = foreach ($f in Get-ChildItem -Path (Join-Path $src $folder) -Filter $filter | Sort-Object Name) {
        $banner -f $f.Name
        [System.IO.File]::ReadAllText($f.FullName, $utf8).Trim()
    }
    $parts -join "`n"
}

$html = [System.IO.File]::ReadAllText((Join-Path $src 'template.html'), $utf8)
$pieces = [ordered]@{
    '/*@CSS@*/'         = Get-Bundle 'styles' '*.css' '/* {0} */'
    '<!--@CHAPTERS@-->' = Get-Bundle 'chapters' '*.html' '<!-- {0} -->'
    '/*@JS@*/'          = Get-Bundle 'scripts' '*.js' '/* {0} */'
}
foreach ($marker in $pieces.Keys) {
    if (-not $html.Contains($marker)) { throw "template.html is missing the $marker marker" }
    $html = $html.Replace($marker, $pieces[$marker])
}
$out = Join-Path $root 'learn-git-win.html'
[System.IO.File]::WriteAllText($out, $html.Replace("`r`n", "`n"), $utf8)
Write-Host ("Built learn-git-win.html ({0} KB)" -f [math]::Floor((Get-Item $out).Length / 1KB))
