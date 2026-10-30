# Threat model — foundation refactor

Profiles B + D. Highest review risk: T2 conservatively, because untrusted parsing code is moved and deployment gates change. The conversion grammar is intentionally preserved, not expanded. This is prepared source, not a released parser change.

## Assets, actors and boundaries

Assets: internal host inventory, DNS output integrity, browser availability and Pages publishing authority. Actors: legitimate operators, people supplying pasted text, compromised browser/hosting code and repository contributors. Entry points: text/settings, exported output and workflow source.

| Abuse case | Control / evidence | Remaining limit |
| --- | --- | --- |
| Pasted markup interpreted as HTML | No inline handlers or HTML insertion; UI adapter tests include markup-shaped invalid addresses. | Browser-based XSS/a11y verification has not run; adapters are not real browsers. |
| Pasted inventory transmitted or retained unexpectedly | No fetch/storage calls or runtime third-party assets are introduced; core has no DOM/network dependency. | Hosting and browser extension behaviour are outside the app's control. |
| Malformed/conflicting data becomes installed DNS config | Parser skips malformed IPv4 rows; warnings, golden fixtures and BIND positive/negative fixtures expose behaviour. | Incomplete name/settings validation and DNS conflicts remain A-01–A-07; installation must remain independently reviewed. |
| Large input freezes the page | No extra expansion or network processing is introduced. | Input/work limits and workers are not implemented; track under A-06. |
| Edited settings mislabel stale exported data | Captured conversion result owns content and filenames; regression tests and stale-input feedback. | User must regenerate to include input edits. |
| Failed export leaves misleading UI state | Clipboard/download failures are handled; temporary URLs/anchors are released. | Native browser permissions and file handling need browser verification. |
| Untrusted PR gains publishing authority | PRs validate without deployment; Pages/OIDC write permissions are scoped to deploy, which depends on validation. Actions are SHA-pinned. | Hosted rules, environment protection and workflow execution are unverified locally. |
| Secrets enter source/logs | Focused credential rules and self-test; scanner wrapper logs only finding IDs/locations. | Rule coverage is limited; no full-history scan or credential rotation process is implemented here. |

## Containment and rollback

Do not automatically install generated DNS. For an application rollback, restore the known-good baseline source (or a reviewed fix) and redeploy through an authorised process; do not disable required tests to make a failing pipeline green. Exported files and DNS installations are separate state and are not rolled back by reverting the web page. Back up and restore DNS configuration through the operator's own change procedure.

No infrastructure was changed during this work. The new source must receive owner review before public release; passing compatibility tests is not owner sign-off or acceptance of inherited defects.
