# AI contributor instructions

Read [docs/engineering/SFW_AI_ENGINEERING_STANDARD.md](docs/engineering/SFW_AI_ENGINEERING_STANDARD.md), version 1.1.0, as the canonical policy. The user's instructions take precedence over local workflow guidance. Do not add conversation content to memory.

## Project and scope

- Browser-only DNS conversion tool; static assets are published from `public/`.
- Profiles B + D. Assess change risk independently; parser changes can be T2 even when the page is small.
- Keep pure conversion logic separate from DOM/export adapters. No framework or build pipeline is needed.
- Read `ARCHITECTURE.md`, `CHANGELOG.md`, `SECURITY.md`, `docs/known-issues.md` and `docs/testing.md` before editing.
- Do not treat compatibility snapshots of known defects as proof of DNS correctness. Do not regenerate them merely to make tests pass.
- Both conversion tabs are implemented in 0.2.0-alpha.1. Read `docs/format-contract.md` before modifying either parser.
- Host input uses domain-aware FQDN convenience; BIND names follow strict master-file relative-name rules. Do not mix these policies.
- Invalid input blocks export. Keep resource limits, bounded CNAME resolution and per-tab state intact.

## Commands

Requires Node 22+; CI uses Node 24. No npm dependencies are installed.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run test:coverage
npm run test:bind
npm run test:browser
node scripts/security-scan.mjs --self-test
node scripts/security-scan.mjs
python3 -m http.server 8000 --bind 127.0.0.1 --directory public
```

`test:bind` requires `named-checkzone` (or `BIND_CHECKZONE`); security commands require Semgrep 1.183.0. `test:browser` is optional local tooling and requires an existing Playwright module/browsers; set `PLAYWRIGHT_MODULE` to its `index.mjs` if needed. Missing tools fail instead of silently skipping. See the verification report for what actually ran.

Playwright is intentionally disabled in CI by explicit owner instruction. Record the gap using EX-001 in `docs/engineering/EXCEPTIONS.md`; do not re-enable it or add hidden browser downloads without a new user decision.

Do not push, open PRs, merge, tag, publish, alter repository permissions or apply DNS changes unless explicitly authorised. Preparing code does not authorise deploying it. Preserve unrelated work and report checks actually run, inherited defects and remaining limits.
