import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { convertHosts, exportFile } from '../../public/assets/js/converter.js';
import { convertBind } from '../../public/assets/js/bind-converter.js';

const ROOT = new URL('../fixtures/legacy/', import.meta.url);
const BASELINE = JSON.parse(fs.readFileSync(new URL('cases.json', ROOT), 'utf8'));
const CONFIG = { domain: 'example.com', prefix: '192.0.2.', dnsHost: 'ns1', adminName: 'hostmaster', ttl: '300', outputMode: 'include' };
const NOW = new Date('2026-10-30T12:00:00Z');

test('original fixtures remain immutable historical evidence', () => {
  assert.equal(BASELINE.sourceCommit, '94a83854a5f55997a75726cabd46db4e6c2c96b6');
  assert.equal(BASELINE.cases.length, 9);
  assert.match(fs.readFileSync(new URL('known-default-prefix.reverse', ROOT), 'utf8'), /INVALID-PREFIX/);
});
test('historical invalid defaults are corrected rather than snapshotted as desired output', () => {
  const fixture = BASELINE.cases.find((entry) => entry.name === 'known-default-prefix');
  const current = convertHosts(fixture.input, fixture.config, NOW);
  assert.equal(current.reverseZone, '16.172.in-addr.arpa');
  assert.doesNotMatch(current.reverse, /INVALID-PREFIX/);
});
test('historical CNAME conflict now blocks; dotted-name fixture has matching absolute targets', () => {
  const conflict = BASELINE.cases.find((entry) => entry.name === 'known-cname-conflict');
  assert.throws(() => convertHosts(conflict.input, conflict.config, NOW), /conflict/);
  const dotted = BASELINE.cases.find((entry) => entry.name === 'known-dotted-name');
  const result = convertHosts(dotted.input, dotted.config, NOW);
  assert.match(result.forward, /app.internal.example.com./);
  assert.match(result.reverse, /PTR app.internal.example.com./);
});
test('config snapshot cannot be renamed by later edits', () => {
  const config = { ...CONFIG };
  const result = convertHosts('192.0.2.10 app', config, NOW);
  config.outputMode = 'zone';
  assert.deepEqual(exportFile(result, 'forward'), { filename: 'records.conf', text: result.forward });
});
test('full/reverse/hosts export metadata and unknown output types', () => {
  const result = convertHosts('192.0.2.53 ns1', { ...CONFIG, outputMode: 'zone' }, NOW);
  assert.equal(exportFile(result, 'forward').filename, 'db.example.com');
  assert.equal(exportFile(result, 'reverse').filename, 'db.2.0.192.in-addr.arpa');
  const hosts = convertBind('$ORIGIN example.com.\napp IN A 192.0.2.10');
  assert.deepEqual(exportFile(hosts, 'hosts'), { filename: 'hosts', text: hosts.hosts });
  assert.throws(() => exportFile(result, 'unknown'), /Unknown output type/);
});
