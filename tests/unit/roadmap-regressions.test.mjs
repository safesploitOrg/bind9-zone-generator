import assert from 'node:assert/strict';
import test from 'node:test';
import { convertHosts } from '../../public/assets/js/converter.js';

const CONFIG = { domain: 'example.com', prefix: '192.0.2.', dnsHost: 'ns1', adminName: 'hostmaster', ttl: '300', outputMode: 'include' };
const NOW = new Date('2026-10-30T12:00:00Z');

test('A-01: /16 reverse owners include both remaining octets', () => {
  const result = convertHosts('172.16.5.10 app', { ...CONFIG, prefix: '172.16.' }, NOW);
  assert.equal(result.reverseZone, '16.172.in-addr.arpa');
  assert.match(result.reverse, /^10\.5\s+IN\s+PTR\s+app.example.com\./m);
});
test('A-02: alias/A collisions block export regardless of row order', () => {
  for (const input of ['192.0.2.10 app shared\n192.0.2.20 shared', '192.0.2.20 shared\n192.0.2.10 app shared']) {
    assert.throws(() => convertHosts(input, CONFIG, NOW), /conflict|both|collid/i);
  }
});
test('A-03: dotted-relative primary has the same absolute forward/PTR name', () => {
  const result = convertHosts('192.0.2.10 app.internal', CONFIG, NOW);
  assert.match(result.forward, /^app.internal.example.com\.\s+/m);
  assert.match(result.reverse, /PTR\s+app.internal.example.com\./);
});
test('A-04: qualified header names are not qualified twice', () => {
  const result = convertHosts('192.0.2.10 app', { ...CONFIG, dnsHost: 'ns1.example.com.', adminName: 'hostmaster.example.com.' }, NOW);
  assert.match(result.reverse, /SOA ns1.example.com\. hostmaster.example.com\. /);
  assert.doesNotMatch(result.reverse, /\.\.example.com/);
});
test('A-05: supplied previous serial is incremented', () => {
  const result = convertHosts('192.0.2.10 app', { ...CONFIG, previousSerial: '2026103099' }, NOW);
  assert.match(result.reverse, /2026103100 ; serial/);
});
test('A-06: invalid TTL blocks generation', () => {
  assert.throws(() => convertHosts('192.0.2.10 app', { ...CONFIG, ttl: 'not-a-ttl' }, NOW), /TTL/);
});
test('A-06: markup-shaped hostnames block generation', () => {
  assert.throws(() => convertHosts('192.0.2.10 <script>alert(1)</script>', CONFIG, NOW), /name|label/i);
});
test('A-07: case-insensitive equivalent owners deduplicate', () => {
  const result = convertHosts('192.0.2.10 APP\n192.0.2.10 app.example.com.', CONFIG, NOW);
  assert.equal((result.forward.match(/\sIN\s+A\s/g) ?? []).length, 1);
});
test('A-07: leading-zero IPv4 text is normalised as decimal', () => {
  const result = convertHosts('192.000.002.010 app', CONFIG, NOW);
  assert.equal(result.recordCount, 1);
  assert.match(result.forward, /192\.0\.2\.10/);
});
test('absolute out-of-zone owners cannot enter a single forward zone', () => {
  assert.throws(() => convertHosts('192.0.2.10 app.external.test.', CONFIG, NOW), /outside|zone/i);
});
test('empty conversions cannot produce exportable files', () => {
  assert.throws(() => convertHosts('# comments only', CONFIG, NOW), /no .*record|empty/i);
});
