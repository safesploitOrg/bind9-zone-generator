export const LIMITS = Object.freeze({ inputBytes: 1_000_000, lines: 20_000, records: 10_000, namesPerRow: 64, tokenLength: 4096, tokens: 100_000, recordLength: 32_768, diagnostics: 100, cnameDepth: 32, work: 200_000, namesPerIp: 256, outputBytes: 2_000_000 });
const UINT32 = 0x1_0000_0000;

export class ConversionError extends Error {
  constructor(message, code = 'invalid-input', lineNumber) {
    super(lineNumber ? `Line ${lineNumber}: ${message}` : message);
    this.name = 'ConversionError';
    this.code = code;
    this.issues = [{ type: 'error', code, message: this.message, lineNumber }];
  }
}

export function fail(message, code, lineNumber) { throw new ConversionError(message, code, lineNumber); }

export function inputText(input) {
  if (typeof input !== 'string') fail('Input must be text.');
  if (input.length > LIMITS.inputBytes || new TextEncoder().encode(input).length > LIMITS.inputBytes) fail('Input exceeds the 1 MB limit.', 'input-limit');
  if (input.includes('\0')) fail('NUL characters are not supported.', 'invalid-character');
  if (input.split('\n').length > LIMITS.lines) fail('Input exceeds the line limit.', 'input-limit');
  return input;
}

export function addWarning(warnings, message, code = 'notice', lineNumber, type = 'warn') {
  if (warnings.length < LIMITS.diagnostics) warnings.push({ type, code, message: lineNumber ? `Line ${lineNumber}: ${message}` : message, lineNumber });
  else if (warnings.length === LIMITS.diagnostics) warnings.push({ type: 'warn', code: 'diagnostic-limit', message: 'Further warnings omitted; review the input before use.' });
}

export function normalizeIPv4(value) {
  if (typeof value !== 'string' || !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return null;
  const octets = value.split('.').map(Number);
  return octets.every((octet) => octet <= 255) ? octets.join('.') : null;
}

export function parseNetwork(value) {
  const text = String(value ?? '').trim();
  let octets;
  if (text.includes('/')) {
    const match = text.match(/^([^/]+)\/(8|16|24)$/);
    const ip = match && normalizeIPv4(match[1]);
    if (!ip) fail('Network must be an octet prefix or an aligned /8, /16 or /24 CIDR.', 'invalid-network');
    const count = Number(match[2]) / 8;
    const all = ip.split('.');
    if (all.slice(count).some((octet) => octet !== '0')) fail('CIDR network has nonzero host bits.', 'invalid-network');
    octets = all.slice(0, count);
  } else {
    const parts = text.replace(/\.$/, '').split('.');
    if (parts.length < 1 || parts.length > 3 || !parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)) fail('Network must contain one, two or three IPv4 octets.', 'invalid-network');
    octets = parts.map((part) => String(Number(part)));
  }
  return { prefix: `${octets.join('.')}.`, octets, bits: octets.length * 8, reverseZone: `${[...octets].reverse().join('.')}.in-addr.arpa` };
}

export function inZone(name, origin) { return origin === '.' || name === origin || name.endsWith(`.${origin}`); }

export function absoluteName(value, origin = '', { autoFqdn = false, loose = false } = {}) {
  if (typeof value !== 'string' || !value || value.length > 254 || /[\s\\";()<>@]/.test(value.replace(/^@$/, ''))) fail(`Invalid DNS name or label: ${String(value).slice(0, 120)}`, 'invalid-name');
  let name = value.toLowerCase();
  if (name === '@') {
    if (!origin) fail('The @ owner requires a zone origin.', 'missing-origin');
    return origin;
  }
  if (name === '.') return '.';
  if (!name.endsWith('.')) {
    if (autoFqdn && origin && (name === origin.slice(0, -1) || name.endsWith(`.${origin.slice(0, -1)}`))) name += '.';
    else {
      if (!origin) fail(`Relative name '${name}' requires a zone origin.`, 'missing-origin');
      name = origin === '.' ? `${name}.` : `${name}.${origin}`;
    }
  }
  const bare = name.slice(0, -1);
  const labels = bare.split('.');
  const expression = loose ? /^(?:[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?|\*)$/ : /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  if (bare.length > 253 || labels.some((label, index) => label.length > 63 || !expression.test(label) || (label === '*' && index !== 0))) fail(`Invalid DNS name or label: ${value.slice(0, 120)}`, 'invalid-name');
  return name;
}

export function zoneOrigin(value) {
  const text = String(value ?? '').trim();
  if (!text) fail('A forward zone domain is required.', 'missing-origin');
  return absoluteName(text.endsWith('.') ? text : `${text}.`);
}

export function parseTTL(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (text.length > 32 || !/^(?:\d+|(?:\d+[wdhms])+)$/.test(text)) fail('TTL must be seconds or BIND units such as 1h30m.', 'invalid-ttl');
  const units = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 };
  const ttl = /^\d+$/.test(text) ? Number(text) : [...text.matchAll(/(\d+)([wdhms])/g)].reduce((sum, match) => sum + Number(match[1]) * units[match[2]], 0);
  if (!Number.isSafeInteger(ttl) || ttl > 0x7fff_ffff) fail('TTL must be between 0 and 2147483647 seconds.', 'invalid-ttl');
  return ttl;
}

export function parseSerial(value) {
  if (!/^\d{1,10}$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) >= UINT32) fail('SOA serial must be an unsigned 32-bit integer.', 'invalid-serial');
  return Number(value);
}

export function nextSerial(now = new Date(), previous) {
  if (previous !== undefined && previous !== null && previous !== '') return String((parseSerial(previous) + 1) % UINT32);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) fail('A valid generation date is required.', 'invalid-date');
  const date = now.toISOString().slice(0, 10).replaceAll('-', '');
  return String(parseSerial(`${date}00`));
}

export function boundedOutput(text) {
  if (new TextEncoder().encode(text).length > LIMITS.outputBytes) fail('Generated output exceeds the 2 MB limit.', 'output-limit');
  return text;
}

export function validateConfig(config) {
  const origin = zoneOrigin(config.domain);
  if (origin === '.') fail('The root zone is not supported by this hosts converter.', 'invalid-origin');
  const network = parseNetwork(config.prefix);
  if (!['include', 'zone'].includes(config.outputMode)) fail('Unknown forward output mode.', 'invalid-mode');
  const dnsHost = absoluteName(String(config.dnsHost ?? '').trim(), origin, { autoFqdn: true });
  const adminName = absoluteName(String(config.adminName ?? '').trim(), origin, { autoFqdn: true });
  if (dnsHost === '.' || adminName === '.') fail('DNS host and SOA admin names must not be the root.', 'invalid-name');
  const previousSerial = config.previousSerial ?? '';
  if (previousSerial !== '') parseSerial(previousSerial);
  return { domain: origin.slice(0, -1), origin, prefix: network.prefix, network, dnsHost, adminName, ttl: parseTTL(config.ttl), outputMode: config.outputMode, previousSerial };
}
