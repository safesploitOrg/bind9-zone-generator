import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PUBLIC = path.join(ROOT, 'public');

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  });
}

function main() {
  const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /<style\b|\bon\w+\s*=/i, 'Keep CSS and event handlers external');
  assert.match(html, /connect-src 'none'/, 'Conversion must not require outbound connections');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 1);
  assert.match(scripts[0][1], /type="module"/);
  assert.match(scripts[0][1], /src="\.\/assets\/js\/app.js"/);
  assert.equal(scripts[0][2].trim(), '', 'No inline script body');
  for (const match of html.matchAll(/(?:href|src)="(\.\/[^"#]+)"/g)) {
    assert.ok(fs.existsSync(path.resolve(PUBLIC, match[1])), `Missing public asset: ${match[1]}`);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
  const sources = ['public/assets/js', 'scripts', 'tests/unit'].flatMap((directory) => files(path.join(ROOT, directory))).filter((file) => /\.(?:m?js)$/.test(file));
  for (const file of sources) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (match[1].startsWith('.')) assert.ok(fs.existsSync(path.resolve(path.dirname(file), match[1])), `Missing import in ${file}`);
    }
  }
  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/static.yml'), 'utf8');
  for (const match of workflow.matchAll(/uses:\s+([^\s]+)@([^\s]+)/g)) assert.match(match[2], /^[a-f0-9]{40}$/, `Unpinned action: ${match[1]}`);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json')));
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json')));
  assert.equal(manifest.version, lock.version);
  assert.equal(manifest.version, lock.packages[''].version);
  console.log(`Source checks passed: ${sources.length} JavaScript files, local assets, HTML structure, lockfile and action pins.`);
  console.log('These focused checks do not constitute a full HTML/CSS/JavaScript linter.');
}

main();
