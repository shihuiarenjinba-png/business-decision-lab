from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = ROOT / ".github" / "workflows"

SECRET_PATTERNS = {
    "Stripe secret key": re.compile(r"\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b"),
    "Stripe webhook secret": re.compile(r"\bwhsec_[A-Za-z0-9]{16,}\b"),
    "GitHub token": re.compile(r"\b(?:ghp_|github_pat_)[A-Za-z0-9_]{16,}\b"),
    "Literal bearer token": re.compile(r"Authorization:\s*Bearer\s+(?!\$|\$\{)[A-Za-z0-9._~-]{20,}"),
}
USES_RE = re.compile(r"^\s*-?\s*uses:\s*([^\s#]+)", re.MULTILINE)
FULL_SHA_RE = re.compile(r"^[0-9a-f]{40}$")


def tracked_text_files() -> list[Path]:
    output = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    result: list[Path] = []
    for raw in output.split(b"\0"):
        if not raw:
            continue
        path = ROOT / raw.decode("utf-8", "surrogateescape")
        if path.is_file():
            result.append(path)
    return result


def scan_secrets(errors: list[str]) -> None:
    for path in tracked_text_files():
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        relative = path.relative_to(ROOT)
        for label, pattern in SECRET_PATTERNS.items():
            if pattern.search(text):
                errors.append(f"{relative}: possible committed {label}")


def scan_workflows(errors: list[str]) -> None:
    for path in sorted(WORKFLOWS.glob("*.y*ml")):
        text = path.read_text(encoding="utf-8")
        relative = path.relative_to(ROOT)

        if "\npermissions:" not in text:
            errors.append(f"{relative}: explicit top-level permissions block is required")
        if "pull_request_target:" in text:
            errors.append(f"{relative}: pull_request_target is forbidden")
        if re.search(r"\bsecrets:\s*inherit\b", text):
            errors.append(f"{relative}: secrets: inherit is forbidden; pass named secrets")
        if "wrangler@latest" in text:
            errors.append(f"{relative}: wrangler@latest is forbidden; pin an exact version")

        for match in USES_RE.finditer(text):
            target = match.group(1)
            if target.startswith("./") or target.startswith("docker://"):
                continue
            if "@" not in target:
                errors.append(f"{relative}: action reference has no immutable ref: {target}")
                continue
            ref = target.rsplit("@", 1)[1]
            if not FULL_SHA_RE.fullmatch(ref):
                errors.append(f"{relative}: action must be pinned to a full 40-char SHA: {target}")

        if "STRIPE_LIVE_SECRET_KEY" in text:
            is_readonly_check = path.name == "connectivity-check.yml"
            is_production_gated = "environment: production" in text and "workflow_dispatch:" in text
            if not (is_readonly_check or is_production_gated):
                errors.append(
                    f"{relative}: LIVE Stripe secret may only be used by the read-only connectivity check "
                    "or an explicitly gated production workflow"
                )


def main() -> int:
    errors: list[str] = []
    scan_secrets(errors)
    scan_workflows(errors)
    if errors:
        print("SECURITY_GUARD_FAILED")
        for error in errors:
            print(f"- {error}")
        return 1
    print("SECURITY_GUARD_PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
