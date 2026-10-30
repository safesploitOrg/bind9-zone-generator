import { convertHosts, exportFile } from './converter.js';

const SETTINGS = ['domain', 'networkPrefix', 'dnsHost', 'adminName', 'ttl', 'outputMode'];
const EXPORT_BUTTONS = ['copyForwardButton', 'copyReverseButton', 'downloadForwardButton', 'downloadReverseButton'];

export function createApp({ document, navigator, url, Blob, now = () => new Date() }) {
  let lastResult = null;
  const get = (id) => document.getElementById(id);

  function status(message) {
    get('actionStatus').textContent = message;
  }

  function renderWarnings(warnings) {
    const list = get('warnings');
    list.replaceChildren();
    const messages = warnings.length ? warnings : [{ type: 'ok', message: 'No warnings detected.' }];
    for (const warning of messages) {
      const item = document.createElement('li');
      item.className = warning.type === 'ok' ? 'ok' : warning.type === 'warn' ? 'warning' : 'hint';
      item.textContent = warning.message;
      list.appendChild(item);
    }
  }

  function generate() {
    const config = Object.fromEntries(SETTINGS.map((id) => [id, get(id).value.trim()]));
    config.prefix = config.networkPrefix;
    delete config.networkPrefix;
    lastResult = convertHosts(get('hostsInput').value, config, now());
    get('forwardOutput').textContent = lastResult.forward;
    get('reverseOutput').textContent = lastResult.reverse;
    get('summary').textContent = `${lastResult.recordCount} matching records parsed.`;
    renderWarnings(lastResult.warnings);
    for (const id of EXPORT_BUTTONS) get(id).disabled = false;
    status('');
    return lastResult;
  }

  function markStale() {
    if (lastResult) status('Inputs changed. Generate again to update the output. Exports use the last generated settings.');
  }

  async function copy(type) {
    if (!lastResult) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(exportFile(lastResult, type).text);
      status('Output copied.');
    } catch {
      status('Copy failed. Select the output and copy it manually, or download the file.');
    }
  }

  function download(type) {
    if (!lastResult) return;
    const file = exportFile(lastResult, type);
    let objectUrl;
    const link = document.createElement('a');
    try {
      objectUrl = url.createObjectURL(new Blob([file.text], { type: 'text/plain' }));
      link.href = objectUrl;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      status('Download requested.');
    } catch {
      status('Download failed. Select the output and copy it manually.');
    } finally {
      link.remove();
      if (objectUrl) url.revokeObjectURL(objectUrl);
    }
  }

  function bind() {
    get('generateButton').addEventListener('click', generate);
    get('copyForwardButton').addEventListener('click', () => copy('forward'));
    get('copyReverseButton').addEventListener('click', () => copy('reverse'));
    get('downloadForwardButton').addEventListener('click', () => download('forward'));
    get('downloadReverseButton').addEventListener('click', () => download('reverse'));
    for (const id of [...SETTINGS, 'hostsInput']) {
      get(id).addEventListener('input', markStale);
      get(id).addEventListener('change', markStale);
    }
  }

  return { bind, generate, copy, download, markStale };
}
