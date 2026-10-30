import { LIMITS, addWarning, absoluteName, fail, inZone, inputText, normalizeIPv4, parseTTL, zoneOrigin } from './validation.js';

const IGNORED_TYPES = new Set('AAAA SOA NS MX TXT PTR SRV CAA DS DNSKEY RRSIG NSEC NSEC3 NSEC3PARAM TLSA SSHFP HTTPS SVCB DNAME NAPTR CERT LOC HINFO RP URI EUI48 EUI64 CSYNC ZONEMD SMIMEA OPENPGPKEY'.split(' '));

/** Tokenise logical master-file records without executing directives or resolving I/O. */
export function lexZone(input) {
  const text = inputText(input).replace(/\r\n?/g, '\n');
  const records = [];
  let record = null;
  let token = '';
  let hasToken = false;
  let tokenQuoted = false;
  let inQuote = false;
  let escaped = false;
  let comment = false;
  let depth = 0;
  let line = 1;
  let tokenCount = 0;

  function flushToken() {
    if (!hasToken) return;
    record.tokens.push({ value: token, quoted: tokenQuoted });
    tokenCount += 1;
    if (tokenCount > LIMITS.tokens) fail('Zone exceeds the token limit.', 'token-limit', line);
    token = '';
    hasToken = false;
    tokenQuoted = false;
  }

  function flushRecord() {
    flushToken();
    if (record?.tokens.length) records.push(record);
    if (records.length > LIMITS.records) fail('Zone exceeds the record limit.', 'record-limit', line);
    record = null;
  }

  for (const character of text) {
    if (!record) record = { tokens: [], lineNumber: line, leadingWhitespace: /[\t ]/.test(character), length: 0 };
    record.length += 1;
    if (record.length > LIMITS.recordLength) fail('Logical record exceeds the size limit.', 'record-limit', record.lineNumber);
    if (comment && character !== '\n') continue;
    if (escaped) {
      if (character === '\n') fail('Escaped line continuations are not supported.', 'unsupported-escape', line);
      token += character;
      escaped = false;
    } else if (character === '\\') {
      token += character;
      hasToken = true;
      escaped = true;
    } else if (character === '"') {
      inQuote = !inQuote;
      tokenQuoted = true;
      hasToken = true;
    } else if (inQuote) {
      if (character === '\n') fail('Unterminated quoted string.', 'invalid-syntax', line);
      token += character;
    } else if (character === ';') {
      flushToken();
      comment = true;
    } else if (character === '(' || character === ')') {
      flushToken();
      depth += character === '(' ? 1 : -1;
      if (depth < 0 || depth > 1) fail('Unbalanced or nested parentheses.', 'invalid-syntax', line);
    } else if (/\s/.test(character)) {
      flushToken();
    } else {
      token += character;
      hasToken = true;
    }
    if (token.length > LIMITS.tokenLength) fail('Zone token exceeds the size limit.', 'token-limit', line);
    if (character === '\n') {
      comment = false;
      if (!depth) flushRecord();
      line += 1;
    }
  }
  if (inQuote || escaped || depth) fail('Unterminated string, escape or parentheses.', 'invalid-syntax', line);
  flushRecord();
  return records;
}

