# Foundation verification — 30 October 2026

## Outcome and scope

Prepared `0.1.0-alpha.1` as an **unreleased, untagged** source package based on GitHub commit `94a83854a5f55997a75726cabd46db4e6c2c96b6`. The six-commit history, empty tag refs and empty GitHub release list were inspected before writing the changelog. No historical release versions were invented.

Completed the requested foundation stage: a history-based changelog, asset/module separation, favicon and maintained unit tests, with initial SFW delivery/security checks. Feature 2 (tabs and BIND → `/etc/hosts`) remains planned. Profiles B + D apply; the review uses T2 conservatively because parser code and delivery boundaries are involved.

## Files and design

| Files | Change |
| --- | --- |
| `public/index.html` | Removed inline CSS/scripts/handlers; added local asset references, favicon, export-button state and status feedback. |
| `public/assets/css/styles.css` | Extracted presentation with small disabled/status styles. |
| `public/assets/js/core.js` | Extracted original conversion logic with explicit domain/time parameters and no DOM/cache dependency. |
| `public/assets/js/converter.js` | Added coherent conversion results and filename/content selection. |
| `public/assets/js/ui.js`, `app.js` | Added event/API adapters and browser setup. |
| `public/assets/images/favicon.svg` | Added local vector favicon. |
| `package.json`, `package-lock.json`, `.gitignore` | Added dependency-free Node test commands and development output exclusions. |
| `tests/unit/*.test.mjs` | Added 50 tests with no skipped/TODO cases. |
| `tests/fixtures/legacy/*` | Captured nine original-output cases with source-commit and fixed-clock provenance. |
| `scripts/check-source.mjs`, `check-bind.mjs`, `security-scan.mjs` | Added source checks, independent DNS fixtures and a fail-closed targeted scanner wrapper. |
| `.semgrep.yml`, `.github/workflows/static.yml` | Added local rules, a synthetic gate test and validation-gated deployment with SHA-pinned actions. |
| `CHANGELOG.md`, `ARCHITECTURE.md`, `README.md`, `ROADMAP.md` | Added/updated source history, current design, usage and staged extension plan. |
| `AGENTS.md`, `SECURITY.md`, `docs/engineering/*`, `docs/testing.md`, `docs/known-issues.md`, `docs/threat-model.md`, this file | Added engineering guidance, explicit exception and review evidence. |

## Commands and observed results

Authoring runtime: Node `v24.22.1`; installed scanner: Semgrep `1.183.0` in a temporary isolated environment outside the deliverable.

| Check / command | Result | Practical limit |
| --- | --- | --- |
| GitHub history/ref/release inspection | PASS | Read-only inspection; no tags/releases created. |
| `npm ci --ignore-scripts --no-audit --no-fund` | PASS | No npm runtime/dev dependencies. |
| `npm run check` | PASS | Focused source/syntax checks and all 50 unit tests. Not a full language/style lint suite. |
| `npm run test:coverage` | PASS | 100% measured lines in the imported core/converter/UI modules, 97.06% branches, 87.80% functions in this run. Browser entry-point execution is outside this measurement. Coverage is not correctness proof. |
| Nine legacy output comparisons within `npm test` | PASS | Include/full output, comments/filtering, absolute names, duplicates, empty input and three labelled inherited-defect cases. |
| `SEMGREP=<isolated-path> node scripts/security-scan.mjs --self-test` | PASS | Actual scanner rejected synthetic dynamic-code and fake-credential fixtures. |
| `SEMGREP=<isolated-path> node scripts/security-scan.mjs` | PASS | Zero findings under four targeted local rules; critical core/UI files were confirmed included. Not comprehensive SAST or secret-history scanning. |
| YAML parsing and workflow dependency review | PASS | Static validation of configuration; no hosted Actions run occurred. |
| Temporary Python HTTP-server asset check | PASS | Nested `/public/` URL loaded all six stylesheet/script/favicon assets/imports with appropriate JavaScript MIME types. No browser was launched. |
| HTML label/document-link checks; favicon XML parse | PASS | Structural checks only; no accessibility compliance claim. |
| `npm run test:bind` | BLOCKED / prerequisite failure | `named-checkzone` is unavailable. The command exited nonzero rather than skipping; the attempted package installation could not perform the environment's required privilege operations. No BIND parsing result is claimed. |
| Browser/Playwright, responsive and accessibility E2E | NOT RUN | Playwright CI disabled by owner direction; no browser binaries available locally. See EX-001. |
| Full dependency audit | N/A for npm graph | Zero npm dependencies; scanner Python transitive dependencies are not hash-locked/audited in this stage. |
| GitHub Actions execution and branch protection | NOT RUN / unverified | Prepared configuration has not been pushed. |

The shell emitted an environment-specific npm `http-proxy` configuration warning; npm commands still completed successfully. No test assertions or scanner severity were weakened to obtain these results.

## Findings and operational impact

- A-01–A-07 are inherited correctness/validation debt. They remain open and are tracked in `docs/known-issues.md`; a golden-test pass does not mark them fixed.
- A-08 is fixed: captured settings prevent stale filename mismatches, blank exports are unavailable, and export failures produce recovery feedback. Regression tests cover the changed paths.
- A-09 is addressed in source configuration, while hosted enforcement remains unverified. Deployment now depends on all configured validation jobs; branch-required checks still need maintainer configuration/verification.
- There is no network/storage feature, backend, production DNS mutation or new runtime dependency. The app now needs HTTP/HTTPS locally because its JavaScript uses ES modules.
- The public artifact remains `public/` only. The source package has not been pushed, published or deployed; no repository settings or production systems were changed.

## Gate and approval status

Local source/unit and targeted-security checks passed. Independent BIND execution and real-browser verification have not passed in this authoring environment. The first hosted workflow run is still outstanding. **Do not treat this report as full release readiness.**

EX-001 records only the owner's existing direction to disable Playwright in CI, with a review checkpoint before feature 2 or on 2026-11-30. It is not acceptance of inherited DNS defects or an exception for scanner failures. No external tickets, risk acceptance or owner approval to release selected T2 changes were created by this work.

The application can be rolled back by restoring reviewed source and performing a separately authorised deployment. Installed DNS files are independent of the web app and require their own backups/change process. The next work is to run the prepared hosted checks, review inherited DNS correctness issues and revisit browser coverage before feature 2.
