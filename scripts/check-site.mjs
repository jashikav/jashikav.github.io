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
      assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `Expected one page heading in ${file}`);
      assert.ok(/<meta name="description" content="[^"]+"/.test(html), `Missing description in ${file}`);
      const localLinks = [...html.matchAll(/(?:href|src)="((?:\/|#)[^"]*)"/g)].map(match => match[1]);
      for (const [, srcset] of html.matchAll(/srcset="([^"]+)"/g)) {
        localLinks.push(...srcset.split(',').map(candidate => candidate.trim().split(/\s+/)[0]));
      }
      for (const url of localLinks) {
        if (url.startsWith('//')) continue;
        const parsed = new URL(url, `https://site.test/${path.relative(root, file)}`);
        let target = path.join(root, decodeURIComponent(parsed.pathname));
        assert.ok(existsSync(target), `Broken local URL ${url} in ${file}`);
        if (parsed.hash) {
          if (target.endsWith(path.sep)) target = path.join(target, 'index.html');
          const targetHtml = readFileSync(target, 'utf8');
          assert.ok(targetHtml.includes(`id="${decodeURIComponent(parsed.hash.slice(1))}"`), `Broken anchor ${url} in ${file}`);
        }
      }
    }
  }
}
check(root);
for (const excluded of ['node_modules', 'scripts', 'styles', 'package.json', 'Gemfile', 'README.md', 'assets/images/details.jpeg', 'assets/images/customer.jpeg', 'assets/images/cost.jpeg', 'assets/images/logo3.jpg']) {
  assert.ok(!existsSync(path.join(root, excluded)), `Build leaks ${excluded}`);
}
const css = readFileSync(`${root}/assets/css/main.css`, 'utf8');
assert.ok(css.includes('--color-brand-600'), 'Missing Tailwind theme');
console.log(`Site checks passed (${version}).`);
