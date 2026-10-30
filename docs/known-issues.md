# Issue status — 0.2.0-alpha.1

Original baseline: [`94a8385`](https://github.com/safesploitOrg/bind9-zone-generator/commit/94a83854a5f55997a75726cabd46db4e6c2c96b6). IDs are document-local references, not external GitHub tickets. The maintainer owns triage; no public release or blanket risk acceptance is implied.

| ID | Status | Resolution / evidence |
| --- | --- | --- |
| A-01 | Fixed for supported networks | `/8`, `/16`, `/24` descriptors derive both reverse zones and owners. The existing `172.16.` default now works. Regressions and BIND checks cover all three sizes. |
| A-02 | Fixed | Complete primary indexing rejects alias/A collisions and conflicting CNAME targets in either input order. Importer also checks incompatible owner data and loops. |
| A-03 | Fixed | Consistent canonical names across A/CNAME/PTR; dotted-relative hosts expand under the chosen domain. BIND input deliberately retains strict DNS origin rules. |
| A-04 | Fixed | Header names are canonicalised once; qualified DNS host/admin names do not receive the domain twice. |
| A-05 | Addressed by explicit serial contract | UTC seed plus supplied previous-serial increment/wrap. UI advances after successful runs; installed serial must be supplied after reload or zone changes. No automatic DNS query/persistence is promised. |
| A-06 | Fixed within supported grammar | Invalid settings/names/rows and empty results block export; input, record, token, alias/work and output limits are enforced. This is not a general-purpose BIND validator. |
| A-07 | Fixed | Names compare as canonical lowercase absolute values; IPv4 text is decimal-normalised before matching and deduplication. |
| A-08 | Fixed | Captured metadata, per-tab state, disabled stale exports, cleared error output and export-failure handling have regression tests. |
| A-09 | Source addressed; hosted verification open | Unit/source, security and BIND jobs gate deployment in one workflow. Hosted required checks and environment rules need verification after an authorised push. |

## Remaining verification and deliberate limits

| ID | Status | Scope / next step |
| --- | --- | --- |
| V-01 | Open; browser execution | Optional local suite is implemented, but browser download archives were unusable and executables were unavailable. Run the matrix on a working machine. Playwright remains disabled in CI by EX-001. |
| V-02 | Open; hosted/release evidence | No push, tag, workflow run or deployment occurred. Verify hosted gates and obtain owner review before a parser-sensitive public release. |
| V-03 | Initial security coverage | Four local SAST/credential rules are targeted, not comprehensive. Full secret-history scanning, scanner dependency locking/auditing and wider SAST remain maintenance improvements. |

Maintainer review checkpoint: 2026-11-30, and before public release for relevant gaps. No external tickets, CVSS scores, security acceptance or release approval were invented.

IPv6, arbitrary CIDR/classless reverse delegation, arbitrary BIND extensions, file includes, DNS lookups and lossless round-trip conversion are deliberate unsupported capabilities, specified in [format-contract.md](format-contract.md). Unknown/unsupported data is rejected or explicitly reported under that contract.

Legacy fixture bytes remain historical evidence. Current migration tests demonstrate that defective cases are corrected or rejected; they no longer assert the old defects as correct output.
