// DNS conversion logic. No DOM, storage or network access.

export function generateSerial(now = new Date()) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}`;
}

export function isIPv4(value) {
  const match = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  return match.slice(1).every((octet) => Number(octet) >= 0 && Number(octet) <= 255);
}

export function isFQDNLike(hostname) {
  return hostname.includes(".");
}

export function stripTrailingDot(value) {
  return value.endsWith(".") ? value.slice(0, -1) : value;
}

export function ensureAbsoluteName(name, domain) {
  if (name.endsWith(".")) return name;
  if (isFQDNLike(name)) return `${name}.`;
  return `${name}.${domain}.`;
}

export function bindName(name) {
  return name;
}

export function cnameTarget(primary) {
  if (primary.endsWith(".")) return primary;
  return primary;
}

export function reverseZoneFromPrefix(prefix) {
  const clean = prefix.replace(/\.$/, "");
  const octets = clean.split(".");
  if (octets.length !== 3) return "INVALID-PREFIX.in-addr.arpa";
  return `${octets[2]}.${octets[1]}.${octets[0]}.in-addr.arpa`;
}

export function zoneHeader(domain, dnsHost, adminName, ttl, now = new Date()) {
  const serial = generateSerial(now);
  const ns = ensureAbsoluteName(dnsHost, domain);
  const admin = ensureAbsoluteName(adminName, domain);

  return `$TTL ${ttl}\n@   IN  SOA ${ns} ${admin} (\n        ${serial} ; serial\n        3600       ; refresh\n        900        ; retry\n        604800     ; expire\n        86400 )    ; minimum\n\n    IN  NS  ${ns}\n\n`;
}

export function parseHosts(input, prefix) {
  const records = [];
  const warnings = [];
  const lines = input.split("\n");

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    let line = rawLine.trim();

    if (!line || line.startsWith("#") || line.startsWith(";")) return;

    line = line.split("#", 1)[0].split(";", 1)[0].trim();
    if (!line) return;

    const parts = line.split(/\s+/);
    if (parts.length < 2) {
      warnings.push({ type: "warn", message: `Line ${lineNumber}: skipped because it has fewer than 2 fields.` });
      return;
    }

    const ip = parts[0];
    const hostnames = parts.slice(1).filter(Boolean);

    if (!isIPv4(ip)) {
      warnings.push({ type: "warn", message: `Line ${lineNumber}: skipped invalid IPv4 address: ${ip}` });
      return;
    }

    if (!ip.startsWith(prefix)) return;

    records.push({ ip, hostnames, lineNumber });
  });

  return { records, warnings };
}

export function analyseRecords(records, domain) {
  const warnings = [];
  const nameToIps = new Map();
  const ipToNames = new Map();

  records.forEach((record) => {
    if (!ipToNames.has(record.ip)) ipToNames.set(record.ip, []);
    ipToNames.get(record.ip).push(...record.hostnames);

    record.hostnames.forEach((name) => {
      const key = stripTrailingDot(name);
      if (!nameToIps.has(key)) nameToIps.set(key, new Set());
      nameToIps.get(key).add(record.ip);
    });
  });

  nameToIps.forEach((ips, name) => {
    if (ips.size > 1) {
      warnings.push({
        type: "warn",
        message: `Hostname '${name}' appears on multiple IPs: ${Array.from(ips).join(", ")}. This may be intended round-robin, but aliases should not be CNAMEs in that case.`
      });
    }
  });

  ipToNames.forEach((names, ip) => {
    const uniqueNames = Array.from(new Set(names));
    if (uniqueNames.length > 1) {
      warnings.push({
        type: "info",
        message: `IP ${ip} has multiple names: ${uniqueNames.join(", ")}. Reverse DNS will use the first primary hostname only.`
      });
    }
  });

  records.forEach((record) => {
    record.hostnames.forEach((name) => {
      if (isFQDNLike(name) && !name.endsWith(".")) {
        warnings.push({
          type: "info",
          message: `Name '${name}' contains a dot. In BIND this is relative unless you add a trailing dot. It will become '${name}.${domain}'.`
        });
      }
    });
  });

  return warnings;
}

export function generateForward(records, domain, dnsHost, adminName, ttl, outputMode, now = new Date()) {
  let output = "";

  if (outputMode === "zone") {
    output += zoneHeader(domain, dnsHost, adminName, ttl, now);
  }

  output += `; ================================\n; Generated BIND9 Records\n; Primary hostname = A record\n; Additional names = CNAME records\n; ================================\n\n`;

  const emittedA = new Set();
  const emittedCname = new Set();
  const namesWithA = new Set();

  records.forEach((record) => {
    const primary = bindName(record.hostnames[0]);
    const primaryKey = stripTrailingDot(primary);

    if (!emittedA.has(`${primaryKey}:${record.ip}`)) {
      output += `${primary.padEnd(32)} IN       A        ${record.ip}\n`;
      emittedA.add(`${primaryKey}:${record.ip}`);
      namesWithA.add(primaryKey);
    }

    record.hostnames.slice(1).forEach((alias) => {
      const aliasKey = stripTrailingDot(alias);
      const target = cnameTarget(primary);

      if (aliasKey === primaryKey) return;
      if (namesWithA.has(aliasKey)) return;
      if (emittedCname.has(aliasKey)) return;

      output += `${alias.padEnd(32)} IN       CNAME    ${target}\n`;
      emittedCname.add(aliasKey);
    });

    output += "\n";
  });

  return output.trimEnd() + "\n";
}

export function generateReverse(records, domain, dnsHost, adminName, ttl, prefix, now = new Date()) {
  const reverseZone = reverseZoneFromPrefix(prefix);
  let output = zoneHeader(reverseZone, dnsHost + "." + domain, adminName + "." + domain, ttl, now);

  output += `; ================================\n; Generated PTR Records\n; Reverse Zone: ${reverseZone}\n; ================================\n\n`;

  const emitted = new Set();

  records.forEach((record) => {
    if (emitted.has(record.ip)) return;
    emitted.add(record.ip);

    const lastOctet = record.ip.split(".").pop();
    const primary = ensureAbsoluteName(record.hostnames[0], domain);
    output += `${lastOctet.padEnd(8)} IN       PTR      ${primary}\n`;
  });

  return output.trimEnd() + "\n";
}
