import { analyseRecords, generateForward, generateReverse, parseHosts, reverseZoneFromPrefix } from './core.js';

/** A conversion result captures its settings and output together for reliable export. */
export function convertHosts(input, config, now = new Date()) {
  const { domain, prefix, dnsHost, adminName, ttl, outputMode } = config;
  const parsed = parseHosts(input, prefix);

  return {
    config: { ...config },
    recordCount: parsed.records.length,
    warnings: [...parsed.warnings, ...analyseRecords(parsed.records, domain)],
    forward: generateForward(parsed.records, domain, dnsHost, adminName, ttl, outputMode, now),
    reverse: generateReverse(parsed.records, domain, dnsHost, adminName, ttl, prefix, now),
    reverseZone: reverseZoneFromPrefix(prefix)
  };
}

export function exportFile(result, type) {
  if (type === 'forward') {
    return {
      filename: result.config.outputMode === 'zone' ? `db.${result.config.domain || 'zone'}` : 'records.conf',
      text: result.forward
    };
  }
  if (type === 'reverse') return { filename: `db.${result.reverseZone}`, text: result.reverse };
  throw new TypeError(`Unknown output type: ${type}`);
}
