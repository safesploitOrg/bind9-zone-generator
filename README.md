# dnsmasq hosts.d → BIND9 Zone Generator

A static browser tool for converting pasted `IP primary-name aliases` records into BIND9 forward/include and reverse-zone text. Conversion runs locally; no API, database, tracking or runtime dependencies are used.

**Prepared version:** `0.1.0-alpha.1` — unreleased, untagged. Historical commits were unversioned; see [CHANGELOG.md](CHANGELOG.md).

## Run locally

From the repository root:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory public
```

Open <http://127.0.0.1:8000>. No build or npm install is needed to run the page. Serve it over HTTP/HTTPS: double-clicking `index.html` as a `file://` URL is not supported after the move to ES modules. GitHub Pages project paths are supported through relative asset URLs.

## Use

1. Configure the forward domain, prefix, authoritative DNS host, SOA admin label, TTL and output mode.
2. Paste hosts records, for example:

   ```text
   192.0.2.10 app www portal
   192.0.2.53 ns1
   ```

3. For this example, use domain `example.com`, prefix `192.0.2.`, DNS host `ns1` and admin label `hostmaster`.
4. Generate and review both outputs and warnings, then copy or download.

Primary names become A records; additional names become CNAMEs. Reverse output uses the first primary name per IP. Include mode produces a zone-file fragment without a header, intended for `$INCLUDE` inside a complete zone, rather than a `named.conf` include.

Copy/download buttons become available after generation. Editing inputs flags the output as stale; exports continue to use the last generated content and settings until regeneration. Clipboard/download failures provide recovery guidance.

## Current limitations

- The inherited default `172.16.` filter does **not** generate a correct `/16` reverse zone. For supported reverse output, use one three-octet prefix ending in a dot.
- Dotted-relative names, conflicting aliases, fully qualified reverse-header settings and name normalisation have known issues. Use short host/admin labels and inspect the result carefully.
- IPv6, arbitrary CIDR ranges, multi-zone reverse output and comprehensive DNS validation are unsupported.
- Hourly serials are not automatically incremented against installed DNS state.
- Warnings do not block generation. Validate complete output with BIND before installing it; the application never applies DNS changes.

See [docs/known-issues.md](docs/known-issues.md) for reproductions and mitigations. The two-tab interface and BIND → `/etc/hosts` converter are planned in [ROADMAP.md](ROADMAP.md), not included in this version.

## Develop and test

Requires Node 22+; CI uses Node 24. There are no npm runtime/development dependencies.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run test:coverage
npm run test:bind
```

The last command requires `named-checkzone`. [docs/testing.md](docs/testing.md) explains unit fixtures, BIND checks, focused source checks and Semgrep commands. Playwright is intentionally disabled in CI by owner request; [EX-001](docs/engineering/EXCEPTIONS.md) records the gap. Unit adapter tests are not browser verification.

The workflow validates pull requests and `main`, then deploys only after all configured gates pass. Hosted execution and repository-required checks must be verified by the maintainer. See [docs/verification.md](docs/verification.md) for the checks actually performed when preparing this package.

## Layout and guidance

| Path | Role |
| --- | --- |
| `public/index.html` | UI markup; only publishable assets belong under `public/`. |
| `public/assets/css/styles.css` | Presentation. |
| `public/assets/js/core.js` | Pure parsing, analysis and zone formatting. |
| `public/assets/js/converter.js` | Complete conversion result and export metadata. |
| `public/assets/js/ui.js` | DOM, event handlers, clipboard and download adapters. |
| `public/assets/js/app.js` | Browser entry point. |
| `public/assets/images/favicon.svg` | Local vector favicon. |
| `tests/`, `scripts/` | Verification code and fixtures, outside the publish root. |
| `docs/` | Testing, security review, known issues and engineering policy. |

Read [ARCHITECTURE.md](ARCHITECTURE.md), [AGENTS.md](AGENTS.md) and [SECURITY.md](SECURITY.md) before making changes. Keep historical compatibility cases separate from assertions of correct DNS behaviour.

## Licence

The original README states MIT licensing. The reviewed repository has no standalone `LICENSE` file; this foundation change does not invent a copyright holder or alter licence terms.
