# Testing and CI

## Fast local checks

Requires Node 22+ and npm; CI uses Node 24. The package has no runtime or development npm dependencies. Run from the repository root:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run test:coverage
```

`check` runs focused source-policy/syntax checks and Node unit tests. The source check validates local asset/import paths, external scripts/styles, unique HTML IDs, lockfile versions and full action SHA pins. It is not a complete language/style linter.

The tests cover parser boundaries, comments, filtering, warnings, deterministic headers, forward/reverse records, export snapshots and UI adapters. Unit tests use an in-memory DOM/API adapter; they do not launch a browser. There are no skipped or TODO test cases in this foundation suite.

## Compatibility evidence

`tests/fixtures/legacy/cases.json` records the original source commit, fixed local clock, inputs and settings. The adjacent output/warning fixtures were generated from the original inline script at that commit, rather than from the extracted implementation. Nine cases verify byte-level forward/reverse parity and warning/row-count parity. Cases naming known issues preserve historical behaviour, not desired future correctness.

## Independent BIND checks

Install `named-checkzone` from `bind9-utils` on Debian/Ubuntu or `bind-utils` on RHEL-compatible systems, then run:

```bash
npm run test:bind
```

The script checks three valid boundaries: a full forward zone with an in-zone NS address, a reverse zone and an include fragment loaded through a complete parent zone. It also expects BIND to reject an invalid TTL and the inherited CNAME/A conflict. Those negative cases prove validator rejection; the app itself does not yet block the bad input. Missing validators or unexpected exit codes fail the command.

## Targeted SAST and credential checks

CI installs Semgrep 1.183.0 in an isolated Python environment and runs:

```bash
node scripts/security-scan.mjs --self-test
node scripts/security-scan.mjs
```

Set `SEMGREP` to an absolute scanner path if it is not on `PATH`. The self-test must observe a nonzero scanner result for synthetic unsafe JavaScript and a fake credential. Normal scans fail on any configured finding or scanner/report error. Reports show only rule IDs and locations, avoiding matched credential text.

Rules are local and focused: dynamic code execution, unsafe HTML insertion, selected GitHub/AWS credential formats and private-key headers. This is not comprehensive SAST or full secret-format/history scanning. No results upload or remote scan configuration is used. There is no application dependency audit to run while the npm dependency graph is empty; introduce a blocking audit when adding dependencies. Scanner transitive Python packages are not hash-locked in this first stage.

## CI contract

One workflow runs on pushes to `main`, pull requests and manual dispatch:

| Job | Gate |
| --- | --- |
| `quality` | Reproducible dependency-free npm setup, source checks and all unit tests. |
| `security` | Scanner self-test, then targeted SAST/credential scan. |
| `bind-validation` | Independent positive and negative BIND fixtures. |
| `deploy` | Requires all three jobs; only runs on `main` outside a pull-request event. |

There is no `continue-on-error` or unconditional success wrapper for these checks. Actions are pinned to full commits; only deployment has Pages/OIDC write permissions. Each job checks out the event's commit, and there is no build transform. The published artifact contains only `public/` from that validated revision. The shared `pages` concurrency group prevents concurrent deployment workflows.

Repository rulesets/required checks and the first hosted execution are outside this local package's verification. A workflow file alone does not establish server-side enforcement.

## Browser coverage

Playwright is intentionally disabled in CI under owner direction [EX-001](engineering/EXCEPTIONS.md). No browser tests have been deleted or silently skipped. No Playwright package or browser download is installed by CI.

Before feature 2, revisit browser verification for generation, warning display, clipboard denial, actual file downloads, tab keyboard behaviour, 390×844 / 768×1024 / 1440×900 layouts, zoom and accessibility. Keep any browser job and its deployment dependency consistent when enabling it. See [verification.md](verification.md) for the actual authoring checks and limitations.
