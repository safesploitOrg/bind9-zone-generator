import assert from 'node:assert/strict';
import test from 'node:test';
import { isIPv4, parseHosts } from '../../public/assets/js/core.js';
import { LIMITS, absoluteName, nextSerial, normalizeIPv4, parseNetwork, parseSerial, parseTTL, validateConfig } from '../../public/assets/js/validation.js';
import { convertHosts } from '../../public/assets/js/converter.js';

const CONFIG = { domain: 'example.com', prefix: '192.0.2.', dnsHost: 'ns1', adminName: 'hostmaster', ttl: '300', outputMode: 'include' };
const NOW = new Date('2026-10-30T12:00:00Z');
for (const value of ['0.0.0.0', '192.0.2.10', '255.255.255.255']) test(`IPv4 accepts ${value}`, () => assert.equal(isIPv4(value), true));
for (const value of ['256.0.0.1', '-1.0.0.1', '192.0.2', '192.0.2.1.2', '192.0.2.x', '::1', '', ' 192.0.2.1']) test(`IPv4 rejects ${JSON.stringify(value)}`, () => assert.equal(isIPv4(value), false));
test('IPv4 leading zeros are decimal and canonical', () => assert.equal(normalizeIPv4('192.000.002.010'), '192.0.2.10'));
test('parser keeps line numbers and alias order', () => assert.deepEqual(parseHosts('\n192.0.2.10 app www portal', CONFIG.prefix).records, [{ ip: '192.0.2.10', hostnames: ['app', 'www', 'portal'], lineNumber: 2 }]));
test('hosts parser handles CRLF, tabs and both comment styles', () => assert.deepEqual(parseHosts('# heading\r\n; heading\r\n192.0.2.10\tapp alias # note\r\n192.0.2.20 db ; note', CONFIG.prefix).records.map((record) => record.hostnames), [['app', 'alias'], ['db']]));
test('other networks are excluded and empty comment input parses empty', () => {
  assert.equal(parseHosts('198.51.100.10 other', CONFIG.prefix).records.length, 0);
  assert.equal(parseHosts('# comment\n; comment', CONFIG.prefix).records.length, 0);
});
for (const input of ['192.0.2.999 invalid', '192.0.2.10']) test(`malformed row blocks conversion: ${input}`, () => assert.throws(() => convertHosts(input, CONFIG, NOW)));
for (const [prefix, zone] of [['10.', '10.in-addr.arpa'], ['172.16.', '16.172.in-addr.arpa'], ['192.0.2.', '2.0.192.in-addr.arpa'], ['172.16.0.0/16', '16.172.in-addr.arpa']]) test(`network ${prefix} derives ${zone}`, () => assert.equal(parseNetwork(prefix).reverseZone, zone));
for (const value of ['', '192.0.2.0/20', '192.0.2.1/24', '192.0.2.0', '999.', '192..2.']) test(`invalid/unsupported network ${value}`, () => assert.throws(() => parseNetwork(value)));
test('network matching respects full octet boundaries', () => assert.throws(() => convertHosts('192.0.20.10 wrong', { ...CONFIG, prefix: '192.0.2' }, NOW), /No matching/));
test('/8 reverse owners contain the remaining three octets', () => assert.match(convertHosts('10.2.3.4 app', { ...CONFIG, prefix: '10.' }, NOW).reverse, /^4.3.2\s+IN PTR app.example.com./m));
test('DNS names distinguish dotted-relative, explicit absolute and domain-aware hosts FQDNs', () => {
  assert.equal(absoluteName('app.internal', 'example.com.'), 'app.internal.example.com.');
  assert.equal(absoluteName('APP.EXAMPLE.COM', 'example.com.', { autoFqdn: true }), 'app.example.com.');
  assert.equal(absoluteName('app.example.com', 'example.com.'), 'app.example.com.example.com.');
  assert.equal(absoluteName('app.other.test.', 'example.com.'), 'app.other.test.');
});
for (const value of ['bad..name', '-bad', 'bad-', '<script>', 'bad/name', 'é', 'x'.repeat(64), 'bad;name']) test(`invalid DNS label ${value.slice(0, 30)}`, () => assert.throws(() => absoluteName(value, 'example.com.')));
test('root domain and empty configuration cannot generate zones', () => {
  assert.throws(() => validateConfig({ ...CONFIG, domain: '.' }));
  assert.throws(() => validateConfig({ ...CONFIG, domain: '' }));
});
for (const [value, expected] of [['0', 0], ['300', 300], ['1h30m', 5400], ['1W', 604800], ['2147483647', 2147483647]]) test(`TTL ${value}`, () => assert.equal(parseTTL(value), expected));
for (const value of ['-1', '1.5h', '2x', '2147483648', '', '1h;']) test(`invalid TTL ${value}`, () => assert.throws(() => parseTTL(value)));
test('serial increments, wraps in 32 bits and seeds from UTC date', () => {
  assert.equal(nextSerial(NOW), '2026103000');
  assert.equal(nextSerial(NOW, '2026103099'), '2026103100');
  assert.equal(nextSerial(NOW, '4294967295'), '0');
  assert.equal(nextSerial(NOW, '0'), '1');
  assert.throws(() => parseSerial('4294967296'));
  assert.throws(() => parseSerial('-1'));
});
test('full zone has an explicit origin, one serial and correct timers', () => {
  const result = convertHosts('192.0.2.53 ns1\n192.0.2.10 app www', { ...CONFIG, outputMode: 'zone' }, NOW);
  assert.match(result.forward, /^\$ORIGIN example.com.\n\$TTL 300/);
  assert.match(result.forward, /SOA ns1.example.com. hostmaster.example.com./);
  assert.equal(result.forward.match(/\d+ ; serial/)[0], result.reverse.match(/\d+ ; serial/)[0]);
  for (const timer of ['3600', '900', '604800', '86400']) assert.ok(result.forward.includes(timer));
});
test('full zone requires an in-zone NS address and disallows NS aliases', () => {
  assert.throws(() => convertHosts('192.0.2.10 app', { ...CONFIG, outputMode: 'zone' }, NOW), /requires an A record/);
  assert.throws(() => convertHosts('192.0.2.10 app ns1', CONFIG, NOW), /must not be a CNAME/);
});
test('external authoritative host is allowed when explicitly absolute', () => assert.match(convertHosts('192.0.2.10 app', { ...CONFIG, outputMode: 'zone', dnsHost: 'ns.external.test.' }, NOW).forward, /NS ns.external.test./));
test('duplicate rows deduplicate A and CNAME while A RRsets remain supported', () => {
  const output = convertHosts('192.0.2.10 app www\n192.0.2.10 APP www\n192.0.2.20 app', CONFIG, NOW).forward;
  assert.equal((output.match(/IN A /g) ?? []).length, 2);
  assert.equal((output.match(/IN CNAME /g) ?? []).length, 1);
});
test('conflicting CNAME targets are fatal', () => assert.throws(() => convertHosts('192.0.2.10 a shared\n192.0.2.20 b shared', CONFIG, NOW), /conflicting targets/));
test('self-aliases are deduplicated and PTR chooses first primary per address', () => {
  const result = convertHosts('192.0.2.10 app app\n192.0.2.10 other', CONFIG, NOW);
  assert.doesNotMatch(result.forward, /\sIN CNAME\s/);
  assert.match(result.reverse, /PTR app.example.com./);
  assert.equal(result.warnings[0].code, 'ptr-first-primary');
});
test('include mode emits absolute names and explicit TTLs without a header', () => {
  const output = convertHosts('192.0.2.10 app www', CONFIG, NOW).forward;
  assert.match(output, /^app.example.com.\s+300 IN A 192.0.2.10/m);
  assert.match(output, /www.example.com.\s+300 IN CNAME app.example.com./);
  assert.doesNotMatch(output, /\$ORIGIN|\$TTL|IN SOA/);
});
test('input, names-per-row and NUL bounds fail closed', () => {
  assert.throws(() => convertHosts('x'.repeat(LIMITS.inputBytes + 1), CONFIG, NOW), /limit/);
  assert.throws(() => convertHosts('192.0.2.10 app\0', CONFIG, NOW), /NUL/);
  assert.throws(() => convertHosts('192.0.2.10 ' + Array.from({ length: 65 }, (_, index) => 'n' + index).join(' '), CONFIG, NOW), /Too many hostnames/);
});
