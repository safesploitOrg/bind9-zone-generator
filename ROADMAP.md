# Roadmap — implementation status

Prepared version: **0.2.0-alpha.1**, unreleased and untagged. All three functional stages are implemented. Verification gaps are recorded explicitly rather than treated as passing gates.

## Stage 1 — foundation implemented

- [x] Reconstruct dated, unversioned history from all six commits without inventing historical releases.
- [x] Separate static assets under `public/assets/css`, `js` and `images`; include a local favicon.
- [x] Add pure conversion modules, maintained tests, SFW guidance and validation-gated CI.
- [x] Preserve the owner's instruction to keep Playwright disabled in CI.

## Stage 2 — DNS correctness implemented

- [x] Support octet-aligned `/8`, `/16` and `/24` prefixes/CIDR with correct reverse owners.
- [x] Canonicalise names and IPv4 text; reject out-of-zone owners and conflicting CNAME data.
- [x] Align forward/PTR and SOA/NS naming, explicit origins and include TTLs.
- [x] Validate names, settings and serials; increment a supplied previous serial with 32-bit wrap.
- [x] Block malformed, empty and oversized conversions; bound parsing/generation work.
- [x] Add regressions that failed before the fixes and independent BIND verification that passes afterwards.
- [x] Revisit EX-001 before feature 2: attempted local browser installation/execution; CI remains disabled under the standing direction.

A-01–A-08 are addressed under the documented supported-format contracts. A-09 is addressed in workflow source; hosted required checks still need external verification.

## Stage 3 — bidirectional interface implemented

- [x] Default **dnsmasq hosts.d → BIND9 Zone Generator** tab.
- [x] **BIND → /etc/hosts** tab with separate settings, state, warnings, output and exports.
- [x] `$ORIGIN`, `$TTL`, inherited owners, TTL/class ordering, comments, quoted data and multiline records.
- [x] IPv4 A records and bounded offline CNAME-chain resolution; clear warnings for other records, missing targets and out-of-zone data.
- [x] Deterministic one-line-per-IP grouping and FQDN/origin-relative/both output formats.
- [x] Reject loops/conflicts, file includes and generated records; no DNS lookups or file reads.
- [x] Roving tab focus, arrow/Home/End navigation, responsive CSS, status messages and independent stale/error handling.
- [x] Examples, unit/UI-adapter tests, reference fixtures, source checks and security checks.
- [x] Provide a reusable local nine-combination browser suite without enabling it in CI.

## Verification still outstanding

- [ ] Execute the browser matrix on a machine with usable Chromium/Firefox/WebKit binaries. The authoring download returned unusable archives, so no real-browser result is claimed.
- [ ] Verify the first hosted GitHub Actions run, repository-required checks and environment protection after a separately authorised push.
- [ ] Obtain owner review before tagging or publishing this parser-sensitive change.

These items are release/verification steps, not unimplemented conversion features. This source package does not authorise a deployment.

## Deliberate boundaries

IPv6/AAAA output, arbitrary CIDR/classless reverse delegation, general-purpose BIND syntax, automatic `$INCLUDE` resolution, network lookups and lossless round-trip conversion are outside this version. See [docs/format-contract.md](docs/format-contract.md). These boundaries replace the earlier open questions with explicit supported behaviour.
