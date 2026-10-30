# Threat model — complete roadmap implementation

Profiles B + D; T2 parser-sensitive change. Assets are internal inventory confidentiality, DNS/hosts output integrity, browser availability and publishing authority. Actors include legitimate operators, people supplying pasted data, compromised hosting/browser code and repository contributors.

| Entry point / abuse case | Implemented control and verification | Residual boundary |
| --- | --- | --- |
| Names/settings inject DNS syntax | Shared canonical-name, network, TTL and serial validation; complete CNAME/A indexes; blocking regressions. | Supported ASCII hostnames only; operators still review/apply installed serial state. |
| Pasted zone text masquerades as another record | Quote/comment/parenthesis-aware logical lexer, strict supported A/CNAME data and malformed-input corpus. | Unsupported RDATA is skipped with notices, not fully validated. |
| `$INCLUDE`, `$GENERATE` or external aliases trigger I/O/expansion | Directives rejected; missing CNAME targets are warned and omitted; tests prove no fetcher call. | Valid omitted DNS-only data makes conversion intentionally lossy. |
| Alias loop/deep chain/massive fan-out freezes browser | Iterative resolution/cache with depth/work/name/output bounds and boundary tests. | Synchronous work is bounded, not guaranteed below a fixed latency on every device. |
| Oversized/multibyte/token-heavy input exhausts memory | UTF-8 byte/line, logical-record/token and total-name limits; tests check independent bounds. | Browser allocation/form behaviour before validation remains browser-managed. |
| Markup becomes executable DOM | `textContent`, element creation, no inline handlers; source/SAST and UI adapter tests. | Real-browser execution and broader security testing remain outstanding. |
| Input is leaked/persisted | No runtime network/storage code or external assets; CSP connections blocked. | Hosting logs, extensions, clipboard/files and policy enforcement are outside unit-test proof. |
| Stale/error output is copied as current data | Independent tab results, disabled stale exports, old output cleared on errors; regression tests. | User must regenerate after edits and manually merge downloaded files. |
| Bad configuration is applied automatically | No server, filesystem/DNS installation or production credentials in app. BIND independently checks supported fixtures. | Operator deployment/rollback is separate and needs review/backups. |
| Untrusted PR gains Pages write access | PRs validate without deployment; pinned actions, deploy-only Pages/OIDC permissions and validation dependencies. | Hosted required checks/environment protection remain unverified. |
| Secrets enter source or logs | Targeted credential/private-key rules, synthetic scanner test, location-only report output. | Rule scope and history coverage are limited; no complete secret audit is claimed. |

## Evidence and residual review

Eleven new regressions failed against the pre-fix implementation and pass now. Current tests also cover record inheritance, comments/quotes, chain caching/depth, owner conflicts, limits, deterministic grouping, tabs, export failures and independent state. The malformed-input corpus exercises both parsers with 400 deterministic inputs each.

Independent BIND checks accept `/8`, `/16`, `/24`, full/include-parent zones and the reference fixture, reject deliberately invalid zones, and establish importer agreement between the original and BIND-canonicalised fixture.

Browser matrix implementation is present, but native execution is blocked by unusable download archives/missing binaries. EX-001 preserves the standing instruction to keep Playwright out of CI; it does not accept unrelated security risk or approve public release.

## Containment and rollback

Keep generated configuration a manual hand-off. To roll back the page, restore reviewed source and perform a separately authorised deployment through the required checks. Reverting the app does not restore previously installed DNS/hosts files. Those require independent backups/change procedures. No production infrastructure, repository permissions or deployment was changed here.
