import { parseZone } from './bind-parser.js';
import { compareIPs } from './core.js';
import { LIMITS, addWarning, boundedOutput, fail, inZone } from './validation.js';

export function resolveAliases(addresses, aliases, warnings = []) {
  const resolved = new Map();
  const depths = new Map();
  let work = 0;
  for (const alias of [...aliases.keys()].sort()) {
    if (resolved.has(alias)) continue;
    const chain = [];
    const seen = new Set();
    let name = alias;
    while (!addresses.has(name) && !resolved.has(name)) {
      work += 1;
      if (work > LIMITS.work) fail('CNAME resolution exceeds the work limit.', 'work-limit');
      if (seen.has(name)) fail(`CNAME loop detected at '${name}'.`, 'cname-loop');
      seen.add(name);
      if (!aliases.has(name)) break;
      chain.push(name);
      if (chain.length > LIMITS.cnameDepth) fail('CNAME chain exceeds the depth limit.', 'cname-depth');
      name = aliases.get(name);
    }
    const terminal = addresses.has(name) ? name : resolved.get(name) ?? null;
    const tailDepth = depths.get(name) ?? 0;
    if (chain.length + tailDepth > LIMITS.cnameDepth) fail('CNAME chain exceeds the depth limit.', 'cname-depth');
    for (const [index, member] of chain.entries()) {
      resolved.set(member, terminal);
      depths.set(member, chain.length - index + tailDepth);
    }
    if (!terminal) addWarning(warnings, `Alias '${alias}' has no A target in the pasted records; no DNS lookup was attempted.`, 'unresolved-alias');
  }
  return resolved;
}

function displayNames(name, origin, style) {
  const fqdn = name.slice(0, -1);
  const relative = origin && origin !== '.' && name !== origin && inZone(name, origin) ? name.slice(0, -(origin.length + 1)) : fqdn;
  if (style === 'fqdn') return [fqdn];
  if (style === 'short') return [relative];
  return [...new Set([fqdn, relative])];
}

export function convertBind(input, config = {}) {
  const style = config.nameStyle ?? 'both';
  if (!['both', 'fqdn', 'short'].includes(style)) fail('Unknown hosts-name output style.', 'invalid-mode');
  const parsed = parseZone(input, config);
  const warnings = [...parsed.warnings];
  if (!parsed.addressCount) fail('No IPv4 A records to convert.', 'no-records');
  if (style === 'short' && !parsed.origin) fail('Short-name output requires a zone origin.', 'missing-origin');
  if (style === 'both' && !parsed.origin) addWarning(warnings, 'No origin was supplied; only absolute hostnames can be emitted.', 'missing-short-origin', undefined, 'info');
  const resolved = resolveAliases(parsed.addresses, parsed.aliases, warnings);
  const groups = new Map();
  let expansions = 0;
  function add(ip, name, primary) {
    expansions += 1;
    if (expansions > LIMITS.work) fail('Address/alias expansion exceeds the work limit.', 'work-limit');
    if (!groups.has(ip)) groups.set(ip, { primary: new Set(), aliases: new Set() });
    const group = groups.get(ip);
    group[primary ? 'primary' : 'aliases'].add(name);
    if (group.primary.size + group.aliases.size > LIMITS.namesPerIp) fail(`Too many names for ${ip}.`, 'name-limit');
  }
  for (const [name, ips] of parsed.addresses) for (const ip of ips) add(ip, name, true);
  for (const [alias, terminal] of resolved) if (terminal) for (const ip of parsed.addresses.get(terminal)) add(ip, alias, false);
  const lines = ['# Generated from pasted BIND records; IPv4 only.', '# DNS TTLs, comments and non-host records are not preserved.'];
  for (const ip of [...groups.keys()].sort(compareIPs)) {
    const group = groups.get(ip);
    const names = [...new Set([...group.primary].sort().concat([...group.aliases].sort()).flatMap((name) => displayNames(name, parsed.origin, style)))];
    lines.push(`${ip.padEnd(16)} ${names.join(' ')}`);
  }
  return { config: { origin: parsed.origin, nameStyle: style }, hosts: boundedOutput(lines.join('\n') + '\n'), warnings, recordCount: parsed.recordCount, addressCount: parsed.addressCount, hostLines: groups.size };
}
