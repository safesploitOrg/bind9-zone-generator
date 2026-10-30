# Verification — complete roadmap implementation

Prepared on **30 October 2026**, version **0.2.0-alpha.1**, unreleased/untagged.

## Outcome

All three functional roadmap stages are implemented: the existing foundation, DNS correctness fixes and the two-direction tabbed interface. Profiles B + D apply; this is a T2 parser-sensitive change. No push, tag, release, deployment, repository-setting change or production DNS/hosts mutation occurred.

The previous 0.1.0-alpha.1 suite passed 50 tests before changes. Eleven new correctness regressions were then observed failing against that code; they now pass. Original legacy fixture bytes were preserved, while current tests explicitly assert the corrected/rejected contracts. No failing test was silently disabled or converted into a skip.

## Executed verification

Runtime: Node **v24.22.1**, Semgrep **1.183.0**, BIND **9.18.39**.

| Check | Result | Evidence and boundary |
| --- | --- | --- |
| Baseline tests | PASS | Previous 50-test suite before edits; GitHub main still matched `94a8385`. |
| Pre-fix regressions | Expected FAIL before fix | All 11 correctness tests failed against the old conversion code. They pass now. |
| `npm ci --ignore-scripts --no-audit --no-fund` | PASS | Dependency-free package/lockfile; no npm runtime/dev dependencies. |
| `npm run check` | PASS | Focused source checks plus all **141 unit tests**, zero failed/skipped/TODO. |
| `npm run test:coverage` | PASS | Measured imported production modules: **99.70% lines, 94.48% branches, 97.18% functions**. Browser entry point and tooling are outside this measurement; coverage is not proof of correctness. |
| Malformed-input corpus | PASS | 400 deterministic inputs passed to each parser: 800 calls, controlled results/errors, no unexpected runtime crashes. |
| Resource/alias tests | PASS | Byte/line/name/token/depth/expansion limits, cached chains, loops, conflicts and bounded diagnostics. |
| `npm run test:bind` with `BIND_CHECKZONE` | PASS | Six generated /8,/16,/24 forward/reverse zones, one include-parent zone and one independent reference zone accepted; two deliberately invalid zones rejected. |
| Importer/BIND differential check | PASS | Same hosts mapping from the original reference zone and BIND canonicalisation. Separate manually written expected hosts fixture also passes. |
| `node scripts/security-scan.mjs --self-test` | PASS | Actual Semgrep rejected synthetic unsafe code and a fake credential. |
| `node scripts/security-scan.mjs` | PASS | Zero findings under four targeted rules; every production JS module was confirmed included. Not a comprehensive SAST/history audit. |
| Static HTML/YAML/SVG/Markdown checks | PASS | Unique IDs, labels, reciprocal tab/panel references, CSP declaration, SVG parsing, workflow/rule YAML and local documentation links. |
| HTTP asset graph | PASS | Index plus all 11 local stylesheet/script/favicon assets/imports served under a nested `/public/` URL, with JavaScript MIME types. No browser was involved. |
| Optional `npm run test:browser` | BLOCKED / prerequisite failure | Playwright module loaded, but no usable Chromium executable existed. Browser download attempts returned unusable archives. No browser journey executed. |
| Browser/a11y/native API matrix | NOT RUN | Suite is implemented for 3 engines × 3 viewports, tabs, actual downloads, simulated clipboard denial, stale/error state, labels, reduced motion and zoom. No visual/native pass is claimed. |
| Hosted Actions/protection | NOT RUN / unverified | No push occurred; required checks and environment rules need external verification. |

BIND was obtained by extracting official Ubuntu packages into a temporary tooling directory without installing system services; package SHA-256 values matched their repository metadata. `BIND_CHECKZONE` and a process-scoped library path selected that temporary executable. No validator binaries or Python scanner environment are included in the source ZIP.

The npm shell emitted an environment-specific `http-proxy` warning, while commands exited successfully. The failed browser attempt and its CI exception are recorded in EX-001, not hidden as a passing check.

## Behaviour, security and operations

- A-01–A-07 are corrected under the supported format contract: /8,/16,/24 reverse mapping, coherent names/header qualification, complete alias conflicts, explicit serial progression, strict settings/input handling and canonical comparisons.
- A-08 retains captured metadata and adds strict stale/error export blocking for separate tab states. Invalid conversion clears that tab's previous result; switching tabs preserves the other direction.
- A-09 is addressed in workflow source: source/unit, targeted-security and independent BIND jobs gate deployment. Hosted enforcement is still unverified.
- New BIND parsing is a separate module, with logical-token handling, bounded offline aliases, explicit unsupported-data notices and blocked include/generated directives. IPv6, arbitrary CIDR, complete BIND RDATA validation and lossless DNS/hosts round trips are not promised.
- Text sinks, local assets and a restrictive meta CSP protect the browser boundary at source level. The application introduces no backend, network/persistence feature, runtime dependency, installed-file write or DNS deployment capability.
- Installed serial state must be supplied after reload or zone changes. Page rollback cannot restore independently installed DNS/hosts files; those need their own change/backup process.

## Gate and release status

Local source/unit, targeted-security and BIND gates passed. Browser execution is **not verified**. The user's standing direction to keep Playwright disabled in CI remains in force; it was revisited before feature 2 and documented with the observed environment failure in [EX-001](engineering/EXCEPTIONS.md). Other controls were not waived.

No owner approval for a selected T2 public release is recorded. This deliverable is reviewable source, not a release-readiness declaration. The remaining steps are real-browser execution on a working machine, the first hosted workflow/protection verification after a separately authorised push, and owner review before publication.

The targeted SAST/credential rule set and scanner supply-chain controls remain limited as described in [testing.md](testing.md), [known-issues.md](known-issues.md) and [threat-model.md](threat-model.md). No external issues, security risk acceptance or blanket exceptions were invented.

## Exact source changes from 0.1.0-alpha.1

The following paths were added or modified; no files were removed. Historical fixture files and the canonical SFW standard remained unchanged.

### Added

- `docs/format-contract.md`
- `public/assets/js/bind-converter.js`
- `public/assets/js/bind-parser.js`
- `public/assets/js/examples.js`
- `public/assets/js/tabs.js`
- `public/assets/js/validation.js`
- `scripts/browser-smoke.mjs`
- `tests/fixtures/bind/reference.hosts`
- `tests/fixtures/bind/reference.zone`
- `tests/fixtures/legacy/README.md`
- `tests/unit/bind.test.mjs`
- `tests/unit/reference.test.mjs`
- `tests/unit/roadmap-regressions.test.mjs`
- `tests/unit/safety.test.mjs`

### Modified

- `.github/workflows/static.yml`
- `AGENTS.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `README.md`
- `ROADMAP.md`
- `SECURITY.md`
- `docs/engineering/EXCEPTIONS.md`
- `docs/known-issues.md`
- `docs/testing.md`
- `docs/threat-model.md`
- `docs/verification.md`
- `package-lock.json`
- `package.json`
- `public/assets/css/styles.css`
- `public/assets/js/converter.js`
- `public/assets/js/core.js`
- `public/assets/js/ui.js`
- `public/index.html`
- `scripts/check-bind.mjs`
- `scripts/check-source.mjs`
- `scripts/security-scan.mjs`
- `tests/unit/converter.test.mjs`
- `tests/unit/core.test.mjs`
- `tests/unit/ui.test.mjs`
