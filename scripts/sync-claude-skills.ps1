<#
.SYNOPSIS
Sync skills from claude-sdlc into the current project, governed by claude-skills.lock.

.DESCRIPTION
Reads claude-skills.lock in the current directory, copies skills from the source claude-sdlc
working tree into .claude/skills/, and updates the lock file with the source repo's HEAD commit SHA.

Skills marked local_modifications=true are skipped with a warning unless -Force is passed.
Use -Force only after manually re-applying your local modifications onto the upstream version.

.PARAMETER LockFile
Path to the lock file. Default: claude-skills.lock

.PARAMETER DryRun
Show what would change without writing files.

.PARAMETER Force
Overwrite skills marked local_modifications=true.

.PARAMETER NoClaudeMdCheck
Skip the post-sync check that compares lock-file skills against the project's
CLAUDE.md skills table. Default: check is enabled.

.EXAMPLE
.\scripts\sync-claude-skills.ps1
.\scripts\sync-claude-skills.ps1 -DryRun
.\scripts\sync-claude-skills.ps1 -Force
.\scripts\sync-claude-skills.ps1 -NoClaudeMdCheck

.NOTES
See docs/skills-sharing.md in claude-sdlc for the convention this script implements.
#>
[CmdletBinding()]
param(
    [string]$LockFile = "claude-skills.lock",
    [switch]$DryRun,
    [switch]$Force,
    [switch]$NoClaudeMdCheck
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $LockFile)) {
    Write-Error "Lock file not found: $LockFile (cwd: $PWD)"
    exit 1
}

$lock = Get-Content $LockFile -Raw | ConvertFrom-Json
$sourceDir = $lock.source_local_path

if (-not (Test-Path $sourceDir)) {
    Write-Error "Source repo not found at '$sourceDir'. Update source_local_path in $LockFile."
    exit 1
}

Push-Location $sourceDir
try {
    $sourceCommit = (git rev-parse HEAD).Trim()
    $sourceBranch = (git rev-parse --abbrev-ref HEAD).Trim()
} finally {
    Pop-Location
}

if ($sourceBranch -ne $lock.default_branch) {
    Write-Warning "Source repo is on branch '$sourceBranch', expected '$($lock.default_branch)'. Continuing -- verify this is intentional."
}

$updated = @()
$skipped = @()
$missing = @()
$nowIso = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

foreach ($skillName in @($lock.skills.PSObject.Properties.Name)) {
    $entry = $lock.skills.$skillName
    $srcFile = Join-Path $sourceDir ".claude\skills\$skillName\SKILL.md"
    $dstDir  = ".claude\skills\$skillName"
    $dstFile = Join-Path $dstDir "SKILL.md"

    if (-not (Test-Path $srcFile)) {
        Write-Host "[MISSING] $skillName -- source file not found at $srcFile" -ForegroundColor Red
        $missing += $skillName
        continue
    }

    if ($entry.local_modifications -and -not $Force) {
        $reason = if ($entry.modification_reason) { $entry.modification_reason } else { "(no reason recorded)" }
        Write-Host "[SKIP-LOCAL] $skillName -- local_modifications=true. Reason: $reason" -ForegroundColor Yellow
        $skipped += $skillName
        continue
    }

    if ($DryRun) {
        Write-Host "[DRY] Would copy $srcFile -> $dstFile" -ForegroundColor Cyan
        $updated += $skillName
        continue
    }

    if (-not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
    }
    Copy-Item $srcFile $dstFile -Force

    $entry.synced_from_commit = $sourceCommit
    $entry.synced_at = $nowIso
    Write-Host "[SYNCED] $skillName from $sourceCommit" -ForegroundColor Green
    $updated += $skillName
}

if (-not $DryRun -and $updated.Count -gt 0) {
    $lock.last_synced_at = $nowIso
    # Write JSON without BOM for cross-platform git compatibility
    $json = $lock | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText((Resolve-Path $LockFile).Path, $json, (New-Object System.Text.UTF8Encoding $false))
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Green
Write-Host "Source: $sourceDir @ $sourceCommit (branch: $sourceBranch)"
Write-Host "Updated: $($updated.Count) skills"
Write-Host "Skipped: $($skipped.Count) skills (local modifications)"
Write-Host "Missing: $($missing.Count) skills (source file not found)"
if ($DryRun) { Write-Host "(dry run -- no files written)" -ForegroundColor Cyan }

# CLAUDE.md skills table check (advisory; never edits the file)
if (-not $NoClaudeMdCheck) {
    $claudeMdPath = $null
    foreach ($candidate in @("CLAUDE.md", ".claude\CLAUDE.md")) {
        if (Test-Path $candidate) {
            $content = Get-Content $candidate -Raw
            # Look for a markdown table cell containing a slash-prefixed skill name
            if ($content -match '\|\s*`/[\w-]+`') {
                $claudeMdPath = $candidate
                break
            }
        }
    }

    if ($claudeMdPath) {
        $claudeMdContent = Get-Content $claudeMdPath -Raw
        $undocumented = @()
        foreach ($skillName in @($lock.skills.PSObject.Properties.Name)) {
            $trigger = "/$skillName"
            # Match the trigger as a whole token (avoid /architect matching /aws-architect)
            if ($claudeMdContent -notmatch ('`' + [regex]::Escape($trigger) + '`')) {
                $undocumented += $skillName
            }
        }

        if ($undocumented.Count -gt 0) {
            Write-Host ""
            Write-Host "=== CLAUDE.md skills table check ===" -ForegroundColor Yellow
            Write-Host "Found skills table in $claudeMdPath, but these skills are NOT listed:"
            foreach ($skill in $undocumented) {
                $skillFile = Join-Path $sourceDir ".claude\skills\$skill\SKILL.md"
                $description = ""
                if (Test-Path $skillFile) {
                    $skillContent = Get-Content $skillFile -Raw
                    if ($skillContent -match '(?ms)^---\s*$.*?^description:\s*["'']?(.+?)["'']?\s*$') {
                        $description = $Matches[1].Trim()
                        if ($description.Length -gt 80) {
                            $description = $description.Substring(0, 77) + "..."
                        }
                    }
                }
                Write-Host "  - /$skill"
                Write-Host "    Suggested row: | ``/$skill`` | <trigger> | $description |"
            }
            Write-Host "Add these rows to $claudeMdPath manually (table schema varies; auto-edit is unsafe)."
        }
    } else {
        Write-Host "(CLAUDE.md skills table not found -- skipping documentation check)" -ForegroundColor DarkGray
    }
}

if ($missing.Count -gt 0) { exit 2 }
