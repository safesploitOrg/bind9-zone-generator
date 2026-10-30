import assert from 'node:assert/strict';
import test from 'node:test';
import { analyseRecords, ensureAbsoluteName, generateForward, generateReverse, generateSerial, isIPv4, parseHosts, reverseZoneFromPrefix } from '../../public/assets/js/core.js';

const NOW = new Date(2026, 4, 5, 12);
const PREFIX = '192.0.2.';
const parse = (input) => parseHosts(input, PREFIX);
const forward = (input, mode = 'include') => generateForward(parse(input).records, 'example.com', 'ns1', 'hostmaster', '300', mode, NOW);
const reverse = (input) => generateReverse(parse(input).records, 'example.com', 'ns1', 'hostmaster', '300', PREFIX, NOW);

for (const value of ['0.0.0.0', '192.0.2.10', '255.255.255.255']) {
  test(`IPv4 accepts boundary/ordinary address ${value}`, () => assert.equal(isIPv4(value), true));
}
for (const value of ['256.0.0.1', '-1.0.0.1', '192.0.2', '192.0.2.1.2', '192.0.2.x', '::1', '', ' 192.0.2.1']) {
  test(`IPv4 rejects ${JSON.stringify(value)}`, () => assert.equal(isIPv4(value), false));
}

test('parser preserves source line numbers and primary/alias order', () => {
  assert.deepEqual(parse('\n192.0.2.10 app www portal\n').records, [{ ip: '192.0.2.10', hostnames: ['app', 'www', 'portal'], lineNumber: 2 }]);
});
test('parser handles tabs, CRLF and both comment markers', () => {
  const result = parse('# heading\r\n; heading\r\n192.0.2.10\tapp alias # note\r\n192.0.2.20 db ; note');
  assert.deepEqual(result.records.map((row) => row.hostnames), [['app', 'alias'], ['db']]);
  assert.deepEqual(result.warnings, []);
});
test('parser warns and skips malformed input without dropping later valid rows', () => {
  const result = parse('192.0.2.999 invalid\n192.0.2.10\n192.0.2.20 valid');
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].hostnames[0], 'valid');
  assert.equal(result.warnings.length, 2);
  assert.match(result.warnings[0].message, /Line 1.*invalid IPv4/);
  assert.match(result.warnings[1].message, /Line 2.*fewer than 2 fields/);
});
test('parser filters other networks without warnings', () => {
  assert.deepEqual(parse('198.51.100.10 other'), { records: [], warnings: [] });
});
test('empty/comment-only input has no records or warnings', () => {
  assert.deepEqual(parse(' \n# comment\n; comment'), { records: [], warnings: [] });
});
test('analyser reports conflicting names without requiring a DOM', () => {
  const warnings = analyseRecords(parse('192.0.2.10 app\n192.0.2.20 app').records, 'example.com');
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].type, 'warn');
  assert.match(warnings[0].message, /multiple IPs: 192.0.2.10, 192.0.2.20/);
});
test('analyser explains the origin applied to dotted-relative forward names', () => {
  const warnings = analyseRecords(parse('192.0.2.10 app.internal').records, 'example.com');
  assert.match(warnings[0].message, /app.internal.example.com/);
});
test('analyser reports shared IP names and first-primary PTR selection', () => {
  assert.match(analyseRecords(parse('192.0.2.10 app www').records, 'example.com')[0].message, /first primary hostname/);
});
test('short and explicit absolute names form absolute header names', () => {
  assert.equal(ensureAbsoluteName('ns1', 'example.com'), 'ns1.example.com.');
  assert.equal(ensureAbsoluteName('ns1.example.net.', 'example.com'), 'ns1.example.net.');
});
test('serial uses an injected local clock and pads month/day/hour', () => {
  assert.equal(generateSerial(new Date(2026, 0, 2, 3)), '2026010203');
});
test('include mode emits A and CNAME records with no header', () => {
  const output = forward('192.0.2.10 app www');
  assert.match(output, /^app\s+IN\s+A\s+192\.0\.2\.10$/m);
  assert.match(output, /^www\s+IN\s+CNAME\s+app$/m);
  assert.doesNotMatch(output, /\$TTL|\bSOA\b|\$ORIGIN/);
  assert.ok(output.endsWith('\n'));
});
test('full mode includes TTL, SOA, NS and configured timing values', () => {
  const output = forward('192.0.2.53 ns1', 'zone');
  assert.match(output, /^\$TTL 300/m);
  assert.match(output, /SOA ns1.example.com. hostmaster.example.com./);
  assert.match(output, /2026050512 ; serial/);
  for (const timer of ['3600', '900', '604800', '86400']) assert.ok(output.includes(timer));
  assert.match(output, /IN\s+NS\s+ns1\.example\.com\./);
});
test('forward output preserves explicit absolute owners and CNAME targets', () => {
  assert.match(forward('192.0.2.10 app.example.com. www.example.com.'), /^www.example.com.\s+IN\s+CNAME\s+app.example.com.$/m);
});
test('duplicate rows emit a single A and CNAME while repeated primary IPs form an A RRset', () => {
  const output = forward('192.0.2.10 app www\n192.0.2.10 app www\n192.0.2.20 app');
  assert.equal((output.match(/IN\s+A\s/g) ?? []).length, 2);
  assert.equal((output.match(/IN\s+CNAME\s/g) ?? []).length, 1);
});
test('an alias identical to its primary does not become a CNAME', () => {
  assert.doesNotMatch(forward('192.0.2.10 app app'), /\sIN\s+CNAME\s/);
});
test('reverse output derives an octet-boundary zone and absolute PTR target', () => {
  assert.equal(reverseZoneFromPrefix(PREFIX), '2.0.192.in-addr.arpa');
  assert.match(reverse('192.0.2.10 app'), /^10\s+IN\s+PTR\s+app.example.com.$/m);
});
test('PTR deduplication uses the first primary per IP', () => {
  const output = reverse('192.0.2.10 app www\n192.0.2.10 other');
  assert.equal((output.match(/IN\s+PTR\s/g) ?? []).length, 1);
  assert.match(output, /PTR\s+app.example.com./);
});
test('raw markup-shaped names remain text data through parsing and generation', () => {
  const output = forward('192.0.2.10 <script>alert(1)</script>');
  assert.match(output, /<script>alert\(1\)<\/script>\s+IN\s+A/);
  // This checks transport as text, not DNS-name validity: see known issue A-06.
});
