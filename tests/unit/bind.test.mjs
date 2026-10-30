import assert from 'node:assert/strict';
import test from 'node:test';
import { lexZone, parseZone } from '../../public/assets/js/bind-parser.js';
import { convertBind, resolveAliases } from '../../public/assets/js/bind-converter.js';
import { LIMITS } from '../../public/assets/js/validation.js';

const BASE = '$ORIGIN example.com.\n$TTL 5m\n';
const rows = (result) => result.hosts.split('\n').filter((line) => line && !line.startsWith('#')).map((line) => line.trim().split(/\s+/));

test('A records and chained aliases produce one deterministic IP line', () => {
  const result = convertBind(BASE + 'app IN A 192.0.2.10\nwww IN CNAME app\nportal IN CNAME www');
  assert.deepEqual(rows(result), [['192.0.2.10', 'app.example.com', 'app', 'portal.example.com', 'portal', 'www.example.com', 'www']]);
});
test('TTL/class order, case, omitted class and inherited owners are supported', () => {
  const result = convertBind(BASE + 'APP 1h IN A 192.0.2.10\n    IN 30m A 192.0.2.20\nwww cname app');
  assert.equal(result.addressCount, 2);
  assert.equal(result.hostLines, 2);
  assert.ok(rows(result).every((line) => line.includes('www.example.com')));
});
test('multiline SOA, comments and quoted TXT cannot create fake A records', () => {
  const result = convertBind(BASE + '@ IN SOA ns1.example.com. hostmaster.example.com. (\n  1 1h ; comment\n  15m 1w 1d )\n@ IN TXT "safe; fake IN A 203.0.113.9 ( )"\napp IN A 192.0.2.10 ; real');
  assert.deepEqual(rows(result)[0].slice(0, 2), ['192.0.2.10', 'app.example.com']);
  assert.equal(result.warnings.filter((entry) => entry.code === 'unsupported-type').length, 2);
});
test('backslash-escaped quotes/semicolons in ignored RDATA stay inside one record', () => {
  const text = BASE + '@ TXT "a\\"; ) fake"\napp A 192.0.2.10';
  assert.equal(lexZone(text).length, 4);
  assert.equal(convertBind(text).addressCount, 1);
});
test('relative $ORIGIN transitions preserve inherited absolute owner', () => {
  const parsed = parseZone(BASE + 'app A 192.0.2.10\n$ORIGIN sub\n    A 192.0.2.20\nweb A 192.0.2.30');
  assert.deepEqual([...parsed.addresses.get('app.example.com.')], ['192.0.2.10', '192.0.2.20']);
  assert.ok(parsed.addresses.has('web.sub.example.com.'));
});
test('explicit origin supports include fragments and names without terminal dots remain relative', () => {
  const result = convertBind('app.example.com A 192.0.2.10', { origin: 'example.com', nameStyle: 'fqdn' });
  assert.deepEqual(rows(result), [['192.0.2.10', 'app.example.com.example.com']]);
});
test('fully absolute input can work without an origin', () => {
  const result = convertBind('app.example.com. A 192.0.2.10');
  assert.deepEqual(rows(result), [['192.0.2.10', 'app.example.com']]);
  assert.ok(result.warnings.some((warning) => warning.code === 'missing-short-origin'));
});
for (const style of ['fqdn', 'short', 'both']) test(`name style ${style}`, () => {
  const line = rows(convertBind(BASE + 'app.internal A 192.0.2.10', { nameStyle: style }))[0];
  assert.equal(line.includes('app.internal.example.com'), style !== 'short');
  assert.equal(line.includes('app.internal'), style !== 'fqdn');
});
test('apex A record uses the domain as hostname, never @ or empty text', () => assert.deepEqual(rows(convertBind(BASE + '@ A 192.0.2.10', { nameStyle: 'short' })), [['192.0.2.10', 'example.com']]));
test('multiple A owners at one IP have a stable canonical name independent of input order', () => {
  const a = convertBind(BASE + 'z A 192.0.2.10\na A 192.0.2.10');
  const b = convertBind(BASE + 'a A 192.0.2.10\nz A 192.0.2.10');
  assert.equal(a.hosts, b.hosts);
  assert.equal(rows(a)[0][1], 'a.example.com');
});
test('addresses sort numerically and duplicate mappings deduplicate', () => {
  const result = convertBind(BASE + 'app A 192.0.2.100\napp A 192.0.2.2\nAPP A 192.000.002.002');
  assert.equal(result.addressCount, 2);
  assert.deepEqual(rows(result).map((line) => line[0]), ['192.0.2.2', '192.0.2.100']);
});
test('unsupported AAAA/SRV/CAA and wildcard records are warned and omitted', () => {
  const result = convertBind(BASE + 'app A 192.0.2.10\napp AAAA 2001:db8::1\n_sip._tcp SRV 0 5 5060 app\n@ CAA 0 issue "ca.test"\n* A 192.0.2.20');
  assert.equal(result.hostLines, 1);
  assert.equal(result.warnings.length, 4);
});
test('out-of-zone owners and non-IN classes are warned and excluded', () => {
  const result = convertBind(BASE + 'app A 192.0.2.10\nout.other.test. A 192.0.2.20\nversion CH TXT "test"');
  assert.equal(result.hostLines, 1);
  assert.ok(result.warnings.some((warning) => warning.code === 'out-of-zone-owner'));
  assert.ok(result.warnings.some((warning) => warning.code === 'unsupported-class'));
});
test('missing or external alias targets are reported without network access', () => {
  const result = convertBind(BASE + 'app A 192.0.2.10\nmissing CNAME external.other.test.\nchain CNAME missing');
  assert.equal(result.hostLines, 1);
  assert.ok(result.warnings.some((warning) => warning.code === 'unresolved-alias'));
  assert.doesNotMatch(result.hosts, /external|missing|chain/);
});
for (const input of ['a CNAME a', 'a CNAME b\nb CNAME a']) test(`CNAME loop blocks output: ${input}`, () => assert.throws(() => convertBind(BASE + 'app A 192.0.2.10\n' + input), /loop/));
test('CNAME depth is bounded even when terminal paths are already cached', () => {
  const chain = Array.from({ length: LIMITS.cnameDepth + 1 }, (_, index) => `n${index} CNAME ${index === LIMITS.cnameDepth ? 'app' : `n${index + 1}`}`).join('\n');
  assert.throws(() => convertBind(BASE + 'app A 192.0.2.10\n' + chain), /depth/);
  const cached = new Map([['a.example.com.', 'app.example.com.']]);
  for (let index = 0; index < LIMITS.cnameDepth + 1; index += 1) cached.set(`z${String(index).padStart(2, '0')}.example.com.`, index ? `z${String(index - 1).padStart(2, '0')}.example.com.` : 'a.example.com.');
  assert.throws(() => resolveAliases(new Map([['app.example.com.', new Set(['192.0.2.10'])]]), cached), /depth/);
});
for (const text of ['a A 192.0.2.10\na CNAME other', 'a CNAME one\na CNAME two']) test('CNAME owner conflicts are fatal', () => assert.throws(() => convertBind(BASE + text), /both|conflicting/));
test('CNAME cannot coexist with TXT/AAAA/NS data or occupy the apex', () => {
  for (const record of ['a TXT "value"', 'a AAAA ::1', 'a NS ns.example.com.', '@ CNAME app']) {
    const alias = record.startsWith('@') ? '' : '\na CNAME app';
    assert.throws(() => convertBind(BASE + 'app A 192.0.2.10\n' + record + alias), /CNAME/);
  }
});
for (const directive of ['$INCLUDE /etc/passwd', '$GENERATE 1-999999 h$ A 192.0.2.$', '$UNKNOWN value']) test(`${directive.split(' ')[0]} is blocked`, () => assert.throws(() => convertBind(BASE + 'app A 192.0.2.10\n' + directive), /blocked|Unsupported directive/));
for (const text of ['app A 999.0.0.1', 'app A "192.0.2.10"', 'app A 192.0.2.10 extra', 'app IN IN A 192.0.2.10', 'app 300 400 A 192.0.2.10', 'app BOGUS x', 'app TYPE999999 x', 'app A', '    A 192.0.2.10', 'app CNAME bad..target']) test(`malformed zone blocks: ${text}`, () => assert.throws(() => convertBind(BASE + text)));
for (const text of ['@ TXT "unterminated', '@ SOA ns admin ( 1 2 3', '@ TXT )', '@ TXT (( a ))', '@ TXT "bad\nstring"', 'bad\\032name A 192.0.2.10']) test('malformed quotes, escapes or parentheses block output', () => assert.throws(() => convertBind(BASE + text)));
test('relative owners require an origin, and short output requires origin context', () => {
  assert.throws(() => convertBind('app A 192.0.2.10'), /origin/i);
  assert.throws(() => convertBind('app.example.com. A 192.0.2.10', { nameStyle: 'short' }), /origin/i);
});
test('multi-zone origin changes are blocked', () => assert.throws(() => convertBind(BASE + 'app A 192.0.2.10\n$ORIGIN other.test.\nx A 192.0.2.20'), /single zone/));
test('input and token bounds are enforced', () => {
  assert.throws(() => convertBind('x'.repeat(LIMITS.inputBytes + 1)), /limit/);
  assert.throws(() => lexZone('@ TXT "' + 'a'.repeat(LIMITS.tokenLength + 1) + '"'), /token/);
  assert.throws(() => convertBind(BASE + 'app A 192.0.2.10\0'), /NUL/);
});
test('alias expansion/name count is bounded', () => {
  const aliases = Array.from({ length: LIMITS.namesPerIp + 1 }, (_, index) => `alias${index} CNAME app`).join('\n');
  assert.throws(() => convertBind(BASE + 'app A 192.0.2.10\n' + aliases), /Too many names/);
});
test('warning count is bounded while real errors remain fatal', () => {
  const ignored = Array.from({ length: 150 }, (_, index) => `n${index} TXT "ignored"`).join('\n');
  const result = convertBind(BASE + 'app A 192.0.2.10\n' + ignored);
  assert.equal(result.warnings.length, LIMITS.diagnostics + 1);
  assert.throws(() => convertBind(BASE + 'app A 192.0.2.10\n' + ignored + '\nbad A invalid'), /Invalid IPv4/);
});
test('unsupported-only and empty input cannot be exported', () => {
  assert.throws(() => convertBind(BASE + 'app AAAA ::1'), /No IPv4/);
  assert.throws(() => convertBind(''), /No IPv4/);
});
test('invalid output style is rejected', () => assert.throws(() => convertBind(BASE + 'app A 192.0.2.10', { nameStyle: 'bad' }), /style/));
