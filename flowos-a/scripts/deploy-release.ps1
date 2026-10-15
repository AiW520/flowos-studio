param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9]{14}$')]
  [string]$ReleaseId,
  [string]$Server = 'aliyun-server'
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$standalone = Join-Path $root '.next/standalone'
$static = Join-Path $root '.next/static'
$media = Join-Path $root 'public/media'
$archive = Join-Path $root "flowos-lumen-$ReleaseId.tgz"

if (-not (Test-Path (Join-Path $standalone 'server.js'))) { throw 'Run npm run build first.' }
if (-not (Test-Path (Join-Path $static 'chunks'))) { throw 'Missing Next static chunks.' }
if (-not (Test-Path (Join-Path $media 'product-closeup.png'))) { throw 'Missing product visual.' }

$staticTarget = Join-Path $standalone '.next/static'
$mediaTarget = Join-Path $standalone 'public/media'
New-Item -ItemType Directory -Force -Path $staticTarget, $mediaTarget | Out-Null
Copy-Item -Recurse -Force (Join-Path $static '*') $staticTarget
Copy-Item -Force (Join-Path $media '*') $mediaTarget

tar -czf $archive --exclude='./.flowos-data' --exclude='./.env*' -C $standalone .
if ($LASTEXITCODE -ne 0) { throw 'Failed to package standalone build.' }
$entries = tar -tzf $archive
if ($LASTEXITCODE -ne 0 -or -not ($entries -match '^\./\.next/static/chunks/') -or -not ($entries -contains './public/media/product-closeup.png')) {
  throw 'Release archive is missing required static assets.'
}
if ($entries -match '(^|/)\.flowos-data(/|$)|(^|/)\.env[^/]*$') {
  throw 'Release archive contains private data or environment files.'
}

scp $archive "${Server}:/opt/flowos-lumen/"
if ($LASTEXITCODE -ne 0) { throw 'Failed to upload archive.' }
scp (Join-Path $PSScriptRoot 'activate-release.sh') "${Server}:/opt/flowos-lumen/activate-release.sh"
if ($LASTEXITCODE -ne 0) { throw 'Failed to upload activation script.' }
$remote = "mkdir -p /opt/flowos-lumen/releases/$ReleaseId && tar -xzf /opt/flowos-lumen/flowos-lumen-$ReleaseId.tgz -C /opt/flowos-lumen/releases/$ReleaseId && bash /opt/flowos-lumen/activate-release.sh $ReleaseId"
ssh $Server $remote
if ($LASTEXITCODE -ne 0) { throw 'Activation failed; check server logs and previous release.' }
