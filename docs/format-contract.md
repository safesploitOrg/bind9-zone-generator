# Supported conversion formats — 0.2.0-alpha.1

This is the implemented contract. Both converters are bounded, offline text transformations, not general DNS servers or complete BIND validators.

## Hosts → BIND

- Rows are `IPv4 primary-name alias1 alias2`; blank lines and `#`/`;` comments are ignored.
- Matching malformed rows, invalid IPv4 text, invalid names/settings, empty results and conflicts block generation. Valid addresses outside the selected network are excluded. Invalid IP text cannot be classified into a network and is rejected.
- IPv4 components with leading zeros are interpreted explicitly as decimal and normalised before filtering/deduplication.
- Networks are one/two/three octets, optionally ending in a dot, or aligned `/8`, `/16`, `/24` CIDR. Host bits must be zero in CIDR notation. Other lengths, IPv6 and classless delegation are rejected.
- `/8` PTR owners reverse the remaining three octets; `/16` reverses two; `/24` uses the final octet. A single reverse zone is produced.
- Names are case-folded ASCII hostnames. Labels are 1–63 characters; the complete unrooted name is at most 253. Unicode input, escapes, empty labels and non-host characters are rejected; pre-encoded IDNA ASCII labels can be used.
- A trailing dot is absolute. A bare name already ending in the configured forward domain is accepted as an FQDN convenience. Other unrooted names, including dotted-relative names, are expanded under the forward domain. A/PTR/CNAME naming uses the same result.
- Owners explicitly outside the forward domain are rejected. Header names may be explicitly absolute outside the zone; SOA admin uses DNS mailbox notation, not an email address.
- A complete primary-name index is built before aliases are checked. Aliases cannot collide with A owners or the zone apex, have multiple targets, or be used as the authoritative nameserver. Multi-address primary A RRsets are supported.
- The first primary for an IP supplies its PTR; another primary at that IP is reported. Forward ordering is canonical name then numeric IP; reverse ordering is numeric IP.
- Full output includes `$ORIGIN`, `$TTL`, SOA and NS. An in-zone NS needs a primary A record in the selected input. Include fragments use absolute owners/targets and explicit per-record TTLs, and belong inside a zone's `$INCLUDE` context.
- TTL accepts seconds or BIND-style unit sequences such as `1h30m`, bounded to 0–2147483647 seconds. A supplied previous SOA serial is incremented modulo 2³². With none supplied, the initial serial is UTC `YYYYMMDD00`; the UI then feeds each successful serial into the next generation. Supply installed state after a reload or when changing zones; the app does not query it.

## BIND → /etc/hosts

### Grammar

- Accepts plain-text master files and fragments: `$ORIGIN`, `$TTL`, semicolon comments, inherited owners indicated by leading whitespace, TTL/class fields in either order, multiline parentheses and quoted non-host RDATA.
- Names follow strict BIND rules: without a trailing dot, they are relative to the current origin even when they look like an FQDN. The hosts-input convenience rule above is deliberately not applied to BIND grammar.
- An optional initial origin supplies fragment context. The first `$ORIGIN` establishes scope if none was supplied; subsequent origins may select subdomains of that scope. A different zone is rejected. Fully absolute records can be used without any origin; then FQDN output is available, but short-only mode requires an origin.
- A preceding absolute owner remains the inherited owner across `$ORIGIN` changes. Strings, comments and parentheses are tokenised before records are interpreted, so record-looking text inside quoted TXT data cannot become an A record.
- DNS name escapes, escaped line continuations, quoted A/CNAME values and unsupported/malformed directives are rejected explicitly. `$INCLUDE` and `$GENERATE` always block conversion; no file reads, HTTP requests, DNS lookups or directive expansion occur.

### Record and alias policy

- IPv4 `IN A` records and `IN CNAME` aliases are converted. Common other types, non-IN classes and unknown `TYPE0`–`TYPE65535` records are reported and omitted. Unsupported/unknown type names are rejected rather than guessed.
- Wildcard A/CNAME owners and out-of-zone supported owners are reported and omitted. Non-host owner syntax is only tolerated while skipping non-host record types.
- CNAME owner conflicts, multiple targets, loops and excessive chains block the entire result. A CNAME cannot occupy the zone apex or coexist with other data except supported DNSSEC companion types RRSIG/NSEC.
- Chains resolve only to A data in the pasted input. Missing/external targets produce warnings and no invented address. An alias resolving to a multi-address A RRset is included for every address.
- Unsupported RDATA is structurally tokenised but not fully DNS-validated. For example, the importer is not an independent SOA/DNSSEC validator; use BIND itself to validate full zones.

### Hosts output

- One line per numeric-sorted IPv4 address, deduplicated. A-owner names sort lexically before resolved CNAME owners; the first A name is the canonical name. Input order does not change grouping.
- FQDN-only mode removes terminal dots. Origin-relative mode removes the selected domain suffix only; an apex address keeps the domain name rather than emitting `@`. Both mode emits each FQDN followed by its distinct origin-relative form.
- Without an origin, both mode emits only FQDNs and reports that short names were unavailable.
- DNS TTLs, comments, IPv6, SOA/NS/MX/TXT/SRV data and resolver ordering/round-robin semantics are not preserved. A hosts file is not a lossless DNS representation.
- The downloaded filename is `hosts`; it is never installed automatically. Review and merge it manually without losing existing local entries.

## Resource limits

| Resource | Limit |
| --- | --- |
| Input | 1,000,000 UTF-8 bytes and 20,000 lines |
| Hosts rows / total hostname tokens | 10,000 each |
| Names on a hosts row | 64 |
| BIND logical records / tokens | 10,000 / 100,000 |
| Logical record / token length | 32,768 / 4,096 characters |
| CNAME chain depth | 32 |
| Alias-resolution/address-expansion work | 200,000 operations |
| DNS names grouped at one IP | 256 before FQDN/relative display expansion |
| Diagnostics | 100, plus one truncation notice; fatal errors are never dropped |
| Output file | 2,000,000 UTF-8 bytes |

Exceeding a processing limit blocks export. Conversion stays synchronous on the main thread; these bounds limit work but are not a universal latency guarantee for every device.

## References

- [RFC 1035 §5.1](https://www.rfc-editor.org/rfc/rfc1035.html#section-5.1): master-file name/origin rules.
- [RFC 1982](https://www.rfc-editor.org/rfc/rfc1982.html): serial arithmetic.
- [ISC BIND documentation](https://bind9.readthedocs.io/en/stable/chapter3.html): zone-file examples and loading context.
