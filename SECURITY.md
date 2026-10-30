# Security

## Runtime model

Both conversion directions process pasted text locally. Production modules contain no fetch/XHR/WebSocket, telemetry, third-party assets or browser persistence. Hosting may retain ordinary request logs; extensions and user-created clipboard/download copies are outside the app's retention control.

The HTML declares a meta CSP: local scripts/styles/images, `connect-src 'none'`, blocked objects/forms/base URLs and `no-referrer`. No inline scripts/handlers or HTML insertion are required. Hosting response headers and browser-native CSP enforcement were not verified here; frame-ancestor policy requires hosting headers and is not claimed.

There is no backend, authentication/session system, database, secret store or DNS/hosts installation authority. The downloaded hosts file must be reviewed and merged manually. Generated DNS requires independent checking and correct installed serial state before application.

## Input and output protections

- Strict supported naming/settings rules, decimal IPv4 normalisation and complete conflict indexes.
- Bounded input, logical records/tokens, names, alias depth/work, diagnostics and output; see [format contract](docs/format-contract.md).
- Structured fatal errors clear that tab's output and prevent export. Edits disable export until regeneration.
- Separate BIND grammar; quoted data is tokenised before records, and file includes/generated directives are blocked without I/O.
- Offline iterative CNAME resolution detects loops/conflicts and warns about missing targets. No invented address or network resolution.
- Text-only rendering and per-tab captured metadata. Download URLs/anchors are released and clipboard/download failures are handled.

The BIND importer validates its supported grammar and mappings, not every non-host RDATA field or DNSSEC property. IPv6 and arbitrary CIDR/classless delegation are unsupported. This is not a DNS authority, universal validator or lossless round-trip tool.

## Verification and release controls

Follow SFW v1.1.0. Source/unit, targeted-security and independent BIND jobs gate deployment in the prepared workflow. The security wrapper fails on configured findings, unreadable/error reports or missed production JS files; its synthetic test verifies failure behaviour without printing matched credentials. Four local rules are intentionally limited; comprehensive SAST, full secret-history scanning and scanner dependency locking/auditing remain improvements.

Playwright CI remains disabled under the owner's standing [EX-001](docs/engineering/EXCEPTIONS.md). The optional local matrix could not execute because usable browser binaries were unavailable. Adapter tests do not establish browser/a11y compliance.

Block releases for exposed credentials, active exploitation, confirmed reachable Critical vulnerabilities and newly introduced reachable High findings. Triage other findings using severity, reachability, exposure, fix availability and legacy/new status. Record an owner, mitigation and review date rather than silently suppressing controls. No risk acceptance or public-release approval is granted by the agent.

No push, tag, permission change or deployment occurred. Hosted branch-required checks and environment rules remain unverified. See [verification](docs/verification.md), [issue status](docs/known-issues.md) and [threat model](docs/threat-model.md).

## Reporting

Do not post confidential inventory, credentials or exploit details in public issues. Use GitHub private vulnerability reporting if the owner has enabled it; enabled status is unverified and no private contact channel is invented here.
