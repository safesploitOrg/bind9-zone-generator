import assert from 'node:assert/strict';
import test from 'node:test';
import { convertHosts } from '../../public/assets/js/converter.js';
import { convertBind } from '../../public/assets/js/bind-converter.js';
import { ConversionError, LIMITS, inputText } from '../../public/assets/js/validation.js';

const CONFIG = { domain: 'example.com', prefix: '192.0.2.', dnsHost: 'ns1', adminName: 'hostmaster', ttl: '300', outputMode: 'include' };
const NOW = new Date('2026-10-30T12:00:00Z');

test('deterministic malformed-input corpus produces controlled errors, not runtime crashes', () => {
  const alphabet = 'abcXYZ019. @;#\n\r\t"\\()<>/$\0';
  let seed = 0x51f2026;
  for (let sample = 0; sample < 400; sample += 1) {
    let input = '';
    for (let index = 0; index < 1 + sample % 128; index += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      input += alphabet[seed % alphabet.length];
    }
    for (const convert of [(value) => convertHosts(value, CONFIG, NOW), (value) => convertBind(value, { origin: 'example.com' })]) {
      try { assert.equal(typeof convert(input), 'object'); }
      catch (error) { assert.ok(error instanceof ConversionError, `${error.name}: ${error.message}`); }
    }
  }
});
test('byte, line and total-hostname limits are independently enforced', () => {
  assert.throws(() => inputText('é'.repeat(500_001)), /1 MB/);
  assert.throws(() => inputText('\n'.repeat(LIMITS.lines)), /line limit/);
  const input = Array.from({ length: 5100 }, (_, index) => `192.0.2.10 n${index} a${index}`).join('\n');
  assert.throws(() => convertHosts(input, CONFIG, NOW), /hostname tokens/);
});
test('a chain at the supported depth resolves successfully', () => {
  const chain = Array.from({ length: LIMITS.cnameDepth }, (_, index) => `n${index} CNAME ${index === LIMITS.cnameDepth - 1 ? 'app' : `n${index + 1}`}`).join('\n');
  assert.match(convertBind('$ORIGIN example.com.\napp A 192.0.2.10\n' + chain).hosts, /n0.example.com/);
});
test('unresolved aliases and blocked includes never call a network fetcher', () => {
  const FETCH = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = () => { calls += 1; throw new Error('Unexpected network access'); };
  try {
    convertBind('$ORIGIN example.com.\napp A 192.0.2.10\nwww CNAME external.test.');
    assert.throws(() => convertBind('$INCLUDE https://example.invalid/zone'), /blocked/);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = FETCH; }
});
