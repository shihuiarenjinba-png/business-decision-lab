# Repository administrator hardening

The tracked automation code is hardened by CI, but two repository-level controls require GitHub repository administration permission:

1. protect main with a repository ruleset;
2. configure the production deployment environment.

Run the checked-in PowerShell helper with a GitHub CLI login that owns or administers the repository.

PowerShell:

    gh auth status
    pwsh -File .\scripts\admin\harden-github.ps1

The script is idempotent. It creates or updates:

- a production GitHub Environment;
- a production branch policy that permits only main;
- an explicit deployment review by the authenticated repository owner;
- an active main-branch ruleset;
- pull-request-only updates to main;
- required checks test and security-guard;
- force-push prevention;
- branch deletion prevention.

The script does not read or modify GitHub Actions secret values.

Because this repository currently has a single primary operator, the ruleset requires the PR path and required CI checks but zero separate PR approvals. The production environment still requires an explicit deployment approval. If another trusted maintainer is added later, increase the PR approval requirement and enable prevention of self-review for production.
