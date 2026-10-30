import { buildModel, generateForward, generateReverse, parseHosts } from './core.js';
import { LIMITS, boundedOutput, fail, nextSerial, validateConfig } from './validation.js';

export function convertHosts(input, config, now = new Date()) {
  const settings = validateConfig(config);
  const parsed = parseHosts(input, settings.network);
  if (!parsed.records.length) fail('No matching hosts records to convert.', 'no-records');
  const model = buildModel(parsed.records, settings);
  const serial = nextSerial(now, settings.previousSerial);
  const messages = [...parsed.warnings, ...model.warnings];
  const warnings = messages.slice(0, LIMITS.diagnostics);
  if (messages.length > LIMITS.diagnostics) warnings.push({ type: 'warn', code: 'diagnostic-limit', message: 'Further warnings omitted; review the input before use.' });
  return {
    config: { ...settings }, serial, recordCount: parsed.records.length,
    warnings,
    forward: boundedOutput(generateForward(model, settings, serial)),
    reverse: boundedOutput(generateReverse(model, settings, serial)),
    reverseZone: settings.network.reverseZone
  };
}

export function exportFile(result, type) {
  if (type === 'forward') return { filename: result.config.outputMode === 'zone' ? `db.${result.config.domain}` : 'records.conf', text: result.forward };
  if (type === 'reverse') return { filename: `db.${result.reverseZone}`, text: result.reverse };
  if (type === 'hosts' && typeof result.hosts === 'string') return { filename: 'hosts', text: result.hosts };
  throw new TypeError(`Unknown output type: ${type}`);
}
