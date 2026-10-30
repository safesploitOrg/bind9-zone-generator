# Testing and CI — 0.2.0-alpha.1

## Fast checks

Node 22+ is required; CI uses Node 24. There are no npm runtime/development dependencies.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run test:coverage
```

`check` runs focused source-policy/syntax checks and all Node unit tests. Source checks cover asset/import paths, external scripts/styles, IDs, a connection-blocking policy, lockfile versions and action SHA pins. They are not a complete language/style linter.

Current tests cover configuration/naming/network/serial boundaries, CNAME/A conflicts, malformed syntax, logical BIND records, offline aliases/loops/depth, grouping/name styles, limits, UI exports/error recovery, serial advancement and tabs. A deterministic corpus invokes the two parsers 800 times across 400 malformed inputs. No tests are skipped or marked TODO.

Eleven correctness regressions were added and observed failing before the fixes. Historical fixtures under `tests/fixtures/legacy/` remain unchanged evidence, no longer byte-for-byte expected current output. Migration tests explicitly assert their corrected/rejected cases. Current `tests/fixtures/bind/reference.zone` and `.hosts` were written independently of generated output.

## Independent BIND checks

Install `named-checkzone` using `bind9-utils` (Debian/Ubuntu) or `bind-utils` (RHEL-compatible). An alternative executable path can be supplied through `BIND_CHECKZONE`.

```bash
npm run test:bind
```

The script checks six generated forward/reverse files across `/8`, `/16`, `/24`, a parent-zone `$INCLUDE`, and the reference forward zone. It compares importer results from the reference text with results from BIND's canonical dump. Two deliberately invalid zones must be rejected, and the app must reject the old CNAME/A conflict. Missing tools, unexpected exits or disagreement fail the command; nothing is silently skipped.

These checks passed locally with BIND 9.18.39. This is evidence for those cases/version, not every BIND release or grammar extension.

## Targeted security checks

CI installs Semgrep 1.183.0 in an isolated Python environment:

```bash
node scripts/security-scan.mjs --self-test
node scripts/security-scan.mjs
```

Use `SEMGREP` for an absolute scanner path if needed. The self-test requires failure for synthetic unsafe code and a fake credential. Real scans fail on configured findings, scanner errors, unreadable reports, no scanned files or any unscanned production JS module. Only IDs/locations are printed, not matched credential text.

Four local rules cover dynamic code execution, unsafe HTML insertion, selected GitHub/AWS token patterns and private-key headers. This is initial targeted SAST/credential coverage, not comprehensive SAST, full secret-history scanning or a dependency audit. The application npm graph is empty; add a blocking audit if dependencies are introduced. Scanner Python transitive dependencies are not hash-locked/audited here.

## Optional local browser matrix

```bash
npm run test:browser
```

This requires an existing Playwright installation and usable Chromium, Firefox and WebKit binaries. `PLAYWRIGHT_MODULE` may point to that installation's `index.mjs`; standard Playwright browser-path settings are respected. The script does not install packages/browsers and is not called by CI.

The suite implements nine combinations: three engines at 390×844, 768×1024 and 1440×900, reduced motion and 200% zoom. Journeys cover default selection, both examples/converters, serial advancement, keyboard tabs/focus, real downloads, deliberately simulated clipboard denial, form labels, stale/error export blocking and preserved tab state. These checks do not establish full WCAG compliance or native-device coverage.

The authoring attempt could not launch: the browser download yielded unusable archives and no executable. **No real-browser, visual, accessibility or native clipboard/download pass is claimed.** Playwright remains disabled in CI under [EX-001](engineering/EXCEPTIONS.md); there is no hidden install, success wrapper or skipped browser job misrepresented as a gate.

## CI contract

One workflow handles main pushes, PRs and manual dispatch:

| Job | Gate |
| --- | --- |
| `quality` | Dependency-free npm setup, source checks and all unit tests. |
| `security` | Scanner failure self-test and targeted source/credential scan. |
| `bind-validation` | Independent positive/negative zones and parser differential check. |
| `deploy` | Requires all three; main branch only, excluding PR events. |

No `continue-on-error` or unconditional success wrapper is used. Actions are SHA-pinned; only deploy has Pages/OIDC write privileges. Every job checks out the event commit; public assets are published without a build transform. The `pages` concurrency group serialises workflows.

Hosted execution, branch-required checks and environment protection remain unverified until a separately authorised push. Browser CI is intentionally absent. See [verification.md](verification.md) for executed evidence and release gaps.
