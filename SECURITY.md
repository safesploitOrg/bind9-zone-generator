# Security

## Runtime and privacy

The application converts pasted records locally in the browser. Its source has no API fetches, telemetry, third-party runtime scripts or browser persistence. Hosting may still retain ordinary request logs. Clipboard copies and downloads intentionally create copies outside the page.

Outputs and warnings use `textContent`/element creation. No code execution, HTML interpretation, DNS lookup, filesystem include resolution or DNS-server access is required for conversion. There is no backend, authentication/session system, database or deployment credential in the page.

The application is a text generator, not an authoritative DNS validator. Known configuration defects are listed in [docs/known-issues.md](docs/known-issues.md). Review generated content with `named-checkzone` in the intended zone context and manage installed serials before applying changes. Never install output automatically based only on “No warnings detected”.

## Maintenance and findings

Follow SFW v1.1.0. Block releases for exposed credentials, active exploitation, confirmed reachable Critical vulnerabilities and newly introduced reachable High findings. Triage other findings using severity, reachability, exposure, fix availability and legacy/new status; record an owner, mitigation and review deadline rather than silently suppressing them. All configured local scanner findings currently fail CI; custom rules are deliberately limited in scope.

The owner has explicitly disabled Playwright in CI for this stage; see [EX-001](docs/engineering/EXCEPTIONS.md). This does not waive security scans, correctness checks or release review.

Do not place confidential inventory, credentials or exploit details in public GitHub issues. Use GitHub's private vulnerability reporting route if the repository owner has enabled it. Its enabled status was not verified during this work; no private contact channel is invented here.

## Hosting and changes

Use HTTPS hosting. Relative local assets support GitHub Pages project paths. External scripts/styles and event listeners remove the previous dependency on inline execution, but no CSP or live hosting-header verification is claimed by this change.

DNS configuration remains a manual hand-off. No production DNS changes, repository permission changes, push, tag, release or deployment are authorised by this source package. A parser-sensitive public release requires the owner's recorded review and relevant verification evidence.
