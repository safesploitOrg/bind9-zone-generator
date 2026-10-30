import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../public/assets/js/ui.js';

function harness(options = {}) {
  const nodes = new Map();
  const created = [];
  const copies = [];
  const downloads = [];
  const blobs = [];
  const revoked = [];
  const defaults = { domain: 'example.com', networkPrefix: '192.0.2.', dnsHost: 'ns1', adminName: 'hostmaster', ttl: '300', outputMode: 'include', hostsInput: '192.0.2.10 app www' };
  function node(id = '') {
    return {
      value: defaults[id] ?? '', textContent: '', children: [], events: {}, disabled: id.includes('Button') && id !== 'generateButton',
      set innerHTML(_value) { throw new Error('HTML insertion is prohibited'); },
      replaceChildren() { this.children = []; },
      appendChild(child) { this.children.push(child); },
      addEventListener(event, callback) { this.events[event] = callback; },
      click() { if (options.downloadFailure) throw new Error('denied'); downloads.push(this.download); },
      remove() { this.removed = true; }
    };
  }
  const document = {
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, node(id)); return nodes.get(id); },
    createElement(tag) { const element = node(); element.tag = tag; created.push(element); return element; },
    body: node()
  };
  const app = createApp({
    document, Blob,
    navigator: { clipboard: { async writeText(text) { if (options.copyFailure) throw new Error('denied'); copies.push(text); } } },
    url: { createObjectURL(blob) { blobs.push(blob); return 'blob:test'; }, revokeObjectURL(value) { revoked.push(value); } },
    now: () => new Date(2026, 4, 5, 12)
  });
  return { app, get: document.getElementById, created, copies, downloads, blobs, revoked };
}

test('event bindings generate outputs without inline handlers', () => {
  const h = harness();
  h.app.bind();
  h.get('generateButton').events.click();
  assert.equal(h.get('summary').textContent, '1 matching records parsed.');
  assert.match(h.get('forwardOutput').textContent, /app\s+IN\s+A/);
  assert.match(h.get('reverseOutput').textContent, /PTR\s+app.example.com./);
  assert.equal(h.get('copyForwardButton').disabled, false);
});
test('exports before generation do not create files or clipboard writes', async () => {
  const h = harness();
  await h.app.copy('forward');
  h.app.download('reverse');
  assert.deepEqual(h.copies, []);
  assert.deepEqual(h.downloads, []);
});
test('warning rendering uses text, including markup-shaped invalid addresses', () => {
  const h = harness();
  h.get('hostsInput').value = '<img/onerror=alert(1)> bad';
  h.app.generate();
  assert.match(h.get('warnings').children[0].textContent, /<img\/onerror=alert\(1\)>/);
  assert.ok(h.created.every((element) => element.tag === 'li'));
});
test('successive generations replace rather than accumulate warning elements', () => {
  const h = harness();
  h.get('hostsInput').value = 'bad invalid';
  h.app.generate();
  h.get('hostsInput').value = '192.0.2.10 app';
  h.app.generate();
  assert.equal(h.get('warnings').children.length, 1);
  assert.equal(h.get('warnings').children[0].textContent, 'No warnings detected.');
});
test('clipboard copies generated content and reports success', async () => {
  const h = harness();
  h.app.generate();
  await h.app.copy('forward');
  assert.equal(h.copies[0], h.get('forwardOutput').textContent);
  assert.equal(h.get('actionStatus').textContent, 'Output copied.');
});
test('clipboard denial produces recoverable feedback', async () => {
  const h = harness({ copyFailure: true });
  h.app.generate();
  await h.app.copy('reverse');
  assert.match(h.get('actionStatus').textContent, /Copy failed/);
});
test('changing the mode cannot mislabel an already generated include fragment', async () => {
  const h = harness();
  h.app.bind();
  h.app.generate();
  h.get('outputMode').value = 'zone';
  h.get('outputMode').events.change();
  assert.match(h.get('actionStatus').textContent, /Inputs changed/);
  h.app.download('forward');
  assert.equal(h.downloads[0], 'records.conf');
  assert.equal(await h.blobs[0].text(), h.get('forwardOutput').textContent);
  assert.deepEqual(h.revoked, ['blob:test']);
});
test('download failure still releases its temporary URL and anchor', () => {
  const h = harness({ downloadFailure: true });
  h.app.generate();
  h.app.download('reverse');
  assert.match(h.get('actionStatus').textContent, /Download failed/);
  assert.deepEqual(h.revoked, ['blob:test']);
  assert.equal(h.created.at(-1).removed, true);
});
