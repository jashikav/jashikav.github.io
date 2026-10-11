import { execFileSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function nextVersion(tags) {
  const versions = tags.filter(tag => /^site-v1\.0\.\d+$/.test(tag));
  const patch = versions.length ? Math.max(...versions.map(tag => Number(tag.split('.').at(-1)))) + 1 : 0;
  return `v1.0.${patch}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  git('fetch', 'origin', '--tags');
  const version = nextVersion(git('tag', '--list', 'site-v*').split('\n'));
  // Reserve before building, so failed builds and reruns consume a version too.
  git('tag', `site-${version}`);
  git('push', 'origin', `refs/tags/site-${version}`);
  writeFileSync('_data/version.yml', `version: ${version}\n`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
  console.log(`Reserved ${version}`);
}
