import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SEMGREP = process.env.SEMGREP || 'semgrep';

function scan(target) {
  const result = spawnSync(SEMGREP, ['scan', '--config', path.join(ROOT, '.semgrep.yml'), '--error', '--metrics=off', '--disable-version-check', '--json', target], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw new Error('Semgrep could not execute; the security gate has not passed.');
  let report;
  try { report = JSON.parse(result.stdout); } catch { throw new Error(`Unreadable Semgrep report (exit ${result.status}); the security gate has not passed.`); }
  if (![0, 1].includes(result.status) || report.errors?.length) throw new Error(`Semgrep did not complete cleanly (exit ${result.status}, ${report.errors?.length ?? 0} errors).`);
  const scanned = report.paths?.scanned ?? [];
  if (!scanned.length) throw new Error('Semgrep scanned no files; the security gate has not passed.');
  if (target === '.') {
    for (const file of ['public/assets/js/core.js', 'public/assets/js/ui.js']) {
      if (!scanned.some((entry) => path.resolve(ROOT, entry) === path.join(ROOT, file))) throw new Error(`Critical source was not scanned: ${file}`);
    }
  }
  return { exit: result.status, findings: report.results ?? [] };
}

function main() {
  if (process.argv.includes('--self-test')) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bind9-security-gate-'));
    try {
      fs.writeFileSync(path.join(directory, 'unsafe.js'), 'eval(untrustedInput);\n');
      fs.writeFileSync(path.join(directory, 'credential.txt'), 'gh' + 'p_' + 'a'.repeat(36) + '\n');
      const result = scan(directory);
      const ids = result.findings.map((finding) => finding.check_id);
      if (result.exit !== 1 || !ids.some((id) => id.endsWith('no-eval')) || !ids.some((id) => id.endsWith('credential-token'))) throw new Error('Synthetic SAST/credential findings did not fail the scanner as required.');
      console.log('Security gate self-test passed: synthetic unsafe code and fake credential were rejected.');
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
    return;
  }
  const result = scan('.');
  for (const finding of result.findings) console.error(`${finding.check_id}: ${finding.path}:${finding.start.line}`);
  // Do not print matched source or raw scanner output: findings may contain secrets.
  console.log(`Targeted SAST/credential scan completed: ${result.findings.length} finding(s).`);
  process.exitCode = result.findings.length || result.exit ? 1 : 0;
}

main();
