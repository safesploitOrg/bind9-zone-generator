import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { convertHosts } from '../public/assets/js/converter.js';

const CONFIG = { domain: 'example.com', prefix: '192.0.2.', dnsHost: 'ns1', adminName: 'hostmaster', ttl: '300', outputMode: 'zone' };
const NOW = new Date(2026, 4, 5, 12);

function validate(directory, name, zone, text, expectedStatus) {
  const filename = path.join(directory, name);
  fs.writeFileSync(filename, text);
  const result = spawnSync('named-checkzone', [zone, filename], { encoding: 'utf8' });
  if (result.error) throw new Error('named-checkzone is required. Install bind9-utils (Debian/Ubuntu) or bind-utils (RHEL). No checks were skipped.');
  assert.equal(result.status, expectedStatus, `${name}: ${result.stdout}${result.stderr}`);
  console.log(`${name}: ${expectedStatus === 0 ? 'valid zone accepted' : 'invalid zone rejected as expected'}`);
}

function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bind9-zone-check-'));
  try {
    const result = convertHosts('192.0.2.53 ns1\n192.0.2.10 app www', CONFIG, NOW);
    validate(directory, 'forward.zone', 'example.com', result.forward, 0);
    validate(directory, 'reverse.zone', result.reverseZone, result.reverse, 0);
    const include = convertHosts('192.0.2.10 app www', { ...CONFIG, outputMode: 'include' }, NOW);
    const parent = '$TTL 300\n@ IN SOA ns1.example.com. hostmaster.example.com. (2026050512 3600 900 604800 86400)\n@ IN NS ns1.example.com.\nns1 IN A 192.0.2.53\n';
    fs.writeFileSync(path.join(directory, 'records.conf'), include.forward);
    validate(directory, 'include-parent.zone', 'example.com', `${parent}$INCLUDE "${path.join(directory, 'records.conf')}"\n`, 0);
    const badTtl = convertHosts('192.0.2.53 ns1', { ...CONFIG, ttl: 'not-a-ttl' }, NOW);
    validate(directory, 'invalid-ttl.zone', 'example.com', badTtl.forward, 1);
    const cnameConflict = convertHosts('192.0.2.53 ns1\n192.0.2.10 app shared\n192.0.2.20 shared', CONFIG, NOW);
    validate(directory, 'inherited-cname-conflict.zone', 'example.com', cnameConflict.forward, 1);
    console.log('BIND checks passed. Negative fixtures confirm validator rejection; inherited parser defects remain open.');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

main();
