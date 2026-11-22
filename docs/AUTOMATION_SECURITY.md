# Automation security architecture

## Goal

GitHub Actions is the orchestration layer. Cloudflare and Stripe credentials remain outside tracked source code and are injected only at runtime through named GitHub Secrets.

## Trust boundaries

- Repository Variables contain non-secret identifiers only.
- Repository Secrets contain Cloudflare API tokens and Stripe secret keys.
- Cloudflare Pages Secrets contain runtime application secrets such as Stripe API keys and webhook signing secrets.
- Preview and production are separate security domains.
- LIVE Stripe mutation is fail-closed until a production workflow explicitly targets the GitHub `production` environment.

## Required GitHub variables

- `CF_ACCOUNT_A_ID`
- `CF_ACCOUNT_B_ID`
- `STRIPE_ACCOUNT_ID`

## Required GitHub secrets

- `CF_ACCOUNT_A_API_TOKEN`
- `CF_ACCOUNT_B_API_TOKEN`
- `STRIPE_TEST_SECRET_KEY`
- `STRIPE_LIVE_SECRET_KEY`

Secret values must never be committed, echoed, copied into workflow YAML, or placed in repository Variables.

## Workflow policy

1. Every workflow declares explicit least-privilege `permissions`.
2. External actions are pinned to full commit SHAs.
3. Wrangler is pinned to an exact version.
4. `pull_request_target` is forbidden.
5. `secrets: inherit` is forbidden. Reusable workflows receive named secrets only.
6. Preview deployment must pass application tests before Cloudflare mutation.
7. Stripe TEST bootstrap is manual-only and idempotent.
8. If a Stripe webhook already exists but the matching Cloudflare signing-secret binding is missing, automation stops instead of guessing.
9. Stripe LIVE credentials are read-only in connectivity checks until a production-gated workflow is introduced.
10. Security-sensitive files are covered by CODEOWNERS.

## Production gate

Production deployment should use a GitHub Environment named `production`, with deployment protection enabled. The production workflow must also require an explicit confirmation input and must not be triggered by pull requests.

## Rotation

If any credential is suspected to be exposed:

1. Revoke or rotate it at the provider.
2. Replace the GitHub Secret.
3. Replace the corresponding Cloudflare runtime secret when applicable.
4. Run the connectivity check.
5. Run preview E2E before restoring production operations.
