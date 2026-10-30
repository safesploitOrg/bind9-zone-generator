import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { convertBind } from '../../public/assets/js/bind-converter.js';

test('BIND importer matches the independently written reference hosts mapping', () => {
  const input = fs.readFileSync(new URL('../fixtures/bind/reference.zone', import.meta.url), 'utf8');
  const expected = fs.readFileSync(new URL('../fixtures/bind/reference.hosts', import.meta.url), 'utf8');
  const normalize = (text) => text.trim().split('\n').map((line) => line.trim().replace(/\s+/g, ' ')).join('\n');
  assert.equal(normalize(convertBind(input).hosts), normalize(expected));
});
