import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = '_site';
const version = JSON.parse(readFileSync(`${root}/version.json`, 'utf8')).version;
assert.match(version, /^v\d+\.\d+\.\d+$/);
assert.equal(readFileSync(`${root}/CNAME`, 'utf8').trim(), 'www.vansbookkeeping.com');
for (const file of ['index.html', 'about/index.html', 'services/index.html', 'contact/index.html']) {
  assert.ok(existsSync(path.join(root, file)), `Missing ${file}`);
}
function check(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) check(file);
    else if (file.endsWith('.html')) {
      const html = readFileSync(file, 'utf8');
      assert.ok(!/bootstrap|data-bs-/i.test(html), `Bootstrap remains in ${file}`);
      assert.ok(html.includes(`Site ${version}`), `Missing version in ${file}`);
      for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"?#]*)(?:[?#][^"]*)?"/g)) {
        if (url.startsWith('//')) continue;
        const target = path.join(root, decodeURIComponent(url));
        assert.ok(existsSync(target), `Broken local URL ${url} in ${file}`);
      }
    }
  }
}
check(root);
for (const excluded of ['node_modules', 'scripts', 'styles', 'package.json', 'Gemfile', 'README.md']) {
  assert.ok(!existsSync(path.join(root, excluded)), `Build leaks ${excluded}`);
}
const css = readFileSync(`${root}/assets/css/main.css`, 'utf8');
assert.ok(css.includes('--color-brand-600'), 'Missing Tailwind theme');
console.log(`Site checks passed (${version}).`);
