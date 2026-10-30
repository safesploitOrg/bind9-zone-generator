import { convertHosts, exportFile } from './converter.js';
import { convertBind } from './bind-converter.js';
import { createTabs } from './tabs.js';
import { BIND_EXAMPLE, HOSTS_EXAMPLE } from './examples.js';

const FORWARD_SETTINGS = ['domain', 'networkPrefix', 'dnsHost', 'adminName', 'ttl', 'outputMode', 'previousSerial'];
const BUTTONS = { forward: ['copyForwardButton', 'copyReverseButton', 'downloadForwardButton', 'downloadReverseButton'], bind: ['copyHostsButton', 'downloadHostsButton'] };
const ELEMENTS = { forward: { status: 'actionStatus', summary: 'summary', warnings: 'warnings' }, bind: { status: 'bindStatus', summary: 'bindSummary', warnings: 'bindWarnings' } };

export function createApp({ document, navigator, url, Blob, now = () => new Date() }) {
  const states = { forward: { result: null, stale: false }, bind: { result: null, stale: false } };
  const get = (id) => document.getElementById(id);
  const status = (message, mode = 'forward') => { get(ELEMENTS[mode].status).textContent = message; };
  const buttons = (mode, disabled) => { for (const id of BUTTONS[mode]) get(id).disabled = disabled; };

  function renderWarnings(warnings, mode) {
    const list = get(ELEMENTS[mode].warnings);
    list.replaceChildren();
    const messages = warnings.length ? warnings : [{ type: 'ok', message: 'No warnings detected.' }];
    for (const warning of messages) {
      const item = document.createElement('li');
      item.className = warning.type === 'error' ? 'error' : warning.type === 'ok' ? 'ok' : warning.type === 'warn' ? 'warning' : 'hint';
      item.textContent = warning.message;
      list.appendChild(item);
    }
  }

  function run(mode, action) {
    states[mode].result = null;
    states[mode].stale = false;
    buttons(mode, true);
    if (mode === 'forward') { get('forwardOutput').textContent = ''; get('reverseOutput').textContent = ''; }
    else get('hostsOutput').textContent = '';
    try {
      const result = action();
      states[mode].result = result;
      if (mode === 'forward') {
        get('forwardOutput').textContent = result.forward;
        get('reverseOutput').textContent = result.reverse;
        get('previousSerial').value = result.serial;
        get('summary').textContent = `${result.recordCount} matching row(s). SOA serial: ${result.serial}.`;
      } else {
        get('hostsOutput').textContent = result.hosts;
        get('bindSummary').textContent = `${result.addressCount} IPv4 A record(s), ${result.hostLines} hosts line(s).`;
      }
      renderWarnings(result.warnings, mode);
      buttons(mode, false);
      status('', mode);
      return result;
    } catch (error) {
      renderWarnings(error.issues ?? [{ type: 'error', message: 'Conversion failed. Check the input and try again.' }], mode);
      get(ELEMENTS[mode].summary).textContent = 'Generation blocked. No output is available for export.';
      status(error.issues ? error.message : 'Conversion failed. Check the input and try again.', mode);
      return null;
    }
  }

  function generate() {
    return run('forward', () => {
      const config = Object.fromEntries(FORWARD_SETTINGS.map((id) => [id, get(id).value.trim()]));
      config.prefix = config.networkPrefix;
      delete config.networkPrefix;
      return convertHosts(get('hostsInput').value, config, now());
    });
  }
  function generateBind() {
    return run('bind', () => convertBind(get('bindInput').value, { origin: get('bindOrigin').value.trim(), nameStyle: get('nameStyle').value }));
  }
  function markStale(mode = 'forward') {
    if (states[mode].result) {
      states[mode].stale = true;
      buttons(mode, true);
      status('Inputs changed. Generate again before exporting.', mode);
    }
  }
  function output(type) {
    const mode = type === 'hosts' ? 'bind' : 'forward';
    const state = states[mode];
    return state.result && !state.stale ? { mode, file: exportFile(state.result, type) } : null;
  }
  async function copy(type) {
    const current = output(type);
    if (!current) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(current.file.text);
      status('Output copied.', current.mode);
    } catch { status('Copy failed. Select the output and copy it manually, or download the file.', current.mode); }
  }
  function download(type) {
    const current = output(type);
    if (!current) return;
    let objectUrl;
    const link = document.createElement('a');
    try {
      objectUrl = url.createObjectURL(new Blob([current.file.text], { type: 'text/plain' }));
      link.href = objectUrl;
      link.download = current.file.filename;
      document.body.appendChild(link);
      link.click();
      status('Download requested.', current.mode);
    } catch { status('Download failed. Select the output and copy it manually.', current.mode); }
    finally { link.remove(); if (objectUrl) url.revokeObjectURL(objectUrl); }
  }
  function loadExample(mode) {
    if (mode === 'forward') {
      const values = { domain: 'example.com', networkPrefix: '192.0.2.', dnsHost: 'ns1', adminName: 'hostmaster', ttl: '300', outputMode: 'zone', previousSerial: '', hostsInput: HOSTS_EXAMPLE };
      for (const [id, value] of Object.entries(values)) get(id).value = value;
    } else { get('bindInput').value = BIND_EXAMPLE; get('bindOrigin').value = ''; get('nameStyle').value = 'both'; }
    markStale(mode);
  }
  function bind() {
    createTabs(document).bind();
    get('generateButton').addEventListener('click', generate);
    get('generateHostsButton').addEventListener('click', generateBind);
    for (const [id, type, action] of [['copyForwardButton', 'forward', copy], ['copyReverseButton', 'reverse', copy], ['downloadForwardButton', 'forward', download], ['downloadReverseButton', 'reverse', download], ['copyHostsButton', 'hosts', copy], ['downloadHostsButton', 'hosts', download]]) get(id).addEventListener('click', () => action(type));
    for (const id of [...FORWARD_SETTINGS, 'hostsInput']) for (const event of ['input', 'change']) get(id).addEventListener(event, () => markStale('forward'));
    for (const id of ['bindOrigin', 'nameStyle', 'bindInput']) for (const event of ['input', 'change']) get(id).addEventListener(event, () => markStale('bind'));
    get('exampleForwardButton').addEventListener('click', () => loadExample('forward'));
    get('exampleBindButton').addEventListener('click', () => loadExample('bind'));
  }
  return { bind, generate, generateBind, copy, download, markStale, loadExample };
}