export function parseZone(input, { origin: initialOrigin = '' } = {}) {
  let origin = initialOrigin.trim() ? zoneOrigin(initialOrigin) : '';
  let scope = origin;
  let previousOwner = '';
  const addresses = new Map();
  const aliases = new Map();
  const warnings = [];
  const ownerTypes = new Map();
  let recordCount = 0;
  let addressCount = 0;

  for (const record of lexZone(input)) {
    const { tokens, lineNumber, leadingWhitespace } = record;
    const first = tokens[0].value.toUpperCase();
    if (first.startsWith('$')) {
      if (first === '$INCLUDE' || first === '$GENERATE') fail(`${first} is blocked: paste self-contained records; no files, expansion or network access is performed.`, 'blocked-directive', lineNumber);
      if (tokens[0].quoted || tokens.length !== 2 || tokens[1].quoted) fail('Malformed zone directive.', 'invalid-directive', lineNumber);
      if (first === '$ORIGIN') {
        origin = absoluteName(tokens[1].value, origin);
        if (scope && !inZone(origin, scope)) fail('A single zone is supported; $ORIGIN is outside the selected zone.', 'out-of-zone-origin', lineNumber);
        if (!scope) scope = origin;
      } else if (first === '$TTL') parseTTL(tokens[1].value);
      else fail(`Unsupported directive: ${first}`, 'blocked-directive', lineNumber);
      continue;
    }

    let index = 0;
    let owner;
    if (leadingWhitespace) {
      if (!previousOwner) fail('An inherited owner requires a preceding record owner.', 'missing-owner', lineNumber);
      owner = previousOwner;
    } else {
      if (tokens[index].quoted) fail('Quoted owner names are not supported.', 'unsupported-name', lineNumber);
      owner = absoluteName(tokens[index++].value, origin, { loose: true });
      previousOwner = owner;
    }
    let rrclass = 'IN';
    let seenClass = false;
    let seenTTL = false;
    while (index < tokens.length) {
      const token = tokens[index];
      const value = token.value.toUpperCase();
      if (token.quoted) break;
      if (['IN', 'CH', 'HS', 'NONE', 'ANY'].includes(value)) {
        if (seenClass) fail('Duplicate record class.', 'invalid-syntax', lineNumber);
        rrclass = value;
        seenClass = true;
        index += 1;
      } else if (/^\d/.test(value)) {
        if (seenTTL) fail('Duplicate record TTL.', 'invalid-syntax', lineNumber);
        parseTTL(value);
        seenTTL = true;
        index += 1;
      } else break;
    }
    const typeToken = tokens[index++];
    if (!typeToken || typeToken.quoted) fail('Missing or invalid record type.', 'invalid-syntax', lineNumber);
    const type = typeToken.value.toUpperCase();
    const data = tokens.slice(index);
    if (!data.length) fail(`Missing ${type} record data.`, 'invalid-syntax', lineNumber);
    recordCount += 1;
    if (rrclass !== 'IN') {
      addWarning(warnings, `Class ${rrclass} record ignored.`, 'unsupported-class', lineNumber);
      continue;
    }
    if (!ownerTypes.has(owner)) ownerTypes.set(owner, new Set());
    ownerTypes.get(owner).add(type);
    if (type !== 'A' && type !== 'CNAME') {
      if (!IGNORED_TYPES.has(type) && !/^TYPE\d+$/.test(type)) fail(`Unknown record type: ${type}`, 'invalid-type', lineNumber);
      if (/^TYPE\d+$/.test(type) && Number(type.slice(4)) > 65535) fail('Record type code exceeds 65535.', 'invalid-type', lineNumber);
      addWarning(warnings, `${type} record ignored: hosts output supports IPv4 A records and CNAME aliases.`, 'unsupported-type', lineNumber, 'info');
      continue;
    }
    if (owner.startsWith('*.')) {
      addWarning(warnings, 'Wildcard owner ignored: /etc/hosts cannot represent wildcards.', 'wildcard-owner', lineNumber);
      continue;
    }
    owner = absoluteName(owner);
    if (owner === '.') fail('The root owner is not a hosts-file hostname.', 'invalid-name', lineNumber);
    if (scope && !inZone(owner, scope)) {
      addWarning(warnings, `Out-of-zone ${type} owner '${owner}' ignored.`, 'out-of-zone-owner', lineNumber);
      continue;
    }
    if (data.length !== 1 || data[0].quoted) fail(`${type} requires one unquoted value.`, 'invalid-rdata', lineNumber);
    if (type === 'A') {
      const ip = normalizeIPv4(data[0].value);
      if (!ip) fail(`Invalid IPv4 address: ${data[0].value.slice(0, 100)}`, 'invalid-ip', lineNumber);
      if (data[0].value !== ip) addWarning(warnings, `IPv4 address normalised as decimal to ${ip}.`, 'normalised-ip', lineNumber, 'info');
      if (!addresses.has(owner)) addresses.set(owner, new Set());
      if (!addresses.get(owner).has(ip)) addressCount += 1;
      addresses.get(owner).add(ip);
    } else {
      const target = absoluteName(data[0].value, origin);
      if (aliases.has(owner) && aliases.get(owner) !== target) fail(`CNAME '${owner}' has conflicting targets.`, 'cname-conflict', lineNumber);
      aliases.set(owner, target);
    }
    if (addresses.size + aliases.size > LIMITS.records) fail('Too many DNS owners.', 'record-limit', lineNumber);
  }
  for (const name of aliases.keys()) {
    const types = ownerTypes.get(name);
    if (name === scope || [...types].some((type) => !['CNAME', 'RRSIG', 'NSEC'].includes(type))) fail(`Owner '${name}' has both CNAME and other zone data, or is the zone apex.`, 'cname-conflict');
  }
  return { addresses, aliases, warnings, origin: scope, recordCount, addressCount };
}
