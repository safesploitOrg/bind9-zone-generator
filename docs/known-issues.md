# Known issues

Baseline: [`94a8385`](https://github.com/safesploitOrg/bind9-zone-generator/commit/94a83854a5f55997a75726cabd46db4e6c2c96b6), reviewed 2026-10-30. These issues pre-date the asset/test refactor. IDs are local tracking references, not GitHub tickets. The project maintainer owns triage; suggested review checkpoint: 2026-11-30 and before feature 2. No security risk acceptance or release approval is implied.

| ID | Status | Reproduction / impact | Current mitigation and next action |
| --- | --- | --- | --- |
| A-01 | Open; DNS correctness | Default `172.16.` filter produces `INVALID-PREFIX.in-addr.arpa`; PTR owners use only the final octet across a broad range. | For supported use, select one three-octet prefix ending in a dot, such as `192.0.2.`. Separate network selection from reverse-zone generation before supporting wider ranges. |
| A-02 | Open; DNS correctness | An alias can be emitted as a CNAME before a later row emits an A record for the same owner. | Avoid conflicting aliases; check complete output with BIND. Build a complete owner index before emission. |
| A-03 | Open; DNS correctness | `app.internal` is relative in forward output but becomes absolute `app.internal.` in PTR output. | Use short names or explicit absolute names belonging to the intended zone. Define one canonical naming model. |
| A-04 | Open; DNS correctness | Reverse SOA/NS settings append the forward domain even if DNS host/admin are already qualified. | Use short host/admin labels for now. Reuse one absolute-name policy for both header paths. |
| A-05 | Open; operational correctness | `YYYYMMDDHH` serial repeats within the hour and does not inspect the installed serial. | Operators must manage serial progression before installation. One timestamp per run now aligns forward/reverse headers, but does not solve monotonicity. |
| A-06 | Open; validation gap | Invalid names and TTL/settings can reach generated DNS text; warnings are advisory. Input/work limits are absent. | Independently validate complete files before installation. Add bounded parsing and structured blocking errors in a dedicated correctness change. |
| A-07 | Open; normalisation | Case-sensitive name comparisons, trailing-dot deduplication and leading-zero IP text can miss conflicts or drop distinct names. | Review output; implement DNS-aware canonical comparison keys without changing presentation unexpectedly. |
| A-08 | Fixed in prepared alpha | Changing the output selector could give old include output a full-zone filename; blank exports were possible. | Exports use captured generation settings, are unavailable before generation and have regression tests. |
| A-09 | Source configuration addressed; hosted enforcement unverified | Original CI only deployed; it did not run tests or scanners. | Prepared workflow gates deployment on source/unit, targeted security and BIND jobs. First hosted run and branch-protection requirements still need maintainer verification. |

The legacy golden tests deliberately preserve A-01/A-02/A-03 outputs so the extraction is reviewable. Their names state that they are **compatibility checks, not correctness assertions**. Fix each defect with a dedicated regression test and update the corresponding golden case with an explanation; do not suppress a new failing test.

This register identifies correctness and validation debt. It does not assign unsupported CVSS scores or assert that any item is a confirmed remote exploit. Review severity, reachability, exposure and operational impact before a public release.
