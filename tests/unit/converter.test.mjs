import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { convertHosts, exportFile } from '../../public/assets/js/converter.js';

const FIXTURE_ROOT = new URL('../fixtures/legacy/', import.meta.url);
const BASELINE = JSON.parse(fs.readFileSync(new URL('cases.json', FIXTURE_ROOT), 'utf8'));
const CONFIG = { domain: 'example.com', prefix: '192.0.2.', dnsHost: 'ns1', adminName: 'hostmaster', ttl: '300', outputMode: 'include' };
const NOW = new Date(...BASELINE.localTime);

for (const fixture of BASELINE.cases) {
  const issue = fixture.knownIssue ? ` (inherited ${fixture.knownIssue}; compatibility, not correctness)` : '';
  test(`baseline output parity: ${fixture.name}${issue}`, () => {
    const result = convertHosts(fixture.input, fixture.config, NOW);
    assert.equal(result.forward, fs.readFileSync(new URL(`${fixture.name}.forward`, FIXTURE_ROOT), 'utf8'));
    assert.equal(result.reverse, fs.readFileSync(new URL(`${fixture.name}.reverse`, FIXTURE_ROOT), 'utf8'));
    assert.deepEqual(result.warnings, JSON.parse(fs.readFileSync(new URL(`${fixture.name}.warnings.json`, FIXTURE_ROOT), 'utf8')));
    assert.equal(result.recordCount, fixture.recordCount);
  });
}
test('conversion captures config independently of later input changes', () => {
  const config = { ...CONFIG };
  const result = convertHosts('192.0.2.10 app', config, NOW);
  config.outputMode = 'zone';
  config.domain = 'changed.example';
  assert.deepEqual(exportFile(result, 'forward'), { filename: 'records.conf', text: result.forward });
});
test('full-zone and reverse filenames match their captured output', () => {
  const result = convertHosts('192.0.2.10 app', { ...CONFIG, outputMode: 'zone' }, NOW);
  assert.equal(exportFile(result, 'forward').filename, 'db.example.com');
  assert.deepEqual(exportFile(result, 'reverse'), { filename: 'db.2.0.192.in-addr.arpa', text: result.reverse });
});
test('unsupported export types fail explicitly', () => {
  assert.throws(() => exportFile(convertHosts('', CONFIG, NOW), 'unknown'), /Unknown output type/);
});
test('header serials share the conversion timestamp', () => {
  const result = convertHosts('192.0.2.53 ns1', { ...CONFIG, outputMode: 'zone' }, NOW);
  assert.equal(result.forward.match(/\d{10} ; serial/)[0], result.reverse.match(/\d{10} ; serial/)[0]);
});
