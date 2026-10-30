# Roadmap

## Stage 1 — prepared in 0.1.0-alpha.1

- Historical changelog with honest version provenance.
- Static asset separation, local favicon, pure conversion functions and unit tests.
- SFW entry point, known-issue tracking and validation-gated Pages workflow.
- Playwright CI remains disabled by owner direction.

This is a reviewable, unreleased source package. See `docs/verification.md` for executed checks.

## Stage 2 — correctness before another parser

Address the inherited DNS issues in `docs/known-issues.md`, especially A-01 through A-04 and A-06. Agree supported naming rules, network ranges and blocking-versus-advisory validation. Add failing regression tests before each fix, and validate supported generated zones independently using BIND.

Revisit EX-001 and browser verification before introducing tabs. No automatic approval or release is implied by this roadmap.

## Stage 3 — feature 2, proposed target 0.2.0-alpha.1

Add an accessible tab interface:

1. **dnsmasq hosts.d → BIND9 Zone Generator** — selected by default, preserving the existing converter.
2. **BIND → /etc/hosts** — a separate conversion mode with its own input, settings, output and warnings.

Before implementation, specify:

- Accepted BIND syntax: `$ORIGIN`, `$TTL`, inherited owners, multiline records and comments.
- Whether the first version handles IPv4 A records only, with clear warnings for unsupported AAAA and other types.
- CNAME resolution, aliases, chains, missing targets, loops and out-of-zone names.
- Deterministic grouping of `IP canonical-name aliases`, deduplication and short/FQDN output policy.
- No automatic `$INCLUDE` file reads or network lookups; unsupported directives must be reported safely.
- Limits for input size, records, alias expansion and processing work.
- Keyboard navigation, ARIA tab semantics, mobile layout and export-state separation.

Keep the BIND parser in a separate module; do not mix BIND grammar into the hosts-file parser. Do not promise round-trip identity: comments, TTLs, SOA/NS records and other DNS semantics cannot all be represented by `/etc/hosts`.
