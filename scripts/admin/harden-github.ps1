param(
  [string]$Repo = "shihuiarenjinba-png/business-decision-lab"
)

$ErrorActionPreference = "Stop"

function Invoke-GhJson {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Body
  )

  $json = $Body | ConvertTo-Json -Depth 20 -Compress
  $json | gh api --method $Method -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2026-03-10" $Path --input -
}

Write-Host "Checking GitHub CLI authentication..."
gh auth status | Out-Host

Write-Host "Resolving authenticated GitHub user..."
$me = gh api user | ConvertFrom-Json
if (-not $me.id) {
  throw "Could not resolve authenticated GitHub user ID."
}

Write-Host "Creating or updating production environment..."
$environmentBody = @{
  wait_timer = 0
  prevent_self_review = $false
  reviewers = @(
    @{
      type = "User"
      id = [int64]$me.id
    }
  )
  deployment_branch_policy = @{
    protected_branches = $false
    custom_branch_policies = $true
  }
}

Invoke-GhJson -Method "PUT" -Path "/repos/$Repo/environments/production" -Body $environmentBody | Out-Null

Write-Host "Ensuring production environment only accepts main..."
$policies = gh api "/repos/$Repo/environments/production/deployment-branch-policies" | ConvertFrom-Json
$hasMain = $false
foreach ($branchPolicy in $policies.branch_policies) {
  if ($branchPolicy.name -eq "main" -and $branchPolicy.type -eq "branch") {
    $hasMain = $true
  }
}

if (-not $hasMain) {
  $policyBody = @{
    name = "main"
    type = "branch"
  }
  Invoke-GhJson -Method "POST" -Path "/repos/$Repo/environments/production/deployment-branch-policies" -Body $policyBody | Out-Null
}

Write-Host "Creating or updating main branch ruleset..."
$rulesetName = "Protect main automation"
$rulesets = gh api "/repos/$Repo/rulesets" | ConvertFrom-Json
$existing = $rulesets | Where-Object { $_.name -eq $rulesetName } | Select-Object -First 1

$rulesetBody = @{
  name = $rulesetName
  target = "branch"
  enforcement = "active"
  conditions = @{
    ref_name = @{
      include = @("refs/heads/main")
      exclude = @()
    }
  }
  rules = @(
    @{
      type = "deletion"
    },
    @{
      type = "non_fast_forward"
    },
    @{
      type = "pull_request"
      parameters = @{
        allowed_merge_methods = @("merge", "squash", "rebase")
        dismiss_stale_reviews_on_push = $true
        require_code_owner_review = $false
        require_last_push_approval = $false
        required_approving_review_count = 0
        required_review_thread_resolution = $true
      }
    },
    @{
      type = "required_status_checks"
      parameters = @{
        do_not_enforce_on_create = $true
        strict_required_status_checks_policy = $true
        required_status_checks = @(
          @{ context = "test" },
          @{ context = "security-guard" }
        )
      }
    }
  )
}

if ($existing) {
  Invoke-GhJson -Method "PUT" -Path "/repos/$Repo/rulesets/$($existing.id)" -Body $rulesetBody | Out-Null
  Write-Host "Updated ruleset: $rulesetName"
}
else {
  Invoke-GhJson -Method "POST" -Path "/repos/$Repo/rulesets" -Body $rulesetBody | Out-Null
  Write-Host "Created ruleset: $rulesetName"
}

Write-Host "Verifying effective repository rulesets..."
gh api "/repos/$Repo/rulesets" | Out-Host

Write-Host "Repository administration hardening complete."
Write-Host "Production environment: protected and restricted to main."
Write-Host "Main branch: pull request required, force-push/deletion blocked, test + security-guard required."
