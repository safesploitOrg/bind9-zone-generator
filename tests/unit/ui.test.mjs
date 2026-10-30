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
  const defaults = { domain: 'example.com', networkPrefix: '192.0.2.', dnsHost: 'ns1', adminName: 'hostmaster', ttl: '300', outputMode: 'include', previousSerial: '', bindOrigin: '', nameStyle: 'both', bindInput: '$ORIGIN example.com.\napp A 192.0.2.10', hostsInput: '192.0.2.10 app www' };
  function node(id = '') {
    return {
      value: defaults[id] ?? '', textContent: '', children: [], events: {}, attributes: {}, hidden: false, tabIndex: 0,
      setAttribute(name, value) { this.attributes[name] = value; },
      focus() { this.focused = true; }, disabled: id.includes('Button') && id !== 'generateButton',
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
  assert.match(h.get('summary').textContent, /1 matching row/);
  assert.match(h.get('forwardOutput').textContent, /app.example.com.\s+300 IN A/);
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
  assert.equal(h.downloads.length, 0);
  assert.equal(h.get('downloadForwardButton').disabled, true);
  h.get('hostsInput').value += '\n192.0.2.53 ns1';
  h.app.generate();
  h.app.download('forward');
  assert.equal(h.downloads[0], 'db.example.com');
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


test('invalid generation clears earlier output and prevents stale export', () => {
  const h = harness();
  h.app.generate();
  h.get('hostsInput').value = '192.0.2.999 invalid';
  assert.equal(h.app.generate(), null);
  assert.equal(h.get('forwardOutput').textContent, '');
  assert.equal(h.get('reverseOutput').textContent, '');
  assert.equal(h.get('copyForwardButton').disabled, true);
  h.app.download('forward');
  assert.equal(h.downloads.length, 0);
});
test('serial advances each successful generation in the UI', () => {
  const h = harness();
  const first = h.app.generate();
  const second = h.app.generate();
  assert.equal(Number(second.serial), Number(first.serial) + 1);
  assert.equal(h.get('previousSerial').value, second.serial);
});
test('tab panels use selected state, roving tabindex and arrow/Home/End navigation', () => {
  const h = harness();
  h.app.bind();
  assert.equal(h.get('tab-forward').attributes['aria-selected'], 'true');
  assert.equal(h.get('panel-hosts').hidden, true);
  let prevented = false;
  h.get('tab-forward').events.keydown({ key: 'ArrowRight', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(h.get('tab-hosts').focused, true);
  assert.equal(h.get('tab-hosts').tabIndex, 0);
  assert.equal(h.get('panel-forward').hidden, true);
  h.get('tab-hosts').events.keydown({ key: 'Home', preventDefault() {} });
  assert.equal(h.get('panel-forward').hidden, false);
  h.get('tab-forward').events.keydown({ key: 'End', preventDefault() {} });
  assert.equal(h.get('panel-hosts').hidden, false);
  h.get('tab-hosts').events.keydown({ key: 'ArrowLeft', preventDefault() {} });
  assert.equal(h.get('panel-forward').hidden, false);
});
test('both converters retain independent settings, outputs and export state across tab switches', async () => {
  const h = harness();
  h.app.bind();
  h.app.generate();
  const original = h.get('forwardOutput').textContent;
  h.get('tab-hosts').events.click();
  h.app.generateBind();
  assert.match(h.get('hostsOutput').textContent, /192.0.2.10/);
  assert.equal(h.get('forwardOutput').textContent, original);
  h.app.download('hosts');
  assert.equal(h.downloads.at(-1), 'hosts');
  await h.app.copy('hosts');
  assert.equal(h.copies.at(-1), h.get('hostsOutput').textContent);
  h.get('bindInput').value = '$INCLUDE forbidden';
  h.get('bindInput').events.input();
  assert.equal(h.get('copyHostsButton').disabled, true);
  assert.equal(h.get('copyForwardButton').disabled, false);
  assert.equal(h.app.generateBind(), null);
  assert.equal(h.get('hostsOutput').textContent, '');
  assert.equal(h.get('forwardOutput').textContent, original);
});
test('examples populate each converter and generate useful output', () => {
  const h = harness();
  h.app.bind();
  h.get('exampleForwardButton').events.click();
  assert.ok(h.app.generate());
  h.get('exampleBindButton').events.click();
  assert.ok(h.app.generateBind());
  assert.match(h.get('hostsOutput').textContent, /portal.example.com/);
});
