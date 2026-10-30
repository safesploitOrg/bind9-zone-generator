import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { convertHosts } from '../public/assets/js/converter.js';
import { convertBind } from '../public/assets/js/bind-converter.js';

const CONFIG = { domain: 'example.com', prefix: '192.0.2.', dnsHost: 'ns1', adminName: 'hostmaster', ttl: '300', outputMode: 'zone' };
const NOW = new Date('2026-10-30T12:00:00Z');
const BIND_CHECKZONE = process.env.BIND_CHECKZONE || 'named-checkzone';

function validate(directory, name, zone, text, expectedStatus = 0, dump = false) {
  const filename = path.join(directory, name);
  fs.writeFileSync(filename, text);
  const result = spawnSync(BIND_CHECKZONE, [...(dump ? ['-q', '-D'] : []), zone, filename], { encoding: 'utf8' });
  if (result.error) throw new Error('named-checkzone is required. Set BIND_CHECKZONE or install bind9-utils/bind-utils. No checks were skipped.');
  assert.equal(result.status, expectedStatus, `${name}: ${result.stdout}${result.stderr}`);
  console.log(`${name}: ${expectedStatus === 0 ? 'accepted' : 'rejected as expected'}`);
  return result.stdout;
}

function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bind9-zone-check-'));
  try {
    for (const [prefix, input] of [['192.0.2.', '192.0.2.53 ns1\n192.0.2.10 app www'], ['172.16.', '172.16.1.53 ns1\n172.16.5.10 app www'], ['10.', '10.1.1.53 ns1\n10.2.3.4 app www']]) {
      const result = convertHosts(input, { ...CONFIG, prefix }, NOW);
      validate(directory, `forward-${result.config.network.bits}.zone`, 'example.com', result.forward);
      validate(directory, `reverse-${result.config.network.bits}.zone`, result.reverseZone, result.reverse);
    }
    const include = convertHosts('192.0.2.10 app www', { ...CONFIG, outputMode: 'include' }, NOW);
    const parent = '$ORIGIN example.com.\n$TTL 300\n@ IN SOA ns1.example.com. hostmaster.example.com. (2026103000 3600 900 604800 86400)\n@ IN NS ns1.example.com.\nns1 IN A 192.0.2.53\n';
    fs.writeFileSync(path.join(directory, 'records.conf'), include.forward);
    validate(directory, 'include-parent.zone', 'example.com', `${parent}$INCLUDE "${path.join(directory, 'records.conf')}"\n`);
    const fixture = fs.readFileSync(new URL('../tests/fixtures/bind/reference.zone', import.meta.url), 'utf8');
    const canonical = validate(directory, 'reference.zone', 'example.com', fixture, 0, true);
    const expected = convertBind(fixture, { nameStyle: 'fqdn' }).hosts;
    assert.equal(convertBind(canonical, { origin: 'example.com', nameStyle: 'fqdn' }).hosts, expected, 'Importer must agree for the original and BIND-canonicalised zone');
    console.log('Importer agrees with BIND canonicalisation for the reference zone.');
    validate(directory, 'invalid-ttl.zone', 'example.com', parent.replace('$TTL 300', '$TTL not-a-ttl'), 1);
    validate(directory, 'invalid-cname.zone', 'example.com', parent + 'app IN A 192.0.2.10\napp IN CNAME ns1\n', 1);
    assert.throws(() => convertHosts('192.0.2.10 app shared\n192.0.2.20 shared', CONFIG, NOW), /conflict/);
    console.log('All BIND integration checks passed.');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

main();
