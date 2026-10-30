# Changelog

Changes are grouped by release using Added, Changed and Fixed categories. Dates use Europe/London.

## Versioning policy

- The repository had **no tags or GitHub releases** when its six-commit history was reviewed on 2026-10-30.
- Historical entries below are **unversioned commit history**, not invented releases or retrospective tags.
- `0.1.0-alpha.1` was the first explicit prepared package version. `0.2.0-alpha.1` contains the completed roadmap implementation. Both are **unreleased and untagged source snapshots**.
- While the project is below `1.0.0`, use a minor increment for a new conversion capability or breaking behaviour, a patch for compatible fixes, and an increasing prerelease identifier for successive alpha candidates. Keep package and lockfile versions aligned.
- At release, replace the Unreleased heading with the actual version/date, record its source commit, and create a matching tag only after maintainer approval. Do not mark planned work as shipped.

## [Unreleased] — target 0.2.0-alpha.1

### Added

- Default **dnsmasq hosts.d → BIND9 Zone Generator** tab and separate **BIND → /etc/hosts** tab, with ARIA roles, keyboard navigation and independent state.
- Bounded BIND master-file parser supporting `$ORIGIN`, `$TTL`, inherited owners, TTL/class ordering, parentheses, comments and quoted non-host data.
- IPv4 A-record grouping, offline CNAME-chain resolution, deterministic canonical/alias ordering, and FQDN/origin-relative/both name formats.
- Structured errors for malformed syntax, conflicting records, unsafe directives, alias loops and limits; warnings for omitted record types, wildcards, out-of-zone data and unresolved aliases.
- Explicit input, line, record, token, name, alias-depth/work and output limits. `$INCLUDE` and `$GENERATE` never perform filesystem, network or expansion work.
- Examples for both directions, a previous-SOA-serial field, independently written zone/hosts fixtures and differential testing against BIND canonicalisation.
- 141 passing unit tests, including an 800-invocation deterministic malformed-input corpus, correctness regressions, boundaries, tab navigation and independent export state.
- Optional local browser matrix script for three engines × three viewports; Playwright CI remains disabled under the standing owner direction.

### Fixed

- A-01: the default `172.16.` now generates the correct `/16` reverse zone; `/8` and `/24` are also supported. CIDR host bits and unsupported lengths are rejected.
- A-02: complete name indexing rejects alias/A and conflicting-CNAME owners regardless of input order.
- A-03/A-04: shared absolute-name handling aligns A, CNAME, PTR, SOA and NS names without duplicated domain suffixes.
- A-05: one UTC date-based serial seed per conversion, with explicit previous-serial increment/wrap and automatic advancement after successful UI generations.
- A-06/A-07: invalid names/settings and empty/oversized input block output; names compare case-insensitively and leading-zero IPv4 text is normalised as decimal.
- Invalid conversions clear old output; input edits disable that tab's exports until regeneration. The other tab's data remains available.

### Changed

- Forward owners and CNAME targets are now absolute. Full zones include `$ORIGIN`; include fragments have explicit per-record TTLs.
- Added a restrictive meta CSP with local scripts/styles/images, blocked connections/forms/objects/base URLs and no-referrer policy.
- Full zones require an A address for an in-zone authoritative nameserver and reject nameserver aliases.
- Malformed matching hosts rows now block the conversion rather than silently producing partial files. Names explicitly outside the forward zone are rejected.
- Corrected DNS contracts intentionally replace the old byte-parity assertions. Original legacy fixtures remain unchanged as historical evidence; migration tests assert that their defective cases are now corrected or rejected.
- README, architecture, roadmap, security model, issue register and verification report now describe the completed implementation and remaining browser/hosted-release verification.

### Verification and limits

- Unit, source, targeted-security and independent BIND checks pass locally, including `/8`, `/16`, `/24`, include-parent validation and importer differential checks.
- BIND → hosts is IPv4-only and is not a lossless DNS round trip. Unsupported data is reported, never fetched or silently treated as an IPv4 mapping.
- Local browser execution remains blocked by unavailable binaries; CI browser execution remains disabled. No push, tag or deployment has occurred.

## Prepared source snapshot — 0.1.0-alpha.1 — 2026-10-30 (unreleased)

The entries below describe the previous foundation snapshot, not the current limitation status. See the 0.2.0-alpha.1 entry and `docs/known-issues.md` for resolutions.

