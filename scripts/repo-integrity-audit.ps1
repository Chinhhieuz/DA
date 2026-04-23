param(
  [string]$BaseBranch = "main"
)

$ErrorActionPreference = "Stop"

function Test-GitRef {
  param([string]$RefName)
  & git rev-parse --verify --quiet "$RefName`^{commit}" 1>$null 2>$null
  return $LASTEXITCODE -eq 0
}

Write-Host "=== Repo Integrity Audit ==="
Write-Host "Base branch: $BaseBranch"
Write-Host ""

if (-not (Test-GitRef "HEAD")) {
  Write-Error "Not a git repository."
  exit 2
}

$excluded = "\\node_modules\\|\\dist\\|\\.git\\|\\coverage\\"
$conflicts = Get-ChildItem -Recurse -File |
  Where-Object { $_.FullName -notmatch $excluded } |
  Select-String -Pattern '^(<<<<<<< HEAD|=======|>>>>>>>)$'

if ($conflicts) {
  Write-Host "[FAIL] Merge conflict markers found:"
  $conflicts | ForEach-Object {
    Write-Host ("  {0}:{1} {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim())
  }
  $hasConflictMarkers = $true
} else {
  Write-Host "[OK] No unresolved merge conflict markers in working tree."
  $hasConflictMarkers = $false
}

Write-Host ""

$candidateBranches = @(
  "fix",
  "main",
  "origin/fix",
  "origin/main",
  "origin/AI",
  "origin/update_comment",
  "origin/clean_architecture",
  "origin/feature/comments",
  "origin/route/update"
) | Where-Object { Test-GitRef $_ } | Select-Object -Unique

Write-Host "=== Branch Divergence vs $BaseBranch ==="
foreach ($branch in $candidateBranches) {
  if ($branch -eq $BaseBranch) {
    Write-Host ("  {0}: in sync with itself" -f $branch)
    continue
  }

  $counts = (& git rev-list --left-right --count "$BaseBranch...$branch").Trim().Split()
  $baseOnly = [int]$counts[0]
  $branchOnly = [int]$counts[1]
  Write-Host ("  {0}: base-only={1}, branch-only={2}" -f $branch, $baseOnly, $branchOnly)
}

Write-Host ""

$criticalFiles = @(
  "Backend/controllers/authController.js",
  "Backend/controllers/postingController.js",
  "Backend/controllers/commentController.js",
  "Backend/socket.js"
)

Write-Host "=== Critical File Version Matrix ==="
foreach ($file in $criticalFiles) {
  Write-Host ("`n[file] {0}" -f $file)
  $hashSet = New-Object System.Collections.Generic.HashSet[string]

  foreach ($branch in $candidateBranches) {
    & git cat-file -e "$branch`:$file" 2>$null
    if ($LASTEXITCODE -ne 0) {
      Write-Host ("  {0}: <missing>" -f $branch)
      continue
    }

    $hash = (& git rev-parse "$branch`:$file").Trim()
    $size = (& git cat-file -s "$branch`:$file").Trim()
    [void]$hashSet.Add($hash)
    Write-Host ("  {0}: {1} ({2} bytes)" -f $branch, $hash, $size)
  }

  if ($hashSet.Count -gt 1) {
    Write-Host ("  -> WARNING: {0} distinct versions detected." -f $hashSet.Count)
  } else {
    Write-Host "  -> OK: Single version across inspected branches."
  }
}

Write-Host ""
if ($hasConflictMarkers) {
  Write-Host "Audit result: FAILED (unresolved merge markers present)."
  exit 1
}

Write-Host "Audit result: PASSED (no unresolved markers)."
exit 0
