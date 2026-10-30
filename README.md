# DNS Record Converter

A static, browser-only tool with two conversion directions:

- **dnsmasq hosts.d → BIND9 Zone Generator** — the default tab; generates forward/include and reverse zones.
- **BIND → /etc/hosts** — converts IPv4 A records and resolvable CNAME aliases into grouped hosts-file lines.

**Version:** `0.2.0-alpha.1`, prepared and unreleased. No tag, push or deployment has been made by this work. [CHANGELOG.md](CHANGELOG.md) preserves the original unversioned commit history.

## Run

From the repository root:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory public
```

Open <http://127.0.0.1:8000>. No build or npm install is needed to use the page. HTTP/HTTPS is required for ES modules; do not double-click `index.html` as a `file://` page. Relative assets work on GitHub Pages project paths.

Conversion runs locally, with no runtime dependencies, telemetry, API calls or browser persistence. A restrictive meta CSP permits local assets and blocks outbound connections. Clipboard/downloads deliberately create copies outside the page.

## Hosts → BIND

1. Select the forward domain and IPv4 network. The default `172.16.` now correctly generates a `/16` reverse zone; `/8` and `/24` are also supported.
2. Set the authoritative DNS host, SOA admin in DNS mailbox notation, TTL and include/full mode.
3. Supply the previous installed SOA serial when updating an existing zone. Successful generation increments it, and the UI carries that serial into the next run. With no previous value, the seed is UTC `YYYYMMDD00`.
4. Paste `IPv4 primary aliases` rows, or click **Load example**, then generate.

```text
192.0.2.53 ns1
192.0.2.10 app www portal
```

For that example use domain `example.com`, network `192.0.2.`, DNS host `ns1`, admin `hostmaster`. Primary names become A records, aliases become CNAMEs and the first primary per IP supplies its PTR.

All output names are absolute. Full zones include `$ORIGIN`, `$TTL`, SOA and NS; an in-zone authoritative nameserver needs an A record in the selected input. Include fragments use explicit per-record TTLs and belong inside a complete zone via `$INCLUDE`, not inside `named.conf`.

Malformed input, conflicting aliases, unsupported networks and invalid settings block output. A dot inside an otherwise relative name is handled consistently for A and PTR records. Host input accepts a bare in-domain FQDN as a convenience; BIND input uses strict master-file relative-name rules.

## BIND → /etc/hosts

Paste a self-contained forward zone or fragment. Provide an origin if relative owners have no `$ORIGIN` context, choose the name format and generate. **Load example** demonstrates multiline SOA, A records and a CNAME chain.

```dns
$ORIGIN example.com.
$TTL 300
app IN A 192.0.2.10
www IN CNAME app
portal IN CNAME www
```

Default output includes FQDN and origin-relative forms:

```text
192.0.2.10       app.example.com app portal.example.com portal www.example.com www
```

Each numeric-sorted IP appears once. Multiple A owners sort before resolved CNAME aliases. CNAME chains resolve only from pasted A data; missing/external targets are warned and omitted. Loops/conflicts are fatal. Other record types, IPv6 and wildcards are reported and omitted; `$INCLUDE` and `$GENERATE` are blocked without reading files, fetching URLs or expanding records.

This is not a lossless round trip: hosts files do not preserve TTLs, DNS-only records, comments or DNS resolver semantics. Review and merge the downloaded `hosts` file manually.

## Interaction and safety

The tabs preserve separate inputs, settings, output and export state. Arrow keys, Home and End move focus/activate tabs. Editing input disables that tab's exports until regeneration; an invalid conversion clears its earlier output. Clipboard/download failures provide recovery guidance.

Both parsers enforce input/work/output limits. [docs/format-contract.md](docs/format-contract.md) specifies supported grammar, naming, serial policy and exact limits. Generated zones should still be independently reviewed and checked with BIND before installation; the page does not modify DNS or local hosts files.

## Verification commands

Requires Node 22+; CI uses Node 24. No npm dependencies are required.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run test:coverage
npm run test:bind
```

`test:bind` requires `named-checkzone`, or an absolute path in `BIND_CHECKZONE`. It validates `/8`, `/16`, `/24`, include-parent fixtures, negative zones and agreement between the importer and BIND canonicalisation.

An optional local matrix is available as `npm run test:browser` when Playwright and browsers are already installed. Set `PLAYWRIGHT_MODULE` to the installation's `index.mjs` if required. It never downloads browsers itself. Playwright remains disabled in CI under owner direction [EX-001](docs/engineering/EXCEPTIONS.md).

**Observed:** 141 unit tests, targeted-security checks and independent BIND checks pass locally. Real-browser execution is blocked by missing usable browser binaries; no browser/a11y pass is claimed. See [docs/verification.md](docs/verification.md).

## Source layout

| Path | Role |
| --- | --- |
| `public/index.html` | Two accessible converter panels; only `public/` is published. |
| `public/assets/css/` | Responsive presentation and focus/hidden states. |
| `public/assets/js/validation.js` | Shared naming, IPv4/network/TTL/serial rules, limits and errors. |
| `public/assets/js/core.js`, `converter.js` | Hosts parsing, DNS model, generation and export metadata. |
| `public/assets/js/bind-parser.js`, `bind-converter.js` | Separate BIND lexer/parser, CNAME resolution and hosts grouping. |
| `public/assets/js/ui.js`, `tabs.js`, `app.js`, `examples.js` | UI adapters, keyboard tabs, entry point and examples. |
| `public/assets/images/favicon.svg` | Local vector favicon. |
| `tests/`, `scripts/`, `docs/` | Verification, tooling and engineering evidence outside the publish root. |

Read [ARCHITECTURE.md](ARCHITECTURE.md), [AGENTS.md](AGENTS.md), [SECURITY.md](SECURITY.md) and [ROADMAP.md](ROADMAP.md) before changing behaviour.

## Licence

The original README states MIT licensing. There is no standalone `LICENSE` file; this work does not invent a copyright holder or alter licence terms.
