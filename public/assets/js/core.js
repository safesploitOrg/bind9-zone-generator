import { LIMITS, addWarning, absoluteName, fail, inZone, inputText, normalizeIPv4, parseNetwork } from './validation.js';

export const isIPv4 = (value) => normalizeIPv4(value) !== null;

export function parseHosts(input, prefix) {
  inputText(input);
  const network = typeof prefix === 'object' ? prefix : parseNetwork(prefix);
  const records = [];
  const warnings = [];
  for (const [index, raw] of input.split('\n').entries()) {
    const lineNumber = index + 1;
    const line = raw.split(/[;#]/, 1)[0].trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) fail('A hosts row requires an IPv4 address and a primary name.', 'invalid-row', lineNumber);
    const ip = normalizeIPv4(parts[0]);
    if (!ip) fail(`Invalid IPv4 address: ${parts[0].slice(0, 100)}`, 'invalid-ip', lineNumber);
    if (!ip.startsWith(network.prefix)) continue;
    if (parts.length - 1 > LIMITS.namesPerRow) fail('Too many hostnames on one row.', 'name-limit', lineNumber);
    if (parts[0] !== ip) addWarning(warnings, `IPv4 address normalised as decimal to ${ip}.`, 'normalised-ip', lineNumber, 'info');
    records.push({ ip, hostnames: parts.slice(1), lineNumber });
    if (records.length > LIMITS.records) fail('Too many hosts records.', 'record-limit', lineNumber);
  }
  return { records, warnings };
}

export function buildModel(records, config) {
  if (records.reduce((count, record) => count + record.hostnames.length, 0) > LIMITS.records) fail('Too many hostname tokens.', 'name-limit');
  const addresses = new Map();
  const aliases = new Map();
  const ptr = new Map();
  const warnings = [];
  const canonical = (name, lineNumber) => {
    let value;
    try { value = absoluteName(name, config.origin, { autoFqdn: true }); }
    catch (error) { fail(error.message, error.code, lineNumber); }
    if (!inZone(value, config.origin)) fail(`Name '${value}' is outside the forward zone.`, 'out-of-zone', lineNumber);
    return value;
  };
  const normalized = records.map((record) => ({ ...record, hostnames: record.hostnames.map((name) => canonical(name, record.lineNumber)) }));
  for (const record of normalized) {
    const primary = record.hostnames[0];
    if (!addresses.has(primary)) addresses.set(primary, new Set());
    addresses.get(primary).add(record.ip);
    if (!ptr.has(record.ip)) ptr.set(record.ip, primary);
    else if (ptr.get(record.ip) !== primary) addWarning(warnings, `IP ${record.ip} uses first primary ${ptr.get(record.ip)} for PTR.`, 'ptr-first-primary', record.lineNumber, 'info');
  }
  for (const record of normalized) {
    const primary = record.hostnames[0];
    for (const alias of new Set(record.hostnames.slice(1))) {
      if (alias === primary) continue;
      if (alias === config.origin || addresses.has(alias)) fail(`CNAME alias '${alias}' conflicts with an A or zone-apex owner.`, 'cname-conflict', record.lineNumber);
      if (aliases.has(alias) && aliases.get(alias) !== primary) fail(`CNAME alias '${alias}' has conflicting targets.`, 'cname-conflict', record.lineNumber);
      aliases.set(alias, primary);
    }
  }
  if (aliases.has(config.dnsHost)) fail('Authoritative DNS host must not be a CNAME alias.', 'ns-alias');
  if (config.outputMode === 'zone' && inZone(config.dnsHost, config.origin) && !addresses.has(config.dnsHost)) fail('Full zone requires an A record for the in-zone authoritative DNS host.', 'missing-ns-address');
  return { addresses, aliases, ptr, warnings };
}

export function zoneHeader(origin, config, serial) {
  return `$ORIGIN ${origin}\n$TTL ${config.ttl}\n@ IN SOA ${config.dnsHost} ${config.adminName} (\n    ${serial} ; serial\n    3600 ; refresh\n    900 ; retry\n    604800 ; expire\n    86400 ) ; negative cache TTL\n@ IN NS ${config.dnsHost}\n\n`;
}

export function generateForward(model, config, serial) {
  const lines = [];
  if (config.outputMode === 'zone') lines.push(zoneHeader(config.origin, config, serial).trimEnd());
  lines.push('; Generated A and CNAME records; names are absolute.');
  const ttl = config.outputMode === 'include' ? `${config.ttl} ` : '';
  for (const name of [...model.addresses.keys()].sort()) {
    for (const ip of [...model.addresses.get(name)].sort(compareIPs)) lines.push(`${name.padEnd(40)} ${ttl}IN A ${ip}`);
  }
  for (const alias of [...model.aliases.keys()].sort()) lines.push(`${alias.padEnd(40)} ${ttl}IN CNAME ${model.aliases.get(alias)}`);
  return lines.join('\n') + '\n';
}

export function compareIPs(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < 4; index += 1) if (left[index] !== right[index]) return left[index] - right[index];
  return 0;
}

export function generateReverse(model, config, serial) {
  const lines = [zoneHeader(`${config.network.reverseZone}.`, config, serial).trimEnd(), '; Generated PTR records; first primary name per address.'];
  for (const ip of [...model.ptr.keys()].sort(compareIPs)) {
    const owner = ip.split('.').slice(config.network.octets.length).reverse().join('.');
    lines.push(`${owner.padEnd(16)} IN PTR ${model.ptr.get(ip)}`);
  }
  return lines.join('\n') + '\n';
}