### Added

- Dependency-free unit tests using Node's built-in test runner: parser boundaries, warnings, forward/reverse generation, export state and UI adapters.
- Nine golden cases captured from commit `94a8385`, including explicitly labelled compatibility cases for inherited defects.
- Independent BIND validation scripts covering full zones, a parent zone using `$INCLUDE`, invalid TTLs and inherited CNAME/A conflicts.
- Focused source checks and targeted Semgrep SAST/credential rules, including a synthetic finding test that verifies scanner failure behaviour.
- Source, unit, security and BIND CI jobs; deployment depends on all three validation jobs.
- `public/assets/images/favicon.svg`, a local network-themed vector favicon.
- Root `AGENTS.md`, the canonical SFW v1.1.0 engineering standard, security guidance, testing guidance, threat model, known-issue register and roadmap.
- An explicit record of the owner's request to keep Playwright disabled in CI for this stage. Browser coverage is not claimed as passing.

### Changed

- Extracted inline CSS to `public/assets/css/styles.css`.
- Extracted JavaScript into `core.js`, `converter.js`, `ui.js` and `app.js` under `public/assets/js/`.
- Removed inline event handlers; browser setup uses an external ES module and event listeners.
- Removed DOM access and export-cache mutation from the conversion core; configuration and time are explicit inputs.
- Captured one timestamp per conversion for consistent forward/reverse header serials. The inherited hourly serial scheme remains.
- Added `package.json` and a dependency-free lockfile for repeatable test commands; there is still no frontend build step.
- Pinned GitHub Actions to full commit SHAs and restricted Pages/OIDC write permissions to deployment.
- Updated `ARCHITECTURE.md` and `README.md` to describe the restructured app. Local use now requires HTTP serving because the app uses ES modules.

### Fixed

- Export filenames now use the settings captured with the generated content, preventing a later selector change from mislabelling old output.
- Copy/download actions are unavailable before generation, preventing empty exports.
- Clipboard and download failures now produce visible recovery guidance; edited inputs are marked as stale.

### Known limitations

- DNS parsing/generation semantics are preserved by this foundation work. The broad default prefix, dotted-name handling, CNAME conflicts, incomplete configuration validation and other inherited issues remain documented in [docs/known-issues.md](docs/known-issues.md).
- Targeted source/security checks are an initial SFW adoption step, not a claim of complete SAST, secret-history scanning, browser coverage or release readiness.
- The tab interface and BIND → `/etc/hosts` conversion are **not implemented**; see [ROADMAP.md](ROADMAP.md).

## Historical baseline — 2026-05-21 (unversioned)

### Changed

- Broadened the default network prefix filter from `172.16.5.` to `172.16.` in [`94a8385`](https://github.com/safesploitOrg/bind9-zone-generator/commit/94a83854a5f55997a75726cabd46db4e6c2c96b6).
- This changed filtering only; it did not add `/16` reverse-zone support. The existing reverse generator still assumes three prefix octets.

## Historical baseline — 2026-05-05 (unversioned)

### Added

- Initial browser application and README in [`3e6476f`](https://github.com/safesploitOrg/bind9-zone-generator/commit/3e6476f68fcaf57dc93ac53a5fd6bb3c80911f27): hosts-file parsing, prefix filtering, A/CNAME output, SOA/NS headers, PTR output, warnings, clipboard copy and text downloads.
- GitHub Pages workflow in [`f63e065`](https://github.com/safesploitOrg/bind9-zone-generator/commit/f63e065a760b5122dccf445ad4c717620ce41d38), initially configured with an incorrect `.public` upload path.

### Changed

- Moved `index.html` to `public/index.html` without changing its content in [`087e273`](https://github.com/safesploitOrg/bind9-zone-generator/commit/087e27384c419b5a7a02e28270be135179abf63c).
- Combined the application relocation and Pages-workflow branches in merge [`b8f54ad`](https://github.com/safesploitOrg/bind9-zone-generator/commit/b8f54ad0af85fac973e5168dd050afcf090711f2). This was integration history, not a separate feature release.

### Fixed

- Corrected the Pages artifact upload path from `.public` to `./public` in [`947cc53`](https://github.com/safesploitOrg/bind9-zone-generator/commit/947cc532b5d76150c8541f47b45645f28aea576d).
